"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  CreditCard,
  ExternalLink,
  History,
  Layers,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type CreditTransactionItem = {
  id: string;
  amount: number;
  type: string;
  reason: string;
  createdAt: string;
};

export type CreditPlanItem = {
  id: string;
  name: string;
  priceNPR: number;
  creditsGrantedUSD: number;
  active: boolean;
};

export type ContactChannelItem = {
  id: string;
  name: string;
  iconType: string;
  contactLink: string;
  instructions: string;
  active: boolean;
};

export type AccountPlanItem = {
  id: string;
  name: string;
  priceNPR?: number;
  dailyFreeCreditUSD: number;
  maxProjects: number;
  maxStorageMB: number;
  isDefault: boolean;
  active: boolean;
};

export type DailyUsageItem = {
  date: string;
  label: string;
  spendUSD: number;
  count: number;
};

export type PurchaseRequestSummaryItem = {
  id: string;
  type: string;
  planName: string | null;
  amountUSD: number | null;
  priceNPR: number | null;
  status: string;
  createdAt: string;
};

type CreditsViewProps = {
  freeCredits: number;
  purchasedCredits: number;
  totalCredits: number;
  creditsResetAt: string;
  currentAccountPlan?: AccountPlanItem | null;
  allAccountPlans: AccountPlanItem[];
  transactions: CreditTransactionItem[];
  dailyUsage?: DailyUsageItem[];
  purchaseRequests?: PurchaseRequestSummaryItem[];
  plans: CreditPlanItem[];
  channels: ContactChannelItem[];
};

const CreditsUsageChart = dynamic(() => import("./credits-usage-chart"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-xl bg-secondary/30" />,
});

