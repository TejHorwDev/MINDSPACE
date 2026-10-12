import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  deductAiCredits,
  getUserCreditBalance,
  InsufficientCreditsError,
  reserveAiCredits,
  settleAiCreditReservation,
  refundAiCreditReservation,
  type CreditReservation,
} from "@/lib/credits";
import {
  callAiProvider,
  checkUserRateLimit,
  NoApiKeyConfiguredError,
} from "@/lib/gemini";
import {
  getDailyRequestLimit,
  getLowBalanceThresholdUSD,
  getRateLimitPerMinute,
} from "@/lib/settings";
import { getDecryptedByokKey } from "@/lib/user-settings";
import { getUserActiveMcpServers } from "@/lib/mcp";
import { getUserAccountPlan } from "@/lib/account-plans";

type RouteContext = { params: Promise<{ id: string }> };

function hasValidKey(provider: { provider: string; apiKey?: string | null }): boolean {
  if (provider.apiKey && provider.apiKey.trim() !== "") return true;
  const p = (provider.provider || "").toLowerCase();
  const envKey =
    p === "google"
      ? process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_AI_API_KEY?.trim()
      : p === "groq"
      ? process.env.GROQ_API_KEY?.trim()
      : p === "nvidia"
      ? process.env.NVIDIA_API_KEY?.trim() || process.env.NIM_API_KEY?.trim() || process.env.NVAPI_KEY?.trim()
      : process.env.OPENAI_API_KEY?.trim();
  return Boolean(envKey);
}

