/**
 * Gemini AI & Multi-Provider LLM Integration for MINDSPACE Editor.
 * Real API calls ONLY: Gemini, Groq, OpenAI.
 * ZERO local simulation, ZERO fake diffs, ZERO hardcoded pattern matching.
 */

export type ProjectFileContext = {
  path: string;
  content: string;
};

export type ProposedFileChange = {
  path: string;
  originalContent: string;
  proposedContent: string;
  status: "pending" | "applied" | "rejected";
  isNewFile?: boolean;
};

export type GeminiAiResponse = {
  reply: string;
  proposedChanges: ProposedFileChange[];
  inputTokens: number;
  outputTokens: number;
  model: string;
};

export class NoApiKeyConfiguredError extends Error {
  constructor(
    message = "No AI provider is configured yet — ask the admin to add an API key in /admin → AI Providers"
  ) {
    super(message);
    this.name = "NoApiKeyConfiguredError";
  }
}

// Rate limiter: max 2 requests per minute per user
const rateLimitMap = new Map<string, number[]>();

export function checkUserRateLimit(userId: string, limit = 2, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= limit) {
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(userId, validTimestamps);
  return true;
}

/**
 * Rough token estimator: ~4 characters per token
 */
export function estimateTokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

import {
  type DecryptedMcpServer,
  fetchMcpServerTools,
  executeMcpToolCall,
} from "@/lib/mcp";

export type AiProviderConfig = {
  id: string;
  name: string;
  modelKey: string;
  provider: string; // "google" | "groq" | "openai" | "nvidia" | "custom"
  baseUrl?: string | null;
  apiKey?: string | null;
  notes?: string | null;
  active?: boolean;
};

export type AiProviderResult = GeminiAiResponse & {
  providerId?: string;
  providerName?: string;
  usedMcpServers?: string[];
};

export type ProviderTestResult = {
  success: boolean;
  latencyMs?: number;
  message: string;
  error?: string;
  model?: string;
  rawResponse?: string;
};

/**
 * Resolves the standardized base URL for any AI provider.
 * If a custom baseUrl is configured in the database, it takes precedence.
 * Otherwise, falls back to the well-known endpoint for built-in engines.
 */
export function resolveProviderBaseUrl(provider: { provider: string; baseUrl?: string | null }): string {
  if (provider.baseUrl && provider.baseUrl.trim() !== "") {
    return provider.baseUrl.trim().replace(/\/+$/, "");
  }
  const type = (provider.provider || "").toLowerCase().trim();
  if (type === "nvidia") {
    return "https://integrate.api.nvidia.com/v1";
  }
  if (type === "groq") {
    return "https://api.groq.com/openai/v1";
  }
  if (type === "openai") {
    return "https://api.openai.com/v1";
  }
  return "https://api.openai.com/v1";
}

/**
 * Fires a real, tiny network request to test connectivity and key validity.
 * Zero fake checks — reports genuine latency or genuine provider error.
 * Uses Google REST for "google" and standard OpenAI-compatible test for all other providers (NVIDIA NIM, Groq, OpenAI, custom).
 */
