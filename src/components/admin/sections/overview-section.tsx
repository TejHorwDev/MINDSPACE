"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Coins,
  Cpu,
  Flag,
  FolderGit2,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface OverviewStats {
  summary: {
    totalUsers: number;
    totalProjects: number;
    totalAiSpendUSD: number;
    activeUsersInRange: number;
    pendingReports: number;
    totalPlans: number;
  };
  conversion?: {
    today: {
      hitZero: number;
      converted: number;
      ratePercent: number;
    };
    week: {
      hitZero: number;
      converted: number;
      ratePercent: number;
    };
  };
  timeSeries: Array<{
    date: string;
    label: string;
    signups: number;
    projects: number;
    aiSpend: number;
    activeUsers: number;
  }>;
  days: number;
}

interface OverviewSectionProps {
  onNavigateSection: (section: string) => void;
}

export function OverviewSection({ onNavigateSection }: OverviewSectionProps) {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async (selectedRange = range) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?range=${selectedRange}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch overview stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(range);
  }, [range]);

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Header & Date Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Overview Dashboard
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time platform activity, student growth, credit expenditure, and usage metrics.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-xl border border-border/80 bg-muted/40 p-1 shadow-2xs">
            {(["7d", "30d", "90d"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  range === r
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "7d" ? "Last 7 Days" : r === "30d" ? "Last 30 Days" : "Last 90 Days"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fetchStats(range)}
            disabled={loading}
            className="flex size-9 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground hover:text-foreground transition-all shadow-2xs"
            title="Refresh stats"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 1. Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Users */}
        <div
          onClick={() => onNavigateSection("users")}
          className="group relative rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm hover:border-indigo-500/40 hover:bg-card/90 transition-all cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Total Users
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Users className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {stats?.summary.totalUsers.toLocaleString() ?? 0}
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground group-hover:text-indigo-400 transition-colors flex items-center gap-1 mt-1">
            <span>Manage accounts</span> &rarr;
          </span>
        </div>

        {/* Total Projects */}
        <div
          onClick={() => onNavigateSection("projects")}
          className="group relative rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm hover:border-emerald-500/40 hover:bg-card/90 transition-all cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Projects
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <FolderGit2 className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {stats?.summary.totalProjects.toLocaleString() ?? 0}
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground group-hover:text-emerald-400 transition-colors flex items-center gap-1 mt-1">
            <span>View all projects</span> &rarr;
          </span>
        </div>

        {/* Total AI Credit Spend */}
        <div
          onClick={() => onNavigateSection("credits")}
          className="group relative rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm hover:border-amber-500/40 hover:bg-card/90 transition-all cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              AI Spend
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Coins className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <span className="text-2xl font-bold tracking-tight text-foreground">
                ${stats?.summary.totalAiSpendUSD.toFixed(2) ?? "0.00"}
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground group-hover:text-amber-400 transition-colors flex items-center gap-1 mt-1">
            <span>Credit logs & grants</span> &rarr;
          </span>
        </div>

        {/* Active Users in Period */}
        <div className="relative rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Active ({range})
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
              <Activity className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <Skeleton className="h-7 w-14" />
            ) : (
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {stats?.summary.activeUsersInRange ?? 0}
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            Engaged students
          </span>
        </div>

        {/* Account Plans */}
        <div
          onClick={() => onNavigateSection("account-plans")}
          className="group relative rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm hover:border-border hover:bg-card/90 transition-all cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Account Plans
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-secondary text-foreground">
              <Sparkles className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {stats?.summary.totalPlans ?? 0}
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1 mt-1">
            <span>Free vs Pro tiers</span> &rarr;
          </span>
        </div>

        {/* Pending Reports */}
        <div
          onClick={() => onNavigateSection("reports")}
          className="group relative rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm hover:border-rose-500/40 hover:bg-card/90 transition-all cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Pending Reports
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
              <Flag className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <span
                className={`text-2xl font-bold tracking-tight ${
                  (stats?.summary.pendingReports ?? 0) > 0 ? "text-rose-400" : "text-foreground"
                }`}
              >
                {stats?.summary.pendingReports ?? 0}
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground group-hover:text-rose-400 transition-colors flex items-center gap-1 mt-1">
            <span>Moderate flagged sites</span> &rarr;
          </span>
        </div>
      </div>

      {/* 2. Zero-Credit Conversion Funnel (Real Transaction Data) */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-secondary text-foreground border border-border/80">
              <Target className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Zero-Credit Conversion Funnel</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Real Transaction Data
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Tracks users who reached $0 credit and subsequently converted (purchased top-up or upgraded to Pro).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateSection("credits")}
            className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold self-start sm:self-auto"
          >
            <span>View credit transactions</span>
            <ArrowUpRight className="size-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Today's Conversion */}
          <div className="rounded-xl border border-border/70 bg-secondary/30 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Today&apos;s Conversion</span>
              <span className="text-[11px] font-mono text-muted-foreground">00:00 UTC &rarr; Now</span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {stats?.conversion?.today.ratePercent ?? 0}%
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Conversion Rate
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono font-semibold text-foreground">
                  {stats?.conversion?.today.converted ?? 0}{" "}
                  <span className="text-muted-foreground font-normal">/</span>{" "}
                  {stats?.conversion?.today.hitZero ?? 0}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Converted / Hit $0
                </div>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, stats?.conversion?.today.ratePercent ?? 0))}%`,
                }}
              />
            </div>
          </div>

          {/* Past 7 Days Conversion */}
          <div className="rounded-xl border border-border/70 bg-secondary/30 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Past 7 Days Conversion</span>
              <span className="text-[11px] font-mono text-muted-foreground">Trailing 7d</span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {stats?.conversion?.week.ratePercent ?? 0}%
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Conversion Rate
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono font-semibold text-foreground">
                  {stats?.conversion?.week.converted ?? 0}{" "}
                  <span className="text-muted-foreground font-normal">/</span>{" "}
                  {stats?.conversion?.week.hitZero ?? 0}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Converted / Hit $0
                </div>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="bg-foreground h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, stats?.conversion?.week.ratePercent ?? 0))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Real Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Daily Active Users */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Daily Active Users</h3>
              <p className="text-xs text-muted-foreground">Unique active students over time</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
              <TrendingUp className="size-3.5" />
              <span>Engagement</span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {loading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats?.timeSeries || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="dauGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" />
                  <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="activeUsers"
                    name="Active Users"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#dauGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Signups Over Time */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">New Signups</h3>
              <p className="text-xs text-muted-foreground">Account creations over time</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Users className="size-3.5" />
              <span>Growth</span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {loading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats?.timeSeries || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" />
                  <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="signups"
                    name="New Signups"
                    fill="#a855f7"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: AI Credit Spend Over Time */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">AI Credit Spend ($USD)</h3>
              <p className="text-xs text-muted-foreground">Dynamic token usage drain per day</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <Coins className="size-3.5" />
              <span>Token Burn</span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {loading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats?.timeSeries || []}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" />
                  <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                    formatter={(val: any) => [`$${val}`, "AI Spend"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="aiSpend"
                    name="AI Spend ($)"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#spendGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 4: Projects Created Over Time */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Projects Created</h3>
              <p className="text-xs text-muted-foreground">New project creations over time</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
              <FolderGit2 className="size-3.5" />
              <span>Creations</span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {loading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats?.timeSeries || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" />
                  <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="projects"
                    name="Projects Created"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={{ fill: "#06b6d4", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