export async function GET(req: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await context.params;

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      ownerId: session.user.id,
    },
    select: { id: true, name: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const requestedSessionId = req.nextUrl.searchParams.get("sessionId");

  // Fetch or initialize chat sessions for this project
  let sessions = await db.chatSession.findMany({
    where: { projectId, userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { messages: true },
      },
    },
  });

  if (sessions.length === 0) {
    const defaultSession = await db.chatSession.create({
      data: {
        projectId,
        userId: session.user.id,
        title: "Initial Chat",
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
    });
    sessions = [defaultSession];
  }

  const activeSession =
    (requestedSessionId ? sessions.find((s) => s.id === requestedSessionId) : null) ||
    sessions[0];

  const messages = await db.aiChatMessage.findMany({
    where: {
      projectId,
      chatSessionId: activeSession.id,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      content: true,
      diffs: true,
      costUSD: true,
      providerId: true,
      providerName: true,
      createdAt: true,
    },
  });

  const [credits, accountPlan] = await Promise.all([
    getUserCreditBalance(session.user.id),
    getUserAccountPlan(session.user.id),
  ]);
  const channels = await db.contactChannel.findMany({
    where: { active: true },
    orderBy: { displayOrder: "asc" },
  });

  const activeProviders = await db.aiProvider.findMany({
    where: { active: true },
    orderBy: { priority: "asc" },
    select: { id: true, name: true },
  });

  const dailyLimit = await getDailyRequestLimit();
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const todayRequestCount = await db.aiChatMessage.count({
    where: {
      userId: session.user.id,
      role: "user",
      createdAt: { gte: startOfToday },
    },
  });

  const lowBalanceThreshold = await getLowBalanceThresholdUSD();
  const dailyCreditAllowance = accountPlan?.dailyFreeCreditUSD ?? 20.0;
  const isPaidUser = Boolean(
    credits.isPaidUser ||
    (accountPlan && (
      (accountPlan.dailyFreeCreditUSD ?? 0) > 20 ||
      accountPlan.name.toLowerCase().includes("pro")
    ))
  );

  return NextResponse.json({
    messages,
    sessions,
    activeSessionId: activeSession.id,
    credits,
    accountPlan: accountPlan
      ? {
          id: accountPlan.id,
          name: accountPlan.name,
          dailyFreeCreditUSD: accountPlan.dailyFreeCreditUSD,
          priceUSD: (accountPlan as any).priceUSD,
        }
      : null,
    dailyCreditAllowance,
    isPaidUser,
    lowBalanceThreshold,
    channels,
    providers: activeProviders,
    dailyLimit,
    todayRequestCount,
  });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { id: projectId } = await context.params;

  // 1. Dynamic Rate Limit check (configured by admin per minute)
  const rateLimitPerMinute = await getRateLimitPerMinute();
  if (!checkUserRateLimit(userId, rateLimitPerMinute)) {
    return NextResponse.json(
      {
        error: `Rate limit reached (max ${rateLimitPerMinute} requests per minute). Please wait a few seconds before asking again.`,
        code: "RATE_LIMITED",
      },
      { status: 429 }
    );
  }

  // 2. Fetch project and files
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      ownerId: userId,
    },
    include: {
      files: {
        select: { path: true, content: true },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let body: { prompt?: string; providerId?: string; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const userPrompt = body.prompt?.trim();
  if (!userPrompt) {
    return NextResponse.json({ error: "Please enter an instruction or question." }, { status: 400 });
  }

  // Resolve or initialize active chat session
  let activeSession: {
    id: string;
    projectId: string;
    userId: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
  } | null = null;

  if (body.sessionId) {
    activeSession = await db.chatSession.findFirst({
      where: { id: body.sessionId, projectId, userId },
    });
  }
  if (!activeSession) {
    activeSession = await db.chatSession.findFirst({
      where: { projectId, userId },
      orderBy: { updatedAt: "desc" },
    });
  }
  if (!activeSession) {
    activeSession = await db.chatSession.create({
      data: {
        projectId,
        userId,
        title: "Initial Chat",
      },
    });
  }
  const currentSession = activeSession!;

  const requestedProviderId = body.providerId?.trim();
  const isByok = Boolean(requestedProviderId && requestedProviderId.startsWith("byok-"));

  const currentBalance = await getUserCreditBalance(userId);
  const dailyLimit = await getDailyRequestLimit();

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const todayRequestCount = await db.aiChatMessage.count({
    where: {
      userId,
      role: "user",
      createdAt: { gte: startOfToday },
    },
  });

  let creditReservation: CreditReservation | null = null;

  // If NOT using BYOK, enforce credit balance & free-tier daily request cap
  if (!isByok) {
    if (currentBalance.totalCredits <= 0) {
      const channels = await db.contactChannel.findMany({
        where: { active: true },
        orderBy: { displayOrder: "asc" },
      });

      return NextResponse.json(
        {
          error: currentBalance.isPaidUser
            ? "Your paid AI credits have run out. Please top up your balance to continue."
            : "You're out of free credits for today — resets at midnight UTC. Want more now?",
          code: "OUT_OF_CREDITS",
          outOfCredits: true,
          credits: currentBalance,
          channels,
        },
        { status: 402 }
      );
    }

    if (!currentBalance.isPaidUser && todayRequestCount >= dailyLimit) {
      const channels = await db.contactChannel.findMany({
        where: { active: true },
        orderBy: { displayOrder: "asc" },
      });

      return NextResponse.json(
        {
          error: `You've reached your daily free limit of ${dailyLimit} AI requests for today. Resets at midnight UTC, or upgrade to a paid plan for unlimited prompts!`,
          code: "DAILY_REQUEST_LIMIT_REACHED",
          dailyLimitReached: true,
          dailyLimit,
          todayRequestCount,
          channels,
        },
        { status: 429 }
      );
    }

    // Atomic database-level lock/decrement: completely prevents simultaneous double-spending
    try {
      creditReservation = await reserveAiCredits(userId);
    } catch (err: any) {
      if (err instanceof InsufficientCreditsError) {
        // Record zero balance audit event once per day so conversion metrics track accurately
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const alreadyLoggedZero = await db.creditTransaction.findFirst({
          where: {
            userId,
            type: "zero_balance_reached",
            createdAt: { gte: todayStart },
          },
        });
        if (!alreadyLoggedZero) {
          await db.creditTransaction.create({
            data: {
              userId,
              amount: 0.0,
              type: "zero_balance_reached",
              reason: `User reached $0 credit limit for today (${currentBalance.isPaidUser ? "Paid Plan" : "Free Tier"})`,
              metadata: {
                hitZeroBalance: true,
                freeCredits: currentBalance.freeCredits,
                purchasedCredits: currentBalance.purchasedCredits,
              },
            },
          });
        }

        const channels = await db.contactChannel.findMany({
          where: { active: true },
          orderBy: { displayOrder: "asc" },
        });

        return NextResponse.json(
          {
            error: currentBalance.isPaidUser
              ? "Your paid AI credits have run out. Please top up your balance to continue."
              : "You're out of free credits for today — resets at midnight UTC. Want more now?",
            code: "OUT_OF_CREDITS",
            outOfCredits: true,
            credits: currentBalance,
            channels,
          },
          { status: 402 }
        );
      }
      throw err;
    }
  }

  // Fetch recent conversation history for multi-turn context (SCOPED TO ACTIVE CHAT SESSION)
  const recentHistory = await db.aiChatMessage.findMany({
    where: { projectId, chatSessionId: currentSession.id },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { role: true, content: true },
  });
  recentHistory.reverse();

  let aiResult: any = null;
  let servingProvider: { id: string; name: string } | null = null;
  let fallbackUsed = false;
  let backupModelName: string | null = null;
  let fallbackNotice: string | null = null;

  // Fetch student's personal active MCP servers (isolated per user)
  const userMcpServers = await getUserActiveMcpServers(userId);

  try {
    if (isByok) {
      // ----------------------------------------------------
      // BRING-YOUR-OWN-KEY (BYOK) EXECUTION PATH
      // ----------------------------------------------------
      const providerType = (
        requestedProviderId === "byok-google" ? "google" :
        requestedProviderId === "byok-groq" ? "groq" :
        requestedProviderId === "byok-nvidia" ? "nvidia" :
        "openai"
      ) as "google" | "groq" | "openai" | "nvidia";

      const personalKey = await getDecryptedByokKey(userId, providerType);
      if (!personalKey) {
        return NextResponse.json(
          {
            error: `No personal API key configured for ${providerType.toUpperCase()}. Please add your key in Settings.`,
            code: "NO_BYOK_KEY",
          },
          { status: 400 }
        );
      }

      const byokModelKey =
        providerType === "google" ? "gemini-2.0-flash" :
        providerType === "groq" ? "qwen/qwen3.8-27b" :
        providerType === "nvidia" ? "meta/llama-3.2-90b-vision-instruct" :
        "gpt-4o-mini";

      const byokBaseUrl =
        providerType === "nvidia" ? "https://integrate.api.nvidia.com/v1" : undefined;

      const byokProviderName = `My ${
        providerType === "google" ? "Gemini" :
        providerType === "groq" ? "Groq" :
        providerType === "nvidia" ? "NVIDIA NIM" : "OpenAI"
      } Key (BYOK)`;

      aiResult = await callAiProvider({
        provider: {
          id: requestedProviderId!,
          name: byokProviderName,
          modelKey: byokModelKey,
          provider: providerType,
          baseUrl: byokBaseUrl,
          apiKey: personalKey,
          active: true,
        },
        userPrompt,
        files: project.files,
        conversationHistory: recentHistory as { role: "user" | "assistant"; content: string }[],
        mcpServers: userMcpServers,
      });

      servingProvider = { id: requestedProviderId!, name: byokProviderName };

      // Save user message to DB
      await db.aiChatMessage.create({
        data: {
          projectId,
          userId,
          role: "user",
          content: userPrompt,
        },
      });

      // Log $0 BYOK transaction audit trail
      await db.creditTransaction.create({
        data: {
          userId,
          amount: 0.0,
          type: "byok_usage",
          reason: `AI Help via Personal Key (${aiResult.inputTokens} in, ${aiResult.outputTokens} out) [BYOK]`,
          metadata: {
            byok: true,
            provider: providerType,
            inputTokens: aiResult.inputTokens,
            outputTokens: aiResult.outputTokens,
          },
        },
      });

      // Save Assistant message with proposed diffs
      const assistantMsg = await db.aiChatMessage.create({
        data: {
          projectId,
          userId,
          role: "assistant",
          content: aiResult.reply,
          diffs: aiResult.proposedChanges.length > 0 ? (aiResult.proposedChanges as any) : null,
          inputTokens: aiResult.inputTokens,
          outputTokens: aiResult.outputTokens,
          costUSD: 0.0,
          providerId: servingProvider.id,
          providerName: servingProvider.name,
        },
      });

      return NextResponse.json({
        success: true,
        messageId: assistantMsg.id,
        reply: aiResult.reply,
        proposedChanges: aiResult.proposedChanges,
        costUSD: 0.0,
        isByok: true,
        remainingBalance: currentBalance.totalCredits,
        isPaidUser: currentBalance.isPaidUser,
        dailyLimit,
        todayRequestCount,
        lowBalanceThreshold: await getLowBalanceThresholdUSD(),
        inputTokens: aiResult.inputTokens,
        outputTokens: aiResult.outputTokens,
        providerId: servingProvider.id,
        providerName: servingProvider.name,
        usedMcpServers: aiResult.usedMcpServers || [],
      });
    }

    // ----------------------------------------------------
    // SHARED ADMIN POOL EXECUTION PATH
    // ----------------------------------------------------
    if (requestedProviderId && requestedProviderId !== "auto") {
      const selectedProvider = await db.aiProvider.findUnique({
        where: { id: requestedProviderId },
      });

      if (!selectedProvider || !selectedProvider.active) {
        return NextResponse.json(
          {
            error: `${selectedProvider?.name || "Selected model"} is currently unavailable or disabled. Please switch models above.`,
            code: "PROVIDER_DISABLED",
            modelName: selectedProvider?.name || "Selected model",
          },
          { status: 503 }
        );
      }

      if (!hasValidKey(selectedProvider)) {
        return NextResponse.json(
          {
            error: `No API key configured for ${selectedProvider.name} — ask the admin to add an API key in /admin → AI Providers`,
            code: "NO_API_KEY_CONFIGURED",
            modelName: selectedProvider.name,
          },
          { status: 503 }
        );
      }

      try {
        aiResult = await callAiProvider({
          provider: selectedProvider,
          userPrompt,
          files: project.files,
          conversationHistory: recentHistory as { role: "user" | "assistant"; content: string }[],
          mcpServers: userMcpServers,
        });
        servingProvider = { id: selectedProvider.id, name: selectedProvider.name };
      } catch (err: any) {
        if (err instanceof NoApiKeyConfiguredError) {
          return NextResponse.json(
            {
              error: `No API key configured for ${selectedProvider.name} — ask the admin to add an API key in /admin → AI Providers`,
              code: "NO_API_KEY_CONFIGURED",
              modelName: selectedProvider.name,
            },
            { status: 503 }
          );
        }

        console.error(`Specific model ${selectedProvider.name} call failed:`, err);
        return NextResponse.json(
          {
            error: `${selectedProvider.name} is experiencing high demand right now. Try again in a moment, or switch models above.`,
            code: "PROVIDER_RATE_LIMITED",
            modelName: selectedProvider.name,
          },
          { status: 429 }
        );
      }
    } else {
      // AUTO MODE (Recommended): Priority order among providers with valid configured keys
      const activeProviders = await db.aiProvider.findMany({
        where: { active: true },
        orderBy: { priority: "asc" },
      });

      const providersWithKeys = activeProviders.filter(hasValidKey);

      if (providersWithKeys.length === 0) {
        return NextResponse.json(
          {
            error: "No AI provider is configured yet — ask the admin to add an API key in /admin → AI Providers",
            code: "NO_API_KEY_CONFIGURED",
          },
          { status: 503 }
        );
      }

      let lastProviderErrorMsg = "";
      for (let i = 0; i < providersWithKeys.length; i++) {
        const candidate = providersWithKeys[i];
        try {
          aiResult = await callAiProvider({
            provider: candidate,
            userPrompt,
            files: project.files,
            conversationHistory: recentHistory as { role: "user" | "assistant"; content: string }[],
            mcpServers: userMcpServers,
          });
          servingProvider = { id: candidate.id, name: candidate.name };
          if (i > 0) {
            fallbackUsed = true;
            backupModelName = candidate.name;
            fallbackNotice = `Primary model was busy. Switched seamlessly to ${candidate.name}.`;
          }
          break;
        } catch (providerError: any) {
          lastProviderErrorMsg = providerError.message;
          console.warn(`Provider ${candidate.name} failed in auto chain:`, providerError.message);
        }
      }

      if (!aiResult || !servingProvider) {
        return NextResponse.json(
          {
            error:
              lastProviderErrorMsg ||
              "AI help is temporarily unavailable — all configured providers are experiencing high demand. Please try again shortly.",
            code: "ALL_PROVIDERS_DOWN",
          },
          { status: 503 }
        );
      }
    }

    // Save user message to DB linked to active chat session
    await db.aiChatMessage.create({
      data: {
        projectId,
        userId,
        chatSessionId: currentSession.id,
        role: "user",
        content: userPrompt,
      },
    });

    // Auto-generate title if default placeholder ("New Chat" or "Initial Chat")
    const isDefaultTitle = currentSession.title === "New Chat" || currentSession.title === "Initial Chat";
    const sessionMsgCount = await db.aiChatMessage.count({
      where: { chatSessionId: currentSession.id },
    });
    const updatedTitle =
      isDefaultTitle && sessionMsgCount <= 2
        ? userPrompt.length > 32
          ? userPrompt.slice(0, 32) + "..."
          : userPrompt
        : currentSession.title;

    await db.chatSession.update({
      where: { id: currentSession.id },
      data: {
        title: updatedTitle,
        updatedAt: new Date(),
      },
    });

    // Settle credit reservation atomically
    let deduction: any = {
      costUSD: 0,
      remainingBalance: currentBalance.totalCredits,
      isPaidUser: currentBalance.isPaidUser,
    };

    if (creditReservation) {
      deduction = await settleAiCreditReservation(
        creditReservation,
        aiResult.inputTokens,
        aiResult.outputTokens,
        `AI Help: "${userPrompt.slice(0, 30)}..."`,
        {
          providerId: servingProvider.id,
          providerName: servingProvider.name,
        }
      );
      creditReservation = null; // Cleared so catch won't refund
    }

    // Save Assistant message with proposed diffs & provider metadata linked to session
    const assistantMsg = await db.aiChatMessage.create({
      data: {
        projectId,
        userId,
        chatSessionId: currentSession.id,
        role: "assistant",
        content: aiResult.reply,
        diffs: aiResult.proposedChanges.length > 0 ? (aiResult.proposedChanges as any) : null,
        inputTokens: aiResult.inputTokens,
        outputTokens: aiResult.outputTokens,
        costUSD: deduction.costUSD,
        providerId: servingProvider.id,
        providerName: servingProvider.name,
      },
    });

    return NextResponse.json({
      success: true,
      messageId: assistantMsg.id,
      sessionId: currentSession.id,
      sessionTitle: updatedTitle,
      reply: aiResult.reply,
      proposedChanges: aiResult.proposedChanges,
      costUSD: deduction.costUSD,
      remainingBalance: deduction.remainingBalance,
      isPaidUser: deduction.isPaidUser,
      dailyLimit,
      todayRequestCount: todayRequestCount + 1,
      lowBalanceThreshold: await getLowBalanceThresholdUSD(),
      inputTokens: aiResult.inputTokens,
      outputTokens: aiResult.outputTokens,
      providerId: servingProvider.id,
      providerName: servingProvider.name,
      fallbackUsed,
      backupModelName,
      fallbackNotice,
      usedMcpServers: aiResult.usedMcpServers || [],
    });
  } catch (err: any) {
    // If an atomic reservation was made but the LLM call or processing failed, refund the reservation immediately
    if (creditReservation) {
      try {
        await refundAiCreditReservation(creditReservation);
      } catch (refundErr) {
        console.error("Failed to refund credit reservation:", refundErr);
      }
    }

    if (err instanceof InsufficientCreditsError) {
      const channels = await db.contactChannel.findMany({
        where: { active: true },
        orderBy: { displayOrder: "asc" },
      });

      return NextResponse.json(
        {
          error: "You're out of free credits for today — resets at midnight UTC. Want more now?",
          code: "OUT_OF_CREDITS",
          outOfCredits: true,
          channels,
        },
        { status: 402 }
      );
    }

    if (err instanceof NoApiKeyConfiguredError) {
      return NextResponse.json(
        {
          error: "No AI provider is configured yet — ask the admin to add an API key in /admin → AI Providers",
          code: "NO_API_KEY_CONFIGURED",
        },
        { status: 503 }
      );
    }

    console.error("AI Help Error:", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "AI help is temporarily unavailable — please try again shortly.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