export async function testProviderConnection({
  provider,
  modelKey,
  apiKey,
  baseUrl,
}: {
  provider: string;
  modelKey: string;
  apiKey: string;
  baseUrl?: string | null;
}): Promise<ProviderTestResult> {
  const trimmedKey = apiKey?.trim();
  if (!trimmedKey) {
    return {
      success: false,
      message: "API key is missing",
      error: "Please enter a valid API key to test.",
    };
  }

  const start = performance.now();

  try {
    if (provider === "google") {
      const cleanModel = (modelKey || "gemini-3.8-flash").trim().replace(/^models\//, "");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${trimmedKey}`;
      let res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      });

      if (!res.ok && (res.status === 503 || res.status === 429)) {
        await new Promise((r) => setTimeout(r, 800));
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "ping" }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
        });
      }

      const latencyMs = Math.round(performance.now() - start);

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        const errDetail =
          errorJson.error?.message || `Google API returned HTTP ${res.status}: ${res.statusText}`;
        return {
          success: false,
          latencyMs,
          message: `Connection failed (${res.status})`,
          error: errDetail,
          model: modelKey,
        };
      }

      const data = await res.json().catch(() => ({}));
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "OK";

      return {
        success: true,
        latencyMs,
        message: `Connected successfully to Google Gemini (${latencyMs}ms)`,
        rawResponse: reply,
        model: modelKey,
      };
    } else {
      // ----------------------------------------------------
      // UNIVERSAL OPENAI-COMPATIBLE TESTER
      // (NVIDIA NIM, Groq, OpenAI, DeepSeek, Together, Ollama, etc.)
      // ----------------------------------------------------
      const resolvedBaseUrl = resolveProviderBaseUrl({ provider, baseUrl });
      const testEndpoint = `${resolvedBaseUrl}/chat/completions`;
      const targetModel = modelKey.trim();

      const res = await fetch(testEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${trimmedKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      });

      const latencyMs = Math.round(performance.now() - start);

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        let errDetail =
          errorJson.error?.message ||
          errorJson.message ||
          errorJson.detail ||
          errorJson.title ||
          `Provider returned HTTP ${res.status}: ${res.statusText}`;

        // Helpful context for Groq / NIM catalog model errors
        if (res.status === 410) {
          errDetail = `Model \`${targetModel}\` has reached end-of-life on NVIDIA NIM (${errDetail}). Switch to an active model such as mistralai/mistral-large-2-instruct or deepseek-ai/deepseek-v4.1-flash.`;
        } else if (errDetail.includes("Not found for account")) {
          const accountMatch = errDetail.match(/account '([^']+)'/);
          const accountId = accountMatch ? accountMatch[1] : "your account";
          errDetail = `NVIDIA Account Entitlement: Model \`${targetModel}\` is not enabled for your NVIDIA account (${accountId}). To use this model: 1) Go to build.nvidia.com, search for this model, and accept its terms or click "Get API Key". Alternatively, 2) switch to an open catalog model like \`mistralai/mistral-large-2-instruct\` or \`deepseek-ai/deepseek-v4.1-flash\`. Original error: ${errDetail}`;
        } else if (
          res.status === 404 ||
          errDetail.includes("does not exist") ||
          errDetail.includes("do not have access")
        ) {
          if (resolvedBaseUrl.includes("nvidia.com")) {
            errDetail = `Model \`${targetModel}\` was not recognized by NVIDIA NIM. Verify the exact identifier from build.nvidia.com catalog (e.g. mistralai/mistral-large-2-instruct or deepseek-ai/deepseek-v4.1-flash). Error: ${errDetail}`;
          } else if (resolvedBaseUrl.includes("groq.com")) {
            let availableModelsText = "";
            try {
              const listRes = await fetch("https://api.groq.com/openai/v1/models", {
                headers: { Authorization: `Bearer ${trimmedKey}` },
              });
              if (listRes.ok) {
                const listData = await listRes.json();
                const available = (listData.data || [])
                  .map((m: any) => m.id)
                  .filter((id: string) => !id.includes("whisper") && !id.includes("embed"));
                if (available.length > 0) {
                  availableModelsText = ` Available models on your Groq key: ${available.slice(0, 6).join(", ")}.`;
                }
              }
            } catch {
              // fallback
            }
            errDetail = `Model \`${targetModel}\` was not recognized or is not accessible on Groq.${availableModelsText || " Try llama-3.3-70b-versatile or check console.groq.com/docs/models."} Error: ${errDetail}`;
          }
        }

        const providerLabel =
          provider === "nvidia" ? "NVIDIA NIM" :
          provider === "groq" ? "Groq" :
          provider === "openai" ? "OpenAI" : "OpenAI-Compatible Provider";

        return {
          success: false,
          latencyMs,
          message: `Connection failed (${res.status})`,
          error: errDetail,
          model: targetModel,
        };
      }

      const data = await res.json().catch(() => ({}));
      const reply = data.choices?.[0]?.message?.content?.trim() || "OK";
      const providerLabel =
        provider === "nvidia" ? "NVIDIA NIM" :
        provider === "groq" ? "Groq" :
        provider === "openai" ? "OpenAI" : "OpenAI-Compatible Provider";

      return {
        success: true,
        latencyMs,
        message: `Connected successfully to ${providerLabel} (${latencyMs}ms)`,
        rawResponse: reply,
        model: targetModel,
      };
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      success: false,
      latencyMs,
      message: "Network or connection error",
      error: err.message || "Failed to reach the provider endpoint.",
    };
  }
}

/**
 * Executes a REAL AI model call.
 * NEVER falls back to local simulation.
 * If no key is set or the API fails, throws an error so the caller handles it honestly.
 */