export function CreditsView({
  freeCredits,
  purchasedCredits,
  totalCredits,
  creditsResetAt,
  currentAccountPlan,
  allAccountPlans,
  transactions,
  dailyUsage = [],
  purchaseRequests = [],
  plans,
  channels,
}: CreditsViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"tiers" | "topup" | "usage" | "history">("tiers");
  const [usageRange, setUsageRange] = useState<"7d" | "30d">("7d");
  const [selectedTopUp, setSelectedTopUp] = useState<CreditPlanItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [txSearch, setTxSearch] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState("all");
  const [upgrading, setUpgrading] = useState(false);

  const activePlan: AccountPlanItem = currentAccountPlan || {
    id: "free",
    name: "Free",
    dailyFreeCreditUSD: 20,
    maxProjects: 5,
    maxStorageMB: 250,
    isDefault: true,
    active: true,
  };

  const isPro = activePlan.name.toLowerCase().includes("pro");

  // Handle instant upgrade/switch to Pro tier
  const handleUpgradePlan = async (planName: string) => {
    setUpgrading(true);
    try {
      const res = await fetch("/api/user/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlanName: planName }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Switched to ${planName} Plan!`);
        router.refresh();
      } else {
        toast.error(data.error || "Failed to switch plan");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setUpgrading(false);
    }
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        !txSearch.trim() ||
        tx.reason.toLowerCase().includes(txSearch.toLowerCase().trim()) ||
        tx.type.toLowerCase().includes(txSearch.toLowerCase().trim());

      const matchesType = txTypeFilter === "all" || tx.type === txTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, txSearch, txTypeFilter]);

  // Usage transparency slicing & statistics
  const filteredUsage = useMemo(() => {
    if (!dailyUsage || dailyUsage.length === 0) return [];
    const count = usageRange === "7d" ? 7 : 30;
    return dailyUsage.slice(-count);
  }, [dailyUsage, usageRange]);

  const usageStats = useMemo(() => {
    if (!filteredUsage.length) {
      return { totalSpend: 0, totalRequests: 0, avgSpend: 0, peakDay: null as DailyUsageItem | null };
    }
    const totalSpend = filteredUsage.reduce((acc, curr) => acc + curr.spendUSD, 0);
    const totalRequests = filteredUsage.reduce((acc, curr) => acc + curr.count, 0);
    const avgSpend = totalSpend / filteredUsage.length;
    const peakDay = [...filteredUsage].sort((a, b) => b.spendUSD - a.spendUSD)[0] || null;
    return {
      totalSpend: Math.round(totalSpend * 1000) / 1000,
      totalRequests,
      avgSpend: Math.round(avgSpend * 1000) / 1000,
      peakDay,
    };
  }, [filteredUsage]);

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "daily_reset":
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Daily Reset</Badge>;
      case "admin_grant":
        return <Badge variant="secondary" className="bg-secondary text-foreground border-border/80 text-[10px]">Admin Grant</Badge>;
      case "plan_changed":
        return <Badge variant="secondary" className="bg-secondary text-foreground border-border/80 text-[10px]">Tier Upgrade</Badge>;
      case "purchase":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">Top-Up Pack</Badge>;
      case "ai_usage":
      default:
        return <Badge variant="outline" className="text-muted-foreground border-border/70 text-[10px]">AI Usage</Badge>;
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* 1. Header Command Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="size-3" />
              <span>Workspace</span>
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-xs font-semibold text-foreground">Credits & Plans</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Account Tiers & AI Credits
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Your ongoing account tier gives you daily free credits. One-time top-ups never expire and stack on top.
          </p>
        </div>

        {/* Live Balance Pill */}
        <div className="flex items-center gap-3 self-stretch sm:self-auto bg-card p-3 rounded-2xl border border-border/80 shadow-xs shrink-0">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Coins className="size-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Total Spending Balance
            </div>
            <div className="text-xl font-bold font-mono text-foreground">
              ${totalCredits.toFixed(2)}{" "}
              <span className="text-xs font-normal text-muted-foreground font-sans">USD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Request Live Status Banner */}
      {purchaseRequests.some((r) => r.status === "pending") && (() => {
        const pending = purchaseRequests.find((r) => r.status === "pending")!;
        return (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <Clock className="size-4 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    Active Purchase Request: {pending.planName || "Upgrade"}
                  </span>
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px] font-mono">
                    Pending Approval
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Send your Request ID on Discord or WhatsApp with payment receipt to activate your account.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-1.5 bg-background/80 rounded-lg px-2.5 py-1 border border-border text-xs font-mono font-bold">
                <span>{pending.id}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(pending.id);
                    setCopiedId(pending.id);
                    toast.success("Request ID copied!");
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  className="p-0.5 text-muted-foreground hover:text-foreground"
                  title="Copy Request ID"
                >
                  {copiedId === pending.id ? (
                    <CheckCheck className="size-3 text-emerald-400" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
              </div>
              <Button asChild size="sm" variant="outline" className="h-7 text-xs font-semibold rounded-lg">
                <Link href="/upgrade">View /upgrade</Link>
              </Button>
            </div>
          </div>
        );
      })()}

      {/* 2. Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Tier Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Your Current Tier</span>
            <Sparkles className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{activePlan.name}</span>
            <span className="text-xs font-mono text-muted-foreground">
              ${activePlan.dailyFreeCreditUSD.toFixed(2)}/day
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {activePlan.maxProjects} projects max · {activePlan.maxStorageMB} MB cloud storage
          </p>
        </div>

        {/* Daily Allowance Today */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs ms-lift">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Daily Free AI Allowance</span>
            <Clock className="size-4 text-foreground/70" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-foreground">
              ${freeCredits.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">
              / ${activePlan.dailyFreeCreditUSD.toFixed(2)} left today
            </span>
          </div>
          {/* Daily Allowance Progress Bar */}
          <div className="mt-3 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-foreground transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  (freeCredits / Math.max(0.01, activePlan.dailyFreeCreditUSD)) * 100
                )}%`,
              }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Resets every 24 hours at midnight UTC
          </p>
        </div>

        {/* Purchased Top-Ups */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs ms-lift">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Purchased Top-Up Balance</span>
            <CreditCard className="size-4 text-foreground/70" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-foreground">
              ${purchasedCredits.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">never expires</span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Drawn automatically after daily allowance is used
          </p>
        </div>
      </div>

      {/* 3. Section Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border/70 pb-px overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("tiers")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "tiers"
              ? "border-foreground text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="size-3.5 text-foreground/70" />
          <span>Account Plans (Free vs Pro)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("topup")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "topup"
              ? "border-foreground text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="size-3.5 text-foreground/70" />
          <span>Top-Up Packs & Payment Channels</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("usage")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "usage"
              ? "border-foreground text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="size-3.5 text-foreground/70" />
          <span>AI Usage Transparency</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "history"
              ? "border-foreground text-foreground font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="size-3.5 text-foreground/70" />
          <span>Transaction Audit History</span>
        </button>
      </div>

      {/* 4. Tab 1: Account Plans Comparison (Free vs Pro) */}
      {activeTab === "tiers" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-foreground">Compare Account Tiers</h2>
              <p className="text-xs text-muted-foreground">
                Account plans define your ongoing daily credit allowance and workspace storage limits.
              </p>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              Active Tier: <strong className="text-foreground">{activePlan.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {allAccountPlans.map((plan) => {
              const isCurrent = plan.id === activePlan.id;
              const isPlanPro = plan.name.toLowerCase().includes("pro");

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl border p-6 sm:p-7 flex flex-col justify-between transition-all relative ${
                    isCurrent
                      ? "border-border bg-card ring-1 ring-border/80 shadow-md"
                      : "border-border/80 bg-card shadow-xs hover:border-foreground/20"
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 right-6">
                      <span className="bg-foreground text-background font-semibold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                        Your Current Plan
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`size-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isPlanPro
                            ? "bg-secondary text-foreground border border-border"
                            : "bg-secondary/60 text-muted-foreground border border-border/60"
                        }`}
                      >
                        {isPlanPro ? <Sparkles className="size-4" /> : <Coins className="size-4" />}
                      </div>
                      <h3 className="text-xl font-bold text-foreground">{plan.name} Tier</h3>
                    </div>

                    <div className="mt-4 flex items-baseline justify-between gap-1.5 flex-wrap">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold font-mono text-foreground">
                          ${plan.dailyFreeCreditUSD.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">/ day free allowance</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-foreground bg-secondary/80 px-2 py-0.5 rounded-md border border-border">
                        {plan.priceNPR && plan.priceNPR > 0 ? `NPR ${plan.priceNPR.toLocaleString()}/mo` : "Free Tier"}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                      {isPlanPro
                        ? "For power builders, high-frequency coding, and expansive multi-page apps."
                        : "Essential allowance for students, beginners, and everyday prototypes."}
                    </p>

                    <div className="mt-6 pt-6 border-t border-border/60 space-y-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <Check className="size-4 text-emerald-400 shrink-0" />
                        <span>
                          <strong>${plan.dailyFreeCreditUSD.toFixed(2)} AI Credits</strong> refreshed every day
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check className="size-4 text-emerald-400 shrink-0" />
                        <span>
                          <strong>{plan.maxProjects} Projects</strong> concurrent workspace quota
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check className="size-4 text-emerald-400 shrink-0" />
                        <span>
                          <strong>{plan.maxStorageMB} MB Cloud Storage</strong> per user
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check className="size-4 text-emerald-400 shrink-0" />
                        <span>Independent multi-chat sessions per project</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check className="size-4 text-emerald-400 shrink-0" />
                        <span>Piston multi-language execution runtime</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-4">
                    {isCurrent ? (
                      <Button
                        disabled
                        className="w-full h-10 text-xs font-bold bg-secondary text-muted-foreground cursor-default"
                      >
                        Active Plan
                      </Button>
                    ) : (
                      <Button
                        asChild
                        className="w-full h-10 text-xs font-medium shadow-xs bg-foreground text-background hover:bg-foreground/90 transition-colors"
                      >
                        <Link href="/upgrade">
                          <span>
                            Request {plan.name} Tier
                            {plan.priceNPR && plan.priceNPR > 0 ? ` (NPR ${plan.priceNPR.toLocaleString()})` : ""}
                          </span>
                          <ArrowRight className="ml-1.5 size-3" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Tab 2: Top-Up Packs & Payment Channels */}
      {activeTab === "topup" && (
        <div className="space-y-10">
          {/* Top-up Packs */}
          <div>
            <div className="pb-4">
              <h2 className="text-lg font-bold text-foreground">One-Time Top-Up Credit Packs</h2>
              <p className="text-xs text-muted-foreground">
                Top-up credits never expire. Use them when you exceed your daily allowance or for massive codebase generation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((pack) => (
                <div
                  key={pack.id}
                  className="rounded-2xl border border-border/80 bg-card p-5 hover:border-foreground/30 transition-all shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {pack.name}
                    </span>
                    <div className="mt-2 text-2xl font-extrabold font-mono text-foreground">
                      ${pack.creditsGrantedUSD.toFixed(2)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">USD Credits</span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-emerald-400 font-mono">
                      Rs. {pack.priceNPR.toLocaleString()} NPR
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/60">
                    <Button
                      size="sm"
                      onClick={() => setSelectedTopUp(pack)}
                      className="w-full h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      Top Up Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Channels */}
          <div>
            <div className="pb-4">
              <h2 className="text-lg font-bold text-foreground">Purchase & Payment Channels</h2>
              <p className="text-xs text-muted-foreground">
                Send your payment and provide your registered email ({`you@domain.com`}) for instant credit activation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels.map((ch) => (
                <div
                  key={ch.id}
                  className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 font-bold text-xs">
                        <MessageCircle className="size-4" />
                      </div>
                      <h4 className="font-bold text-sm text-foreground">{ch.name}</h4>
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                      {ch.instructions || "Click to contact support and verify your payment receipt."}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/60">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs font-semibold border-border/80"
                    >
                      <a href={ch.contactLink} target="_blank" rel="noopener noreferrer">
                        <span>Open {ch.name}</span>
                        <ExternalLink className="size-3 ml-1.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab: AI Usage Transparency (Spend over 7/30 days) */}
      {activeTab === "usage" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">AI Usage Transparency</h2>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                  Real Spend Logs
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Exact spending recorded from your prompt transactions over time. No inflated claims or artificial savings.
              </p>
            </div>

            {/* Range Toggle */}
            <div className="inline-flex items-center rounded-xl border border-border/80 bg-muted/40 p-1 self-start sm:self-auto">
              {(["7d", "30d"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setUsageRange(r)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    usageRange === r
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "7d" ? "Last 7 Days" : "Last 30 Days"}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Spend ({usageRange})
              </span>
              <div className="mt-1 text-2xl font-bold font-mono text-foreground">
                ${usageStats.totalSpend.toFixed(3)}
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                USD calculated from tokens
              </span>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Daily Average
              </span>
              <div className="mt-1 text-2xl font-bold font-mono text-foreground">
                ${usageStats.avgSpend.toFixed(3)}
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                USD / day
              </span>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                AI Prompts
              </span>
              <div className="mt-1 text-2xl font-bold font-mono text-foreground">
                {usageStats.totalRequests.toLocaleString()}
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                Total requests executed
              </span>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Peak Day Spend
              </span>
              <div className="mt-1 text-2xl font-bold font-mono text-foreground">
                ${usageStats.peakDay?.spendUSD.toFixed(3) ?? "0.000"}
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                {usageStats.peakDay?.label || "No activity yet"}
              </span>
            </div>
          </div>

          {/* Recharts Bar Chart */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Daily Spend Pattern</h3>
                <p className="text-xs text-muted-foreground">Historical AI spend per day in USD</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-indigo-500" />
                <span className="text-[11px] font-mono text-muted-foreground">AI Cost (USD)</span>
              </div>
            </div>

            <CreditsUsageChart data={filteredUsage} />
          </div>

          {/* Honest upgrade recommendation for heavy users */}
          <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-foreground" />
                <span>Need more daily runway?</span>
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Your current tier gives you ${activePlan.dailyFreeCreditUSD.toFixed(2)}/day free. If your daily workflow requires more prompts, upgrading to Pro gives you $50.00/day allowance, 50 projects, and 2.5GB storage.
              </p>
            </div>
            {!isPro && (
              <Button
                size="sm"
                onClick={() => setActiveTab("tiers")}
                className="h-8 px-4 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 rounded-xl shrink-0 transition-colors"
              >
                <span>Compare Plans</span>
                <ArrowRight className="ml-1.5 size-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 6. Tab: Transaction History Log */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">Credit Activity History</h2>
              <p className="text-xs text-muted-foreground">
                Audit trail of daily refills, AI model token costs, top-ups, and admin adjustments.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                <Input
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Filter remarks..."
                  className="h-8 pl-8 text-xs w-48 bg-card border-border/70 rounded-xl"
                />
              </div>

              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className="h-8 rounded-xl border border-border/70 bg-card px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="daily_reset">Daily Reset</option>
                <option value="ai_usage">AI Usage</option>
                <option value="admin_grant">Admin Grant</option>
                <option value="purchase">Top-Up</option>
                <option value="plan_changed">Plan Upgrade</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/80 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-3 pl-4">Type</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Details / Reason</th>
                  <th className="p-3 pr-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      No transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 pl-4">{getTransactionBadge(tx.type)}</td>
                      <td className="p-3 font-mono font-bold">
                        <span
                          className={
                            tx.amount > 0 ? "text-emerald-400" : "text-foreground"
                          }
                        >
                          {tx.amount > 0 ? `+$${tx.amount.toFixed(4)}` : `-$${Math.abs(tx.amount).toFixed(4)}`}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{tx.reason}</td>
                      <td className="p-3 pr-4 text-right text-muted-foreground text-[11px]">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top-up Checkout Modal */}
      <Dialog open={Boolean(selectedTopUp)} onOpenChange={(open) => !open && setSelectedTopUp(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Credit Top-Up</DialogTitle>
            <DialogDescription>
              You selected the <strong className="text-foreground">{selectedTopUp?.name}</strong> pack.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Credits Added:</span>
              <span className="font-bold text-foreground font-mono">
                ${selectedTopUp?.creditsGrantedUSD.toFixed(2)} USD
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Price:</span>
              <span className="font-bold text-emerald-400 font-mono">
                Rs. {selectedTopUp?.priceNPR.toLocaleString()} NPR
              </span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Please choose a payment method below to send payment and receive your credits immediately:
          </div>

          <div className="grid grid-cols-2 gap-2">
            {channels.map((ch) => (
              <a
                key={ch.id}
                href={ch.contactLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-border/80 hover:border-indigo-500/50 hover:bg-secondary/40 text-xs transition-colors"
              >
                <span className="font-semibold text-foreground">{ch.name}</span>
                <ExternalLink className="size-3 text-muted-foreground" />
              </a>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTopUp(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
