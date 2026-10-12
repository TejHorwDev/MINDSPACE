"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  Cpu,
  Edit2,
  ExternalLink,
  FileCode2,
  Loader2,
  MessageCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { safeUrl } from "@/lib/sanitize";
import type { EditorFile, AccountPlanInfo } from "./types";

export type ChatSessionItem = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
};

export type ProposedDiff = {
  path: string;
  originalContent: string;
  proposedContent: string;
  status: "pending" | "applied" | "rejected";
  isNewFile?: boolean;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  diffs?: ProposedDiff[] | null;
  costUSD?: number | null;
  providerId?: string | null;
  providerName?: string | null;
  fallbackUsed?: boolean;
  fallbackNotice?: string | null;
  usedMcpServers?: string[];
  createdAt?: string;
};

export type ContactChannelItem = {
  id: string;
  name: string;
  iconType: string;
  contactLink: string;
  instructions: string;
  active: boolean;
};

export type CreditBalanceInfo = {
  freeCredits: number;
  purchasedCredits: number;
  totalCredits: number;
  creditsResetAt?: string | Date;
};

export type AiProviderOption = {
  id: string;
  name: string;
};

export type StatusBanner =
  | {
      type: "out_of_credits";
      message: string;
      resetTimeText: string;
    }
  | {
      type: "daily_limit_reached";
      message: string;
      dailyLimit?: number;
    }
  | {
      type: "rate_limited";
      message: string;
      modelName?: string;
    }
  | {
      type: "provider_disabled";
      message: string;
      modelName?: string;
    }
  | {
      type: "all_providers_down";
      message: string;
    }
  | {
      type: "no_provider_configured";
      message: string;
    }
  | null;

type AiChatPanelProps = {
  projectId: string;
  files: EditorFile[];
  activeFileId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyChange: (path: string, newContent: string, createdFile?: any) => Promise<void> | void;
  onBalanceChange?: (newBalance: number) => void;
  accountPlan?: AccountPlanInfo | null;
};

function formatNextResetTime(): string {
  const now = new Date();
  const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const diffMs = nextReset.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `00:00 UTC (in ${diffHours}h ${diffMins}m)`;
}

// Unified line diff calculator
function computeLineDiff(original: string, proposed: string) {
  const origLines = original.split("\n");
  const propLines = proposed.split("\n");

  const diff: { type: "same" | "add" | "remove"; text: string }[] = [];

  const max = Math.max(origLines.length, propLines.length);
  for (let i = 0; i < max; i++) {
    const o = origLines[i];
    const p = propLines[i];

    if (o === p) {
      if (o !== undefined) diff.push({ type: "same", text: o });
    } else {
      if (o !== undefined && !propLines.includes(o)) {
        diff.push({ type: "remove", text: o });
      }
      if (p !== undefined && !origLines.includes(p)) {
        diff.push({ type: "add", text: p });
      }
    }
  }

  if (diff.filter((d) => d.type !== "same").length === 0 && original !== proposed) {
    return [
      ...origLines.slice(0, 10).map((l) => ({ type: "remove" as const, text: l })),
      ...propLines.slice(0, 10).map((l) => ({ type: "add" as const, text: l })),
    ];
  }

  return diff.slice(0, 40);
}

