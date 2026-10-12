"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Coins,
  CreditCard,
  History,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminChannelsSection, type AdminContactChannel } from "@/components/admin/admin-channels-section";

export type AdminUserOption = {
  id: string;
  name: string | null;
  email: string;
};

export type AdminCreditPlan = {
  id: string;
  name: string;
  priceNPR: number;
  creditsGrantedUSD: number;
  active: boolean;
  displayOrder: number;
};

interface TransactionItem {
  id: string;
  amount: number;
  type: string;
  reason: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface CreditsConsolidatedSectionProps {
  users: AdminUserOption[];
  initialPlans: AdminCreditPlan[];
  initialChannels: AdminContactChannel[];
  userRole?: string;
}

export function CreditsConsolidatedSection({
  users,
  initialPlans,
  initialChannels,
  userRole = "admin",
}: CreditsConsolidatedSectionProps) {
  const isModerator = userRole === "moderator";

  const [activeTab, setActiveTab] = useState<"plans" | "grants" | "channels" | "logs">("plans");

  // Plans State
  const [plans, setPlans] = useState<AdminCreditPlan[]>(initialPlans);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminCreditPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    priceNPR: 500,
    creditsGrantedUSD: 10.0,
    active: true,
  });
  const [planSubmitting, setPlanSubmitting] = useState(false);

  // Manual Grant State
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [grantAmountUSD, setGrantAmountUSD] = useState<string>("10.00");
  const [grantReason, setGrantReason] = useState<string>("Manual credit top-up");
  const [selectedPresetPlanId, setSelectedPresetPlanId] = useState<string>("");
  const [isGranting, setIsGranting] = useState(false);

  // Transactions Log State
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txTypeFilter, setTxTypeFilter] = useState("all");
  const [txSearch, setTxSearch] = useState("");

  const fetchTransactions = async () => {
    setTxLoading(true);
    try {
      const params = new URLSearchParams({
        type: txTypeFilter,
        search: txSearch,
        limit: "100",
      });
      const res = await fetch(`/api/admin/credits/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch {
      toast.error("Failed to load credit transaction log");
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "logs") {
      fetchTransactions();
    }
  }, [activeTab, txTypeFilter, txSearch]);

  // Plan CRUD
  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({ name: "", priceNPR: 500, creditsGrantedUSD: 10.0, active: true });
    setPlanDialogOpen(true);
  };

  const handleOpenEditPlan = (plan: AdminCreditPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      priceNPR: plan.priceNPR,
      creditsGrantedUSD: plan.creditsGrantedUSD,
      active: plan.active,
    });
    setPlanDialogOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanSubmitting(true);
    try {
      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : "/api/admin/plans";
      const method = editingPlan ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planForm),
      });

      if (res.ok) {
        toast.success(editingPlan ? "Credit plan updated" : "Credit plan created");
        setPlanDialogOpen(false);
        const refRes = await fetch("/api/admin/plans");
        if (refRes.ok) {
          const data = await refRes.json();
          setPlans(data.plans || []);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save credit plan");
      }
    } catch {
      toast.error("Failed to save plan");
    } finally {
      setPlanSubmitting(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/plans/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Credit plan deleted");
        setPlans((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      toast.error("Failed to delete plan");
    }
  };

  // Execute Manual Grant
  const handleExecuteGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) {
      toast.error("Please select a target user.");
      return;
    }
    const parsedAmount = parseFloat(grantAmountUSD);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid credit amount.");
      return;
    }

    setIsGranting(true);
    try {
      const res = await fetch("/api/admin/credits/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          amountUSD: parsedAmount,
          reason: grantReason.trim() || "Manual credit grant",
          planId: selectedPresetPlanId || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Granted $${parsedAmount.toFixed(2)} to ${data.user.email}! Balance: $${data.user.purchasedCreditsBalance.toFixed(2)}`
        );
        setGrantReason("Manual credit top-up");
        setSelectedPresetPlanId("");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to grant credits.");
      }
    } catch {
      toast.error("Failed to grant credits.");
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header & Sub-Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Coins className="size-5 text-amber-500" />
            <span>Credits & Top-Up Governance</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage top-up pricing packs, execute manual grants, configure purchase channels, and view transaction audits.
          </p>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="inline-flex items-center rounded-xl border border-border/80 bg-muted/40 p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("plans")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "plans"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="size-3.5" />
            <span>Top-Up Packs</span>
          </button>

          {!isModerator && (
            <button
              type="button"
              onClick={() => setActiveTab("grants")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "grants"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="size-3.5" />
              <span>Manual Grants</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("channels")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "channels"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle className="size-3.5" />
            <span>Purchase Channels</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "logs"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="size-3.5" />
            <span>Transaction Log</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Credit Plans (Top-Up Purchases) */}
      {activeTab === "plans" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Top-Up Credit Packs</h3>
              <p className="text-xs text-muted-foreground">
                One-off credit top-ups that users purchase when their daily tier allowance is exhausted.
              </p>
            </div>
            {!isModerator && (
              <Button
                onClick={handleOpenCreatePlan}
                size="sm"
                className="h-8 gap-1 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                <Plus className="size-3.5" />
                <span>New Top-Up Pack</span>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground text-sm">{p.name}</h4>
                    <Badge variant={p.active ? "default" : "secondary"} className="text-[10px]">
                      {p.active ? "Active" : "Hidden"}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-foreground">
                      ${p.creditsGrantedUSD.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">credits</span>
                  </div>
                  <p className="text-xs font-semibold text-amber-500 mt-0.5">
                    Price: {p.priceNPR.toLocaleString()} NPR
                  </p>
                </div>

                {!isModerator && (
                  <div className="flex items-center justify-end gap-1 pt-3 border-t border-border/60">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditPlan(p)}
                      className="h-7 text-xs px-2"
                    >
                      <Pencil className="size-3 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePlan(p.id)}
                      className="size-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Manual Grants */}
      {activeTab === "grants" && !isModerator && (
        <div className="max-w-xl rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-amber-500" />
              <span>Grant Credits to Student</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add purchased credits directly to any student account upon verified payment or scholarship.
            </p>
          </div>

          <form onSubmit={handleExecuteGrant} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Select Student Account</Label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                required
                className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
              >
                <option value="">Choose a user...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || "No Name"} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Or Pick a Top-Up Preset</Label>
              <select
                value={selectedPresetPlanId}
                onChange={(e) => {
                  const pid = e.target.value;
                  setSelectedPresetPlanId(pid);
                  const matched = plans.find((p) => p.id === pid);
                  if (matched) {
                    setGrantAmountUSD(matched.creditsGrantedUSD.toString());
                    setGrantReason(`Purchased ${matched.name} (${matched.priceNPR} NPR)`);
                  }
                }}
                className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
              >
                <option value="">Custom amount (no preset)</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.creditsGrantedUSD.toFixed(2)} USD / {p.priceNPR} NPR)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Credit Amount ($USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={grantAmountUSD}
                  onChange={(e) => setGrantAmountUSD(e.target.value)}
                  required
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Audit Reason</Label>
                <Input
                  type="text"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  required
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isGranting}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
            >
              {isGranting ? "Granting..." : "Execute Credit Grant"}
            </Button>
          </form>
        </div>
      )}

      {/* Sub-Tab 3: Purchase Channels */}
      {activeTab === "channels" && (
        <AdminChannelsSection initialChannels={initialChannels} />
      )}

      {/* Sub-Tab 4: Transaction Log */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Audit Transaction Log</h3>
              <p className="text-xs text-muted-foreground">
                Complete record of every credit deduction, daily reset, admin grant, and purchase.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="ai_usage">AI Token Usage</option>
                <option value="admin_grant">Admin Grants</option>
                <option value="daily_reset">Daily Resets</option>
                <option value="purchase">Purchases</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchTransactions}
                disabled={txLoading}
                className="h-8 text-xs gap-1"
              >
                <RefreshCw className={`size-3 ${txLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/80 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Reason / Details</th>
                    <th className="p-3">Amount ($)</th>
                    <th className="p-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {txLoading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        Loading audit log...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No transactions recorded.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/30">
                        <td className="p-3">
                          <span className="font-semibold text-foreground block">
                            {tx.user?.name || "Student"}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {tx.user?.email}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                              tx.type === "admin_grant"
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                : tx.type === "ai_usage"
                                ? "bg-secondary text-foreground border border-border/80"
                                : tx.type === "daily_reset"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="p-3 text-foreground">{tx.reason}</td>
                        <td
                          className={`p-3 font-mono font-bold ${
                            tx.amount >= 0 ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {tx.amount >= 0 ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(4)}`}
                        </td>
                        <td className="p-3 text-right text-muted-foreground text-[11px] font-mono">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Plan Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Edit Top-Up Pack" : "Create Top-Up Pack"}
            </DialogTitle>
            <DialogDescription>
              Set pricing in Nepalese Rupees (NPR) and credits granted in USD.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePlan} className="space-y-4">
            <div>
              <Label className="text-xs">Pack Name</Label>
              <Input
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                placeholder="e.g. Starter Boost"
                required
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Price (NPR)</Label>
                <Input
                  type="number"
                  min="1"
                  value={planForm.priceNPR}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, priceNPR: parseInt(e.target.value, 10) || 100 })
                  }
                  required
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs">Credits Granted ($USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={planForm.creditsGrantedUSD}
                  onChange={(e) =>
                    setPlanForm({
                      ...planForm,
                      creditsGrantedUSD: parseFloat(e.target.value) || 1.0,
                    })
                  }
                  required
                  className="mt-1 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Switch
                checked={planForm.active}
                onCheckedChange={(checked) => setPlanForm({ ...planForm, active: checked })}
              />
              <Label className="text-xs">Active & Available for Purchase</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPlanDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={planSubmitting}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {planSubmitting ? "Saving..." : "Save Pack"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