export async function callAiProvider({
  provider,
  userPrompt,
  files,
  conversationHistory = [],
  mcpServers = [],
}: {
  provider: AiProviderConfig;
  userPrompt: string;
  files: ProjectFileContext[];
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
  mcpServers?: DecryptedMcpServer[];
}): Promise<AiProviderResult> {
  const apiKey =
    (provider.apiKey && provider.apiKey.trim()) ||
    (provider.provider === "google"
      ? process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_AI_API_KEY?.trim()
      : provider.provider === "groq"
      ? process.env.GROQ_API_KEY?.trim()
      : provider.provider === "nvidia"
      ? process.env.NVIDIA_API_KEY?.trim() || process.env.NIM_API_KEY?.trim() || process.env.NVAPI_KEY?.trim()
      : process.env.OPENAI_API_KEY?.trim());

  if (!apiKey) {
    throw new NoApiKeyConfiguredError(
      `No API key configured for ${provider.name} — ask the admin to add an API key in /admin → AI Providers`
    );
  }

  const model = provider.modelKey || "gemini-3.8-flash";
  const cleanModel = model.trim().replace(/^models\//, "");

  // Model Context Protocol (MCP): discover tools and execute if needed
  const usedMcpServers: string[] = [];
  let mcpToolsContext = "";

  if (mcpServers.length > 0) {
    try {
      const toolsLists = await Promise.all(
        mcpServers.map(async (server) => {
          const tools = await fetchMcpServerTools(server);
          return { server, tools };
        })
      );

      const activeToolsWithServers: { server: DecryptedMcpServer; tool: any }[] = [];
      for (const { server, tools } of toolsLists) {
        for (const tool of tools) {
          activeToolsWithServers.push({ server, tool });
        }
      }

      if (activeToolsWithServers.length > 0) {
        mcpToolsContext = `\n\n=== CONNECTED MODEL CONTEXT PROTOCOL (MCP) TOOLS ===\n` +
          activeToolsWithServers
            .map(
              ({ server, tool }) =>
                `- [Tool: ${tool.name}] (Server: ${server.name})\n  Description: ${tool.description}`
            )
            .join("\n") +
          `\n=== END MCP TOOLS ===\n`;

        // If user prompt mentions an active tool or server, invoke server-side with strict timeout
        for (const { server, tool } of activeToolsWithServers) {
          const toolLower = tool.name.toLowerCase();
          const serverLower = server.name.toLowerCase();
          const promptLower = userPrompt.toLowerCase();

          if (promptLower.includes(toolLower) || promptLower.includes(serverLower)) {
            const execRes = await executeMcpToolCall(server, tool.name, { prompt: userPrompt });
            if (!usedMcpServers.includes(server.name)) {
              usedMcpServers.push(server.name);
            }
            if (execRes.result) {
              mcpToolsContext += `\n[MCP Live Result from ${server.name}]:\n${JSON.stringify(execRes.result, null, 2)}\n`;
            }
          }
        }
      }
    } catch (mcpErr) {
      console.warn("MCP tools inspection failed:", mcpErr);
    }
  }

  const systemInstructions = `You are MINDSPACE AI, an expert pair-programming assistant embedded in a multi-language IDE and code workspace.
You assist developers with any programming language: Python, C++, C#, Java, JavaScript/Node, TypeScript, Go, Rust, HTML, CSS, Bash, etc.

The user can ask to modify existing files, add features, fix bugs, or CREATE NEW FILES (e.g. "add a utils.py file with a helper function", "create styles.css", "add math_solver.cpp").

YOUR INSTRUCTIONS:
1. Carefully review the provided project files.
2. Determine which existing file(s) need changes, OR what NEW file(s) should be created to fulfill the user's request.
3. You have full capability to CREATE NEW files or EDIT existing files. Specify any valid relative path (e.g. "utils.py", "src/helpers.js", "styles.css").
4. Propose complete, working code for any files that need modification or creation.
5. Output your response STRICTLY as a valid JSON object matching this schema:
{
  "reply": "Clear, friendly explanation in Markdown explaining what you changed or created and why.",
  "proposedFiles": [
    {
      "path": "filename.ext",
      "proposedContent": "Complete updated or newly created file content..."
    }
  ]
}
6. Do NOT omit parts of the file using comments like "...rest of code unchanged...". Always return the FULL valid file content.
7. Return only the JSON object, wrapped in a single \`\`\`json ... \`\`\` markdown code block.`;

  // Build files context text
  const filesContext = files
    .map((f) => `=== FILE: ${f.path} ===\n${f.content}\n=== END FILE ===`)
    .join("\n\n");

  const fullPrompt = `Here are the current project files:\n\n${filesContext}${mcpToolsContext}\n\nStudent Request:\n${userPrompt}`;

  try {
    if (provider.provider === "google") {
      const contents: { role: string; parts: { text: string }[] }[] = [];

      // Add prior conversation messages (ensuring alternating user / model order)
      let expectedRole = "user";
      for (const msg of conversationHistory.slice(-4)) {
        const role = msg.role === "assistant" ? "model" : "user";
        if (role === expectedRole) {
          contents.push({
            role,
            parts: [{ text: msg.content }],
          });
          expectedRole = expectedRole === "user" ? "model" : "user";
        }
      }

      // If the last history turn was a user turn, pop it to avoid duplicate user turns
      if (contents.length > 0 && contents[contents.length - 1].role === "user") {
        contents.pop();
      }

      // Final turn MUST be the current user turn!
      contents.push({
        role: "user",
        parts: [{ text: fullPrompt }],
      });

      // Build list of Google models to try in case of 503 high demand or 429 rate limit
      const googleCandidates = [
        cleanModel,
        cleanModel === "gemini-3.8-flash" ? "gemini-2.5-flash" : "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-flash-latest",
      ].filter((m, idx, arr) => arr.indexOf(m) === idx);

      let lastError: Error | null = null;
      let data: any = null;
      let modelUsed = cleanModel;

      for (let mIdx = 0; mIdx < googleCandidates.length; mIdx++) {
        const candidateModel = googleCandidates[mIdx];
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${apiKey}`;

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            if (attempt > 0) {
              await new Promise((resolve) => setTimeout(resolve, 800));
            }

            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [{ text: systemInstructions }],
                },
                contents,
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 8192,
                },
              }),
            });

            if (res.ok) {
              data = await res.json();
              modelUsed = candidateModel;
              break;
            }

            const errorJson = await res.json().catch(() => ({}));
            const errMessage =
              errorJson.error?.message || `${provider.name} API error: ${res.status} ${res.statusText}`;

            console.warn(
              `Gemini API (${candidateModel}, attempt ${attempt + 1}) returned ${res.status}:`,
              errMessage
            );

            lastError = new Error(`${provider.name} error: ${errMessage}`);

            // If 503 (high demand) or 429 (rate limit), retry or switch model
            if (res.status === 503 || res.status === 429) {
              continue;
            } else {
              // Non-transient error (e.g. 404 or bad parameter), don't retry same model
              break;
            }
          } catch (netErr: any) {
            console.warn(`Gemini network error (${candidateModel}):`, netErr.message);
            lastError = netErr;
          }
        }

        if (data) {
          if (modelUsed !== cleanModel) {
            console.log(
              `[Gemini Auto-Recovery] Successfully recovered using backup model ${modelUsed} instead of ${cleanModel}.`
            );
          }
          break;
        }
      }

      if (!data) {
        throw (
          lastError ||
          new Error(`${provider.name} error: This model is currently experiencing high demand. Please try again shortly.`)
        );
      }

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const usage = data.usageMetadata || {};

      const inputTokens = usage.promptTokenCount || estimateTokenCount(systemInstructions + fullPrompt);
      const outputTokens = usage.candidatesTokenCount || estimateTokenCount(rawText);

      const parsed = parseGeminiJsonResponse(rawText, files, inputTokens, outputTokens, modelUsed);
      if (usedMcpServers.length > 0) {
        parsed.reply += `\n\n> 🛠️ **Used: ${usedMcpServers.join(", ")}**`;
      }
      return {
        ...parsed,
        providerId: provider.id,
        providerName:
          modelUsed !== cleanModel
            ? `${provider.name} (${modelUsed})`
            : provider.name,
        usedMcpServers,
      };
    } else {
      const endpoint = `${resolveProviderBaseUrl(provider)}/chat/completions`;

      const messages = [
        { role: "system", content: systemInstructions },
        ...conversationHistory.slice(-4).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: fullPrompt },
      ];

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        let errMessage =
          errorJson.error?.message ||
          errorJson.message ||
          errorJson.detail ||
          errorJson.title ||
          `${provider.name} API error: ${res.status} ${res.statusText}`;

        if (
          provider.provider === "nvidia" &&
          (res.status === 404 || errMessage.includes("Not found for account"))
        ) {
          if (errMessage.includes("Not found for account")) {
            const accountMatch = errMessage.match(/account '([^']+)'/);
            const accountId = accountMatch ? accountMatch[1] : "your account";
            errMessage = `NVIDIA Account Entitlement: Model "${model}" is not enabled for account ${accountId}. On build.nvidia.com, open the model page and click "Get API Key" or accept terms, or switch to an open model like mistralai/mistral-large-2-instruct.`;
          }
        }

        if (
          provider.provider === "groq" &&
          (res.status === 404 ||
            errMessage.includes("does not exist") ||
            errMessage.includes("do not have access"))
        ) {
          const fallbackCandidates = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"].filter(
            (m) => m !== model
          );

          for (const fallbackModel of fallbackCandidates) {
            console.warn(`[Groq Auto-Recovery] Model "${model}" failed. Retrying with active model ${fallbackModel}...`);
            const retryRes = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: fallbackModel,
                messages,
                temperature: 0.2,
              }),
            });

            if (retryRes.ok) {
              const retryData = await retryRes.json();
              const retryRawText = retryData.choices?.[0]?.message?.content || "";
              const retryUsage = retryData.usage || {};
              const inputTokens = retryUsage.prompt_tokens || estimateTokenCount(systemInstructions + fullPrompt);
              const outputTokens = retryUsage.completion_tokens || estimateTokenCount(retryRawText);
              const parsed = parseGeminiJsonResponse(retryRawText, files, inputTokens, outputTokens, fallbackModel);
              return {
                ...parsed,
                providerId: provider.id,
                providerName: `${provider.name} (recovered via ${fallbackModel})`,
              };
            }
          }

          try {
            const listRes = await fetch("https://api.groq.com/openai/v1/models", {
              headers: { Authorization: `Bearer ${apiKey}` },
            });
            if (listRes.ok) {
              const listData = await listRes.json();
              const available = (listData.data || [])
                .map((m: any) => m.id)
                .filter((id: string) => !id.includes("whisper") && !id.includes("embed"));
              if (available.length > 0) {
                errMessage = `Model "${model}" not available on Groq. Supported models: ${available.slice(0, 5).join(", ")}. Please switch to llama-3.1-8b-instant in /admin.`;
              }
            }
          } catch {
            // Ignore
          }
        }

        console.warn(`${provider.name} error:`, res.status, errMessage);
        throw new Error(`${provider.name} error: ${errMessage}`);
      }

      const data = await res.json();
      const rawText = data.choices?.[0]?.message?.content || "";
      const usage = data.usage || {};

      const inputTokens = usage.prompt_tokens || estimateTokenCount(systemInstructions + fullPrompt);
      const outputTokens = usage.completion_tokens || estimateTokenCount(rawText);

      const parsed = parseGeminiJsonResponse(rawText, files, inputTokens, outputTokens, model);
      if (usedMcpServers.length > 0) {
        parsed.reply += `\n\n> 🛠️ **Used: ${usedMcpServers.join(", ")}**`;
      }
      return {
        ...parsed,
        providerId: provider.id,
        providerName: provider.name,
        usedMcpServers,
      };
    }
  } catch (err: any) {
    console.error(`AI call to ${provider.name} failed:`, err.message);
    throw err;
  }
}

export async function askGeminiCodeAssistant({
  userPrompt,
  files,
  conversationHistory = [],
}: {
  userPrompt: string;
  files: ProjectFileContext[];
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
}): Promise<GeminiAiResponse> {
  const defaultProvider: AiProviderConfig = {
    id: "default-gemini",
    name: "Gemini Flash",
    modelKey: "gemini-3.8-flash",
    provider: "google",
    active: true,
  };

  return await callAiProvider({
    provider: defaultProvider,
    userPrompt,
    files,
    conversationHistory,
  });
}

function parseGeminiJsonResponse(
  rawText: string,
  files: ProjectFileContext[],
  inputTokens: number,
  outputTokens: number,
  model: string
): GeminiAiResponse {
  let jsonString = rawText;
  const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1];
  } else {
    const firstBrace = rawText.indexOf("{");
    const lastBrace = rawText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonString = rawText.slice(firstBrace, lastBrace + 1);
    }
  }

  try {
    const parsed = JSON.parse(jsonString);
    const reply = parsed.reply || "Here are the suggested changes based on your request.";
    const proposedFilesList: { path: string; proposedContent: string }[] = parsed.proposedFiles || [];

    const proposedChanges: ProposedFileChange[] = [];

    for (const item of proposedFilesList) {
      if (!item.path || typeof item.proposedContent !== "string") continue;
      const cleanPath = item.path.trim().replace(/^\/+/, "");
      const originalFile = files.find((f) => f.path === cleanPath || f.path === item.path);
      const originalContent = originalFile ? originalFile.content : "";

      // Allow creating a new file, or updating an existing file with changed content
      if (!originalFile || item.proposedContent !== originalContent) {
        proposedChanges.push({
          path: cleanPath,
          originalContent,
          proposedContent: item.proposedContent,
          status: "pending",
          isNewFile: !originalFile,
        });
      }
    }

    return {
      reply,
      proposedChanges,
      inputTokens,
      outputTokens,
      model,
    };
  } catch (parseError) {
    console.error("Failed to parse AI JSON response:", parseError);
    return {
      reply: rawText,
      proposedChanges: [],
      inputTokens,
      outputTokens,
      model,
    };
  }
}