export function AiChatPanel({
  projectId,
  files,
  activeFileId,
  isOpen,
  onClose,
  onApplyChange,
  onBalanceChange,
  accountPlan: initialPlan,
}: AiChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [applyingPath, setApplyingPath] = useState<string | null>(null);
  const [balance, setBalance] = useState<CreditBalanceInfo | null>(null);
  const [channels, setChannels] = useState<ContactChannelItem[]>([]);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [dailyLimit, setDailyLimit] = useState<number>(15);
  const [todayRequestCount, setTodayRequestCount] = useState<number>(0);
  const [accountPlan, setAccountPlan] = useState<AccountPlanInfo | null>(initialPlan ?? null);
  const [dailyAllowance, setDailyAllowance] = useState<number>(initialPlan?.dailyFreeCreditUSD ?? 20.0);
  const [isPaidUser, setIsPaidUser] = useState<boolean>(() => {
    return Boolean(
      initialPlan && (
        (initialPlan.dailyFreeCreditUSD ?? 0) > 20 ||
        initialPlan.name.toLowerCase().includes("pro")
      )
    );
  });
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState<number>(4.0);
  const [dismissedLowBalance, setDismissedLowBalance] = useState<boolean>(false);

  // Multi-Chat Sessions State
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showSessionsDropdown, setShowSessionsDropdown] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Model Picker & Providers State
  const [providers, setProviders] = useState<AiProviderOption[]>([
    { id: "auto", name: "Auto (Recommended)" },
  ]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("auto");
  const [autoApprove, setAutoApprove] = useState<boolean>(false);

  // Status Banners State
  const [statusBanner, setStatusBanner] = useState<StatusBanner>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load user settings (Auto-Approve & default model preference)
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.settings?.aiAutoApprove !== undefined) {
          setAutoApprove(Boolean(data.settings.aiAutoApprove));
        }
        if (data?.settings?.aiDefaultModelId) {
          setSelectedProviderId(data.settings.aiDefaultModelId);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch available AI providers (including personal BYOK keys)
  useEffect(() => {
    fetch("/api/ai/providers")
      .then((r) => r.json())
      .then((data) => {
        if (data?.providers && Array.isArray(data.providers)) {
          setProviders(data.providers);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Load remember model per project from localStorage
  useEffect(() => {
    try {
      const savedModel = localStorage.getItem(`mindspace_ai_model_${projectId}`);
      if (savedModel) {
        setSelectedProviderId(savedModel);
      }
    } catch {
      // Ignore in private browser mode
    }
  }, [projectId]);

  // Load chat messages, balance, channels, and providers on mount
  useEffect(() => {
    let cancelled = false;

    async function loadChat() {
      try {
        const query = activeSessionId ? `?sessionId=${activeSessionId}` : "";
        const res = await fetch(`/api/projects/${projectId}/ai-chat${query}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        if (data.sessions) {
          setSessions(data.sessions);
        }
        if (data.activeSessionId && !activeSessionId) {
          setActiveSessionId(data.activeSessionId);
        }

        if (data.messages) {
          setMessages(
            data.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              diffs: m.diffs,
              costUSD: m.costUSD,
              providerId: m.providerId,
              providerName: m.providerName,
              createdAt: m.createdAt,
            }))
          );
        }

        if (data.lowBalanceThreshold !== undefined) {
          setLowBalanceThreshold(data.lowBalanceThreshold);
        }

        if (data.credits) {
          setBalance(data.credits);
          onBalanceChange?.(data.credits.totalCredits);
          if (data.credits.totalCredits <= 0) {
            setOutOfCredits(true);
            setStatusBanner({
              type: "out_of_credits",
              message: `You're out of free credits for today — resets at ${formatNextResetTime()}.`,
              resetTimeText: formatNextResetTime(),
            });
          }
        }

        if (data.channels) {
          setChannels(data.channels);
        }

        if (data.dailyLimit !== undefined) {
          setDailyLimit(data.dailyLimit);
        }
        if (data.todayRequestCount !== undefined) {
          setTodayRequestCount(data.todayRequestCount);
        }
        if (data.accountPlan) {
          setAccountPlan(data.accountPlan);
        }
        if (data.dailyCreditAllowance !== undefined) {
          setDailyAllowance(data.dailyCreditAllowance);
        }
        if (data.isPaidUser !== undefined) {
          setIsPaidUser(data.isPaidUser);
        }

        if (data.hasConfiguredProvider === false && !data.outOfCredits) {
          setStatusBanner({
            type: "no_provider_configured",
            message: "No AI provider is configured yet — ask the admin to add an API key in /admin → AI Providers",
          });
        }
      } catch (err) {
        console.error("Failed to load AI chat:", err);
      }
    }

    if (isOpen) {
      loadChat();
    }

    return () => {
      cancelled = true;
    };
  }, [projectId, isOpen, activeSessionId]);

  const handleNewChat = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/chat-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessions((prev) => [data.session, ...prev]);
        setActiveSessionId(data.session.id);
        setMessages([]);
        setShowSessionsDropdown(false);
        toast.success("Started a new chat session!");
      }
    } catch {
      toast.error("Failed to start new chat");
    }
  };

  const handleSwitchSession = async (sessionId: string) => {
    if (sessionId === activeSessionId) {
      setShowSessionsDropdown(false);
      return;
    }
    setActiveSessionId(sessionId);
    setShowSessionsDropdown(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-chat?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(
          (data.messages || []).map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            diffs: m.diffs,
            costUSD: m.costUSD,
            providerId: m.providerId,
            providerName: m.providerName,
            createdAt: m.createdAt,
          }))
        );
      }
    } catch {
      toast.error("Failed to load chat history");
    } finally {
      setLoading(false);
    }
  };

  const handleRenameSession = async (sessionId: string) => {
    if (!editTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    try {
      const res = await fetch(`/api/projects/${projectId}/chat-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, title: editTitle.trim() } : s))
        );
        toast.success("Chat renamed");
      }
    } catch {
      toast.error("Failed to rename chat");
    } finally {
      setEditingSessionId(null);
      setEditTitle("");
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (sessions.length <= 1) {
      toast.error("Cannot delete the only chat session. Start a new chat first!");
      return;
    }
    try {
      const res = await fetch(`/api/projects/${projectId}/chat-sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        setSessions(remaining);
        if (activeSessionId === sessionId) {
          const next = remaining[0];
          setActiveSessionId(next.id);
          await handleSwitchSession(next.id);
        }
        toast.success("Chat session deleted");
      }
    } catch {
      toast.error("Failed to delete chat session");
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, statusBanner]);

  const handleModelChange = (newProviderId: string) => {
    setSelectedProviderId(newProviderId);
    setStatusBanner(null);
    try {
      localStorage.setItem(`mindspace_ai_model_${projectId}`, newProviderId);
    } catch {
      // Ignore
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || prompt).trim();
    if (!textToSend || loading) return;

    if (balance && balance.totalCredits <= 0) {
      setOutOfCredits(true);
      setStatusBanner({
        type: "out_of_credits",
        message: `You're out of free credits for today — resets at ${formatNextResetTime()}. Want more now?`,
        resetTimeText: formatNextResetTime(),
      });
      return;
    }

    setPrompt("");
    setLastPrompt(textToSend);
    setStatusBanner(null);
    setLoading(true);

    // Optimistically append user message
    const tempUserMsgId = `temp-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: tempUserMsgId,
      role: "user",
      content: textToSend,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch(`/api/projects/${projectId}/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToSend,
          providerId: selectedProviderId === "auto" ? undefined : selectedProviderId,
          sessionId: activeSessionId || undefined,
        }),
      });

      const data = await res.json();

      // State: Out of Credits
      if (res.status === 402 || data.outOfCredits) {
        setOutOfCredits(true);
        if (data.channels) setChannels(data.channels);
        if (data.credits) setBalance(data.credits);
        setStatusBanner({
          type: "out_of_credits",
          message: `You're out of free credits for today — resets at ${formatNextResetTime()}. Want more now?`,
          resetTimeText: formatNextResetTime(),
        });
        return;
      }

      // State: Daily Request Limit Reached (Free Tier)
      if (res.status === 429 && data.code === "DAILY_REQUEST_LIMIT_REACHED") {
        if (data.channels) setChannels(data.channels);
        if (data.dailyLimit) setDailyLimit(data.dailyLimit);
        if (data.todayRequestCount) setTodayRequestCount(data.todayRequestCount);
        setStatusBanner({
          type: "daily_limit_reached",
          message: data.error,
          dailyLimit: data.dailyLimit,
        });
        return;
      }

      // State: Specific model rate-limited / high demand
      if (res.status === 429 && data.code === "PROVIDER_RATE_LIMITED") {
        setStatusBanner({
          type: "rate_limited",
          message: data.error,
          modelName: data.modelName,
        });
        return;
      }

      // State: Specific model disabled / unavailable
      if (res.status === 503 && data.code === "PROVIDER_DISABLED") {
        setStatusBanner({
          type: "provider_disabled",
          message: data.error,
          modelName: data.modelName,
        });
        return;
      }

      // State: All providers down or internal error
      if (!res.ok) {
        setStatusBanner({
          type: "all_providers_down",
          message:
            data.error ||
            "AI help is temporarily unavailable — please try again in a moment.",
        });
        return;
      }

      // Append assistant message with proposed diffs & provider info
      const assistantMsg: ChatMessage = {
        id: data.messageId,
        role: "assistant",
        content: data.reply,
        diffs: data.proposedChanges,
        costUSD: data.costUSD,
        providerId: data.providerId,
        providerName: data.providerName,
        fallbackUsed: data.fallbackUsed,
        fallbackNotice: data.fallbackNotice,
        usedMcpServers: data.usedMcpServers || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.sessionId && !activeSessionId) {
        setActiveSessionId(data.sessionId);
      }
      if (data.sessionTitle && data.sessionId) {
        setSessions((prev) =>
          prev.map((s) => (s.id === data.sessionId ? { ...s, title: data.sessionTitle } : s))
        );
      }

      // If Auto-Approve is enabled, apply all proposed changes immediately!
      if (autoApprove && data.proposedChanges && data.proposedChanges.length > 0) {
        for (const diff of data.proposedChanges) {
          try {
            const applyRes = await fetch(`/api/projects/${projectId}/ai-chat/apply`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messageId: data.messageId,
                path: diff.path,
                content: diff.proposedContent,
                action: "apply",
              }),
            });
            if (applyRes.ok) {
              const applyData = await applyRes.json();
              await onApplyChange(diff.path, diff.proposedContent, applyData.file);
            }
          } catch (autoErr) {
            console.error("Auto-apply error for", diff.path, autoErr);
          }
        }
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.messageId && msg.diffs
              ? {
                  ...msg,
                  diffs: msg.diffs.map((d) => ({ ...d, status: "applied" })),
                }
              : msg
          )
        );
        toast.success(
          `Auto-approved & applied ${data.proposedChanges.length} file change${
            data.proposedChanges.length > 1 ? "s" : ""
          }!`
        );
      }

      // Update balance & prompt counters
      if (data.dailyLimit !== undefined) setDailyLimit(data.dailyLimit);
      if (data.todayRequestCount !== undefined) setTodayRequestCount(data.todayRequestCount);
      if (data.isPaidUser !== undefined) setIsPaidUser(data.isPaidUser);

      if (data.lowBalanceThreshold !== undefined) {
        setLowBalanceThreshold(data.lowBalanceThreshold);
      }

      if (data.remainingBalance !== undefined) {
        setBalance((prev) =>
          prev
            ? {
                ...prev,
                totalCredits: data.remainingBalance,
                freeCredits: data.isPaidUser ? 0 : Math.min(prev.freeCredits, data.remainingBalance),
                purchasedCredits: data.isPaidUser ? data.remainingBalance : prev.purchasedCredits,
              }
            : null
        );
        onBalanceChange?.(data.remainingBalance);
        if (data.remainingBalance <= 0) {
          setOutOfCredits(true);
        }
      }
    } catch (err: any) {
      console.warn("AI Chat request error:", err?.message || err);
      setStatusBanner({
        type: "all_providers_down",
        message: err.message || "AI help is temporarily unavailable — please try again shortly.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (messageId: string, diff: ProposedDiff) => {
    setApplyingPath(diff.path);
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-chat/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          path: diff.path,
          content: diff.proposedContent,
          action: "apply",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to apply file change.");
      }

      const applyData = await res.json();
      await onApplyChange(diff.path, diff.proposedContent, applyData.file);

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId && msg.diffs) {
            return {
              ...msg,
              diffs: msg.diffs.map((d) =>
                d.path === diff.path ? { ...d, status: "applied" } : d
              ),
            };
          }
          return msg;
        })
      );

      toast.success(`Applied changes to ${diff.path}!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to apply code.");
    } finally {
      setApplyingPath(null);
    }
  };

  const handleReject = async (messageId: string, diff: ProposedDiff) => {
    try {
      await fetch(`/api/projects/${projectId}/ai-chat/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          path: diff.path,
          action: "reject",
        }),
      });

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId && msg.diffs) {
            return {
              ...msg,
              diffs: msg.diffs.map((d) =>
                d.path === diff.path ? { ...d, status: "rejected" } : d
              ),
            };
          }
          return msg;
        })
      );

      toast.info(`Discarded change proposal for ${diff.path}.`);
    } catch (err) {
      console.error(err);
    }
  };

  const isCurrentByok = Boolean(selectedProviderId && selectedProviderId.startsWith("byok-"));
  const isLowBalance = Boolean(
    balance &&
      balance.totalCredits > 0 &&
      balance.totalCredits <= lowBalanceThreshold &&
      !isCurrentByok
  );
  const isZeroBalance = Boolean(balance && balance.totalCredits <= 0 && !isCurrentByok);
  const isOutOfCredits = Boolean((outOfCredits || isZeroBalance) && !isCurrentByok);

  if (!isOpen) return null;

  return (
    <aside
      aria-label="AI Help Panel"
      className="flex h-full w-[440px] shrink-0 flex-col border-l border-border/80 bg-card shadow-2xl z-30 overflow-hidden"
    >
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-secondary text-foreground border border-border/80">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground">AI Help</span>
              <span className="rounded-md bg-secondary px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                Flash & Multi-Model
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-foreground">
                {accountPlan?.name || (isPaidUser ? "Pro" : "Free")} Tier
              </span>
              <span>·</span>
              <span className="text-foreground/90 font-mono font-medium">
                ${(accountPlan?.dailyFreeCreditUSD ?? dailyAllowance).toFixed(2)} daily allowance
              </span>
              <span>·</span>
              <span className="tabular-nums">
                {todayRequestCount}/{dailyLimit} prompts
              </span>
            </p>
          </div>
        </div>

        {/* Live Credit Pill & Close Button */}
        <div className="flex items-center gap-2">
          <Link
            href="/credits"
            target="_blank"
            title="View Credits & Top-Up Channels"
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono font-semibold transition-all ${
              isZeroBalance
                ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
                : isLowBalance
                ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                : "border-border/70 bg-secondary/80 text-foreground hover:bg-secondary"
            }`}
          >
            <Coins
              className={`size-3 ${
                isZeroBalance
                  ? "text-rose-400"
                  : isLowBalance
                  ? "text-amber-400"
                  : "text-amber-500"
              }`}
            />
            <span>
              ${balance ? balance.totalCredits.toFixed(2) : "20.00"}
            </span>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
            title="Close AI Help (Ctrl+J)"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* 2. Model Picker & Auto-Approve Toolbar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-secondary/25 px-3 py-2 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Cpu className="size-3.5 text-indigo-400 shrink-0" />
          <select
            value={selectedProviderId}
            onChange={(e) => handleModelChange(e.target.value)}
            aria-label="Select AI Model"
            className="h-7 rounded-lg border border-border/80 bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs max-w-[190px] truncate"
          >
            <option value="auto">Auto (Recommended)</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Auto-Approve Toggle Switch */}
        <button
          type="button"
          onClick={() => {
            const next = !autoApprove;
            setAutoApprove(next);
            fetch("/api/settings", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ aiAutoApprove: next }),
            }).catch(() => {});
            toast.info(
              `Auto-Approve is now ${next ? "ON (changes apply automatically)" : "OFF (manual review)"}`
            );
          }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all shrink-0 ${
            autoApprove
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-xs"
              : "bg-secondary text-muted-foreground border border-border/60 hover:text-foreground"
          }`}
          title="When ON, AI changes apply immediately without requiring manual diff review"
        >
          <Zap className={`size-3 ${autoApprove ? "fill-amber-400 text-amber-400" : ""}`} />
          <span>Auto-Approve: {autoApprove ? "ON" : "OFF"}</span>
        </button>
      </div>

      {/* 2.5 Multi-Chat Session Selector */}
      <div className="relative border-b border-border/60 bg-muted/20 px-3 py-2 flex items-center justify-between gap-2">
        <div className="relative flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setShowSessionsDropdown((prev) => !prev)}
            className="flex items-center gap-1.5 w-full text-left rounded-lg border border-border/70 bg-background/80 hover:bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-all shadow-2xs truncate"
            title="Switch or manage chat sessions"
          >
            <MessageSquare className="size-3.5 text-indigo-400 shrink-0" />
            <span className="truncate flex-1">
              {sessions.find((s) => s.id === activeSessionId)?.title || "Current Chat"}
            </span>
            <ChevronDown className={`size-3 text-muted-foreground shrink-0 transition-transform ${showSessionsDropdown ? "rotate-180" : ""}`} />
          </button>

          {/* Sessions Dropdown Menu */}
          {showSessionsDropdown && (
            <div className="absolute left-0 top-full mt-1.5 w-72 rounded-xl border border-border bg-popover p-1.5 shadow-xl z-50 animate-in fade-in-0 zoom-in-95">
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-muted-foreground border-b border-border/50 mb-1">
                <span>Chat Sessions ({sessions.length})</span>
                <span className="text-[10px] text-muted-foreground/80">Account credits shared</span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`group flex items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-all ${
                      s.id === activeSessionId
                        ? "bg-indigo-500/15 text-indigo-400 font-medium"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {editingSessionId === s.id ? (
                      <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameSession(s.id);
                            if (e.key === "Escape") setEditingSessionId(null);
                          }}
                          className="h-6 w-full rounded border border-border bg-background px-1.5 text-xs text-foreground focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameSession(s.id)}
                          className="p-1 hover:text-green-400"
                        >
                          <Check className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSwitchSession(s.id)}
                          className="flex-1 text-left truncate flex items-center gap-1.5"
                        >
                          <MessageSquare className="size-3 shrink-0 opacity-70" />
                          <span className="truncate">{s.title}</span>
                          {s._count?.messages !== undefined && (
                            <span className="text-[10px] text-muted-foreground/70 shrink-0">
                              ({s._count.messages})
                            </span>
                          )}
                        </button>

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSessionId(s.id);
                              setEditTitle(s.title);
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground rounded"
                            title="Rename chat"
                          >
                            <Edit2 className="size-3" />
                          </button>
                          {sessions.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(s.id);
                              }}
                              className="p-1 text-muted-foreground hover:text-destructive rounded"
                              title="Delete chat"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleNewChat}
          className="flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 text-xs font-semibold text-indigo-400 transition-all shadow-2xs shrink-0 cursor-pointer"
          title="Start a fresh chat conversation with clean context"
        >
          <Plus className="size-3.5" />
          <span>New Chat</span>
        </button>
      </div>

      {/* 3. Chat Conversation View */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-5 py-4 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border/80 bg-secondary/60 text-muted-foreground shadow-2xs">
              <Sparkles className="size-7" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-foreground tracking-tight">MINDSPACE AI Studio Assistant</h4>
              <p className="text-xs text-muted-foreground max-w-[320px] mx-auto leading-relaxed">
                Full-project context aware. Inspects code, proposes atomic visual diffs, and creates new files on command.
              </p>
            </div>

            {/* Quick Starters */}
            <div className="space-y-2 pt-1 text-left">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Quick Actions:
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">1-click prompts</span>
              </div>
              {[
                { tag: "Styling", text: "Make navbar sticky with frosted obsidian backdrop blur" },
                { tag: "Theme", text: "Apply high-end Apple / Linear obsidian dark theme to body" },
                { tag: "Feature", text: "Create an interactive counter component with smooth animations" },
                { tag: "Audit", text: "Scan project files and fix any layout or styling bugs" },
              ].map((starter) => (
                <button
                  key={starter.text}
                  type="button"
                  onClick={() => handleSendMessage(starter.text)}
                  className="group w-full text-left rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/70 hover:border-border transition-colors flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="shrink-0 rounded-md bg-secondary border border-border/80 px-1.5 py-0.5 text-[9px] font-mono font-medium text-foreground">
                      {starter.tag}
                    </span>
                    <span className="truncate group-hover:text-foreground transition-colors">{starter.text}</span>
                  </div>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`rounded-2xl p-3.5 text-xs max-w-[92%] leading-relaxed ${
                msg.role === "user"
                  ? "bg-foreground text-background font-medium shadow-xs"
                  : "bg-secondary/70 text-foreground border border-border/70 shadow-xs"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Provider Info & Transparent Fallback Note */}
              {msg.role === "assistant" && (
                <div className="mt-2.5 pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    {msg.fallbackNotice ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400">
                        <Sparkles className="size-2.5" />
                        {msg.fallbackNotice}
                      </span>
                    ) : msg.providerName ? (
                      <span className="inline-flex items-center gap-1 opacity-80">
                        <Cpu className="size-2.5" />
                        Via {msg.providerName}
                      </span>
                    ) : null}

                    {msg.usedMcpServers && msg.usedMcpServers.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                        <Wrench className="size-2.5" />
                        Used: {msg.usedMcpServers.join(", ")}
                      </span>
                    )}
                  </div>

                  {msg.costUSD !== undefined && msg.costUSD !== null && (
                    <div>-${msg.costUSD.toFixed(4)}</div>
                  )}
                </div>
              )}
            </div>

            {/* Proposed Diffs Section (For Assistant) */}
            {msg.role === "assistant" && msg.diffs && msg.diffs.length > 0 && (
              <div className="w-full mt-2 space-y-3">
                {msg.diffs.map((diff) => {
                  const lineDiffs = computeLineDiff(diff.originalContent, diff.proposedContent);

                  return (
                    <div
                      key={diff.path}
                      className="rounded-2xl border border-border bg-card text-foreground overflow-hidden shadow-sm"
                    >
                      {/* Diff Header */}
                      <div className="flex items-center justify-between border-b border-border/70 bg-secondary/40 px-3.5 py-2">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-foreground">
                          <FileCode2 className="size-3.5 text-foreground/70" />
                          <span>{diff.path}</span>
                        </div>

                        {diff.status === "applied" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <Check className="size-3.5" />
                            Applied
                          </span>
                        ) : diff.status === "rejected" ? (
                          <span className="text-[11px] font-medium text-muted-foreground">
                            Discarded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-amber-600 dark:text-amber-400">
                            <span className="status-dot status-dot-warning" />
                            Proposed Diff
                          </span>
                        )}
                      </div>

                      {/* Code Diff Body */}
                      <div className="max-h-56 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed select-text space-y-0.5 bg-background">
                        {lineDiffs.map((line, idx) => (
                          <div
                            key={idx}
                            className={`px-1.5 py-0.5 rounded ${
                              line.type === "add"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium"
                                : line.type === "remove"
                                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 line-through opacity-80"
                                : "text-muted-foreground"
                            }`}
                          >
                            <span className="inline-block w-4 opacity-60">
                              {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                            </span>
                            {line.text}
                          </div>
                        ))}
                      </div>

                      {/* Action Bar: Apply (Primary Accent) / Reject (Neutral Outline) */}
                      {diff.status === "pending" && (
                        <div className="flex items-center justify-end gap-2 border-t border-border/70 bg-secondary/30 p-2.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(msg.id, diff)}
                            disabled={applyingPath === diff.path}
                            className="h-8 px-3.5 text-xs rounded-xl border-border text-foreground hover:bg-secondary"
                          >
                            Reject
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleApply(msg.id, diff)}
                            disabled={applyingPath === diff.path}
                            className="h-8 px-4 text-xs font-semibold rounded-xl bg-foreground text-background hover:bg-foreground/90 shadow-xs"
                          >
                            {applyingPath === diff.path ? (
                              <>
                                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                                Applying...
                              </>
                            ) : (
                              <>
                                <Check className="mr-1.5 size-3.5" />
                                Apply to {diff.path}
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Loading State with Backup Transition Indicator */}
        {loading && (
          <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-secondary/50 p-3 text-xs text-muted-foreground animate-pulse">
            <Loader2 className="size-4 animate-spin text-indigo-500" />
            <span>Analyzing project files & generating diff...</span>
          </div>
        )}

        {/* 4. REAL INLINE STATUS BANNERS (Section 3: Clear, honest status for every state) */}
        {statusBanner && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* A. Out of Credits State — Clear, Honest, Multi-Option (Section 4) */}
            {statusBanner.type === "out_of_credits" && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3.5 shadow-md">
                <div className="flex items-start gap-2.5">
                  <div className="size-7 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="size-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-foreground">
                      Out of AI Credits for Today
                    </h5>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      You&apos;ve used your daily AI credit allowance. Choose how you&apos;d like to proceed:
                    </p>
                  </div>
                </div>

                {/* Side-by-Side Real Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Option 1: Upgrade Account Plan */}
                  <div className="rounded-xl border border-border/80 bg-secondary/40 p-3 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Account Plan</span>
                        <span className="text-[9px] bg-secondary text-foreground px-1.5 py-0.2 rounded font-mono font-semibold">Pro Tier</span>
                      </div>
                      <h6 className="text-xs font-bold text-foreground mt-1">Upgrade to Pro</h6>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        $50.00/day allowance, 50 projects, and 2.5GB storage.
                      </p>
                    </div>
                    <Button asChild size="sm" className="h-7 w-full text-xs font-medium bg-foreground text-background hover:bg-foreground/90 rounded-lg transition-colors">
                      <Link href="/credits" target="_blank">Switch to Pro</Link>
                    </Button>
                  </div>

                  {/* Option 2: Buy Credits Top-Up */}
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">One-Time Pack</span>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-semibold">Never Expires</span>
                      </div>
                      <h6 className="text-xs font-bold text-foreground mt-1">Buy Top-Up Pack</h6>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        Purchased credits never expire and carry over daily.
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="h-7 w-full text-xs font-bold border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 rounded-lg">
                      <Link href="/credits" target="_blank">Buy Top-Up</Link>
                    </Button>
                  </div>
                </div>

                {/* Option 3: Wait for Free Daily Reset (Genuinely Visible, Never Hidden) */}
                <div className="rounded-xl border border-border/80 bg-secondary/50 p-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px]">
                      <Clock className="size-3.5 text-blue-400" />
                      <span>Wait for Free Daily Reset</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Free credits reset at 00:00 UTC ({formatNextResetTime()}). You don&apos;t have to pay to keep creating.
                    </p>
                  </div>
                </div>

                {/* Direct Purchase Channels if configured */}
                {channels.length > 0 && (
                  <div className="space-y-1.5 pt-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                      Quick Purchase Channels:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {channels.map((ch) => (
                        <a
                          key={ch.id}
                          href={safeUrl(ch.contactLink) || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background p-1.5 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
                        >
                          <MessageCircle className="size-3 text-indigo-500" />
                          <span>{ch.name}</span>
                          <ExternalLink className="size-2.5 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Option 4: Bring Your Own Key */}
                <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
                  <span>Have a personal API key?</span>
                  <Link href="/settings" target="_blank" className="font-semibold text-primary hover:underline inline-flex items-center gap-1">
                    <span>Use BYOK for $0 deduction</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            )}

            {/* B. Daily Request Limit Reached (Free Tier) */}
            {statusBanner.type === "daily_limit_reached" && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.08] p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-foreground">
                      Daily Free Limit Reached
                    </h5>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {statusBanner.message}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    asChild
                    size="sm"
                    className="h-7 px-3 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-lg"
                  >
                    <Link href="/credits" target="_blank">
                      <span>Upgrade to Paid Plan</span>
                      <ExternalLink className="ml-1.5 size-3" />
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setStatusBanner(null)}
                    className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {/* C. Specific Model High Demand / Rate Limited State */}
            {statusBanner.type === "rate_limited" && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-4 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-foreground">
                      {statusBanner.modelName || "Selected Model"} is in High Demand
                    </h5>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {statusBanner.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => handleModelChange("auto")}
                    className="h-7 px-3 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-lg"
                  >
                    Switch to Auto (Recommended)
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setStatusBanner(null)}
                    className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {/* C. Specific Model Disabled State */}
            {statusBanner.type === "provider_disabled" && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-4 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-foreground">
                      Model Unavailable
                    </h5>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {statusBanner.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => handleModelChange("auto")}
                    className="h-7 px-3 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-lg"
                  >
                    Switch to Auto (Recommended)
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setStatusBanner(null)}
                    className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {/* D. All Providers Down (Auto mode) */}
            {statusBanner.type === "all_providers_down" && (
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.08] p-4 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <Zap className="size-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-foreground">
                      Service Temporarily Unavailable
                    </h5>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {statusBanner.message}
                    </p>
                  </div>
                </div>

                {lastPrompt && (
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleSendMessage(lastPrompt)}
                      className="h-7 px-3 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-lg"
                    >
                      <RefreshCw className="mr-1.5 size-3" />
                      Retry Request
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* E. No AI Provider Configured State (Honest, Zero-Fake AI) */}
            {statusBanner.type === "no_provider_configured" && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.08] p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-foreground">
                      No AI Provider Configured
                    </h5>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {statusBanner.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    asChild
                    size="sm"
                    className="h-7 px-3 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-lg"
                  >
                    <Link href="/admin" target="_blank">
                      <span>Open /admin → AI Providers</span>
                      <ExternalLink className="ml-1.5 size-3" />
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setStatusBanner(null)}
                    className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 5. Non-blocking Low Balance Warning Banner */}
      {balance && balance.totalCredits > 0 && balance.totalCredits <= lowBalanceThreshold && !dismissedLowBalance && !outOfCredits && (
        <div className="mx-3 my-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Coins className="size-3.5 text-amber-500 shrink-0" />
            <span className="truncate text-amber-600 dark:text-amber-400 font-medium text-[11px]">
              Running low — <strong className="font-semibold">${balance.totalCredits.toFixed(2)}</strong> left today
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/credits"
              target="_blank"
              className="text-[11px] font-semibold text-amber-600 dark:text-amber-300 underline hover:no-underline"
            >
              Upgrade / Buy
            </Link>
            <button
              onClick={() => setDismissedLowBalance(true)}
              className="p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors"
              title="Dismiss heads-up"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 6. Chat Input Bar */}
      {!outOfCredits && statusBanner?.type !== "daily_limit_reached" && (
        <div className="border-t border-border/70 bg-background p-3 space-y-2">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={prompt}
              maxLength={1500}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask AI to edit, fix, or add features... (Enter to send)"
              rows={2}
              disabled={loading}
              className="resize-none pr-10 text-xs rounded-xl border-border/80 focus-visible:ring-indigo-500"
            />

            <Button
              size="icon"
              disabled={!prompt.trim() || loading}
              onClick={() => handleSendMessage()}
              className="absolute right-2 bottom-2 size-7 rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30"
              title="Send Request"
            >
              <Send className="size-3.5" />
            </Button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1 font-mono">
            <span>
              {isPaidUser
                ? "Paid Plan • Unlimited requests"
                : `${todayRequestCount}/${dailyLimit} prompts today`}
            </span>
            <span className={prompt.length >= 1400 ? "text-amber-500 font-bold" : ""}>
              {prompt.length}/1500
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
