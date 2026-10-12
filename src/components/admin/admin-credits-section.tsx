"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Coins,
  CreditCard,
  History,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

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

type AdminCreditsSectionProps = {
  users: AdminUserOption[];
  initialPlans: AdminCreditPlan[];
};

export function AdminCreditsSection({
  users,
  initialPlans,
}: AdminCreditsSectionProps) {
  const [plans, setPlans] = useState<AdminCreditPlan[]>(initialPlans);

  // System Governance Settings State
  const [dailyRequestLimit, setDailyRequestLimit] = useState<number>(15);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState<number>(2);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      setLoadingSettings(true);
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.settings?.daily_request_limit) {
            setDailyRequestLimit(Number(data.settings.daily_request_limit));
          }
          if (data.settings?.rate_limit_per_minute) {
            setRateLimitPerMinute(Number(data.settings.rate_limit_per_minute));
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoadingSettings(false);
      }
    }
    fetchSettings();
  }, []);

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyRequestLimit,
          rateLimitPerMinute,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save settings.");
      }

      toast.success("Governance settings saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  // Grant Credits Modal State
  const [grantOpen, setGrantOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string>(users[0]?.id || "");
  const [grantMode, setGrantMode] = useState<"plan" | "custom">("plan");
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id || "");
  const [customAmount, setCustomAmount] = useState<string>("10.00");
  const [grantReason, setGrantReason] = useState<string>("Payment arranged via WhatsApp");
  const [granting, setGranting] = useState(false);

  // Plan Management Modal State
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminCreditPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    priceNPR: "500",
    creditsGrantedUSD: "10.00",
    active: true,
    displayOrder: "0",
  });
  const [savingPlan, setSavingPlan] = useState(false);

  function openCreatePlan() {
    setEditingPlan(null);
    setPlanForm({
      name: "",
      priceNPR: "500",
      creditsGrantedUSD: "10.00",
      active: true,
      displayOrder: String(plans.length),
    });
    setPlanDialogOpen(true);
  }

  function openEditPlan(plan: AdminCreditPlan) {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      priceNPR: String(plan.priceNPR),
      creditsGrantedUSD: String(plan.creditsGrantedUSD),
      active: plan.active,
      displayOrder: String(plan.displayOrder),
    });
    setPlanDialogOpen(true);
  }

  async function handleGrantCredits() {
    if (!targetUserId) {
      toast.error("Please select a target user.");
      return;
    }

    let amountUSD = 0;
    if (grantMode === "plan") {
      const plan = plans.find((p) => p.id === selectedPlanId);
      if (!plan) {
        toast.error("Selected plan not found.");
        return;
      }
      amountUSD = plan.creditsGrantedUSD;
    } else {
      amountUSD = parseFloat(customAmount);
      if (isNaN(amountUSD) || amountUSD <= 0) {
        toast.error("Please enter a valid credit amount in USD.");
        return;
      }
    }

    setGranting(true);
    try {
      const res = await fetch("/api/admin/credits/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          amountUSD,
          reason: grantReason.trim() || "Manual admin credit grant",
          planId: grantMode === "plan" ? selectedPlanId : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to grant credits.");
      }

      toast.success(
        `Successfully granted +$${amountUSD.toFixed(2)} to user!`
      );
      setGrantOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to grant credits.");
    } finally {
      setGranting(false);
    }
  }

  async function handleSavePlan() {
    if (!planForm.name.trim()) {
      toast.error("Plan name is required.");
      return;
    }

    const priceNPR = parseInt(planForm.priceNPR, 10);
    const creditsGrantedUSD = parseFloat(planForm.creditsGrantedUSD);

    if (isNaN(priceNPR) || priceNPR <= 0) {
      toast.error("Please enter a valid price in NPR.");
      return;
    }

    if (isNaN(creditsGrantedUSD) || creditsGrantedUSD <= 0) {
      toast.error("Please enter valid credits granted in USD.");
      return;
    }

    setSavingPlan(true);
    try {
      const payload = {
        name: planForm.name.trim(),
        priceNPR,
        creditsGrantedUSD,
        active: planForm.active,
        displayOrder: parseInt(planForm.displayOrder, 10) || 0,
      };

      const res = editingPlan
        ? await fetch(`/api/admin/plans/${editingPlan.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/plans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save credit plan.");
      }

      const data = await res.json();
      if (editingPlan) {
        setPlans((prev) =>
          prev.map((p) => (p.id === editingPlan.id ? data.plan : p))
        );
        toast.success("Credit plan updated.");
      } else {
        setPlans((prev) => [...prev, data.plan]);
        toast.success("Credit plan created.");
      }

      setPlanDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save credit plan.");
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleDeletePlan(planId: string) {
    if (!confirm("Are you sure you want to delete this credit plan?")) return;

    try {
      const res = await fetch(`/api/admin/plans/${planId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete plan.");

      setPlans((prev) => prev.filter((p) => p.id !== planId));
      toast.success("Plan deleted.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete plan.");
    }
  }

  return (
    <div className="space-y-8">
      {/* 1. Quick Action Banner: Manual Credit Grant */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-foreground border border-border/80">
            <Coins className="size-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              Grant AI Credits to User
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Arranged payment via WhatsApp or Discord? Select a student to immediately credit their balance.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setGrantOpen(true)}
          className="h-10 px-5 font-semibold text-xs rounded-xl bg-foreground text-background hover:bg-foreground/90 gap-1.5 shadow-xs shrink-0"
        >
          <Sparkles className="size-3.5" />
          Grant Credits Now
        </Button>
      </div>

      {/* 2. Free Tier Daily Request Cap & Governance Card */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Free Tier Governance & Daily Request Limits
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure maximum requests allowed per day for free users. Paid plan buyers bypass daily limits and draw only from purchased credits.
              </p>
            </div>
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={savingSettings || loadingSettings}
            className="h-9 px-4 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-xl shrink-0"
          >
            {savingSettings ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Limits"
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Daily Requests Per User (Free Tier)
              </label>
              <Badge variant="outline" className="font-mono text-[11px] bg-background">
                {dailyRequestLimit} requests / day
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Maximum AI prompts a free member can ask per calendar day before being capped until midnight UTC.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <Input
                type="number"
                min={1}
                max={500}
                value={dailyRequestLimit}
                onChange={(e) => setDailyRequestLimit(Math.max(1, Number(e.target.value)))}
                className="h-9 text-xs font-mono w-28"
              />
              <div className="flex items-center gap-1.5">
                {[5, 10, 15, 20, 25].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDailyRequestLimit(preset)}
                    className={`px-2 py-1 text-[11px] font-mono rounded-lg border transition-all ${
                      dailyRequestLimit === preset
                        ? "bg-foreground text-background border-foreground font-bold"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Rate Limit (Burst Protection)
              </label>
              <Badge variant="outline" className="font-mono text-[11px] bg-background">
                {rateLimitPerMinute} req / minute
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Per-minute throttle to prevent rapid spam and unintended API cost surges.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <Input
                type="number"
                min={1}
                max={30}
                value={rateLimitPerMinute}
                onChange={(e) => setRateLimitPerMinute(Math.max(1, Number(e.target.value)))}
                className="h-9 text-xs font-mono w-28"
              />
              <div className="flex items-center gap-1.5">
                {[1, 2, 4, 6].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRateLimitPerMinute(preset)}
                    className={`px-2 py-1 text-[11px] font-mono rounded-lg border transition-all ${
                      rateLimitPerMinute === preset
                        ? "bg-foreground text-background border-foreground font-bold"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {preset}/min
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Policy Notice Box */}
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.04] p-4 text-xs text-muted-foreground leading-relaxed flex items-start gap-3">
          <ShieldCheck className="size-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-foreground">Paid vs Free Tier Rule Enforcement:</div>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
              <li><strong className="text-foreground">Free Tier:</strong> Sees visual $20.00 daily balance, resetting daily at 00:00 UTC. Capped by the daily request limit above.</li>
              <li><strong className="text-foreground">Paid Plans:</strong> Only give purchased credits. Daily free credits are <strong>NEVER</strong> added to paid accounts while active. Paid users bypass the daily request limit.</li>
              <li><strong className="text-foreground">Automatic Reversion:</strong> Once a paid user consumes all purchased credits (balance reaches $0), their account reverts to the free tier and receives the daily $20.00 allowance on the next day.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3. Credit Plans Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Top-Up Credit Plans</h3>
            <p className="text-xs text-muted-foreground">
              Manage the pricing tiers shown on the student /credits page.
            </p>
          </div>

          <Button
            onClick={openCreatePlan}
            className="h-9 font-semibold text-xs bg-foreground text-background hover:bg-foreground/90 gap-1.5 rounded-xl"
          >
            <Plus className="size-3.5" />
            Add Plan
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-16">Order</TableHead>
                <TableHead>Plan Name</TableHead>
                <TableHead>Price (NPR)</TableHead>
                <TableHead>Credits Granted (USD)</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                    No credit plans yet. Click "Add Plan" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((p) => (
                  <TableRow key={p.id} className="text-xs">
                    <TableCell className="font-mono text-muted-foreground">{p.displayOrder}</TableCell>
                    <TableCell className="font-semibold text-foreground">{p.name}</TableCell>
                    <TableCell className="font-mono font-bold text-foreground">
                      {p.priceNPR.toLocaleString()} NPR
                    </TableCell>
                    <TableCell className="font-mono text-emerald-500 font-bold">
                      +${p.creditsGrantedUSD.toFixed(2)} USD
                    </TableCell>
                    <TableCell>
                      {p.active ? (
                        <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEditPlan(p)}
                          title="Edit plan"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeletePlan(p.id)}
                          title="Delete plan"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Grant Credits Dialog */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent className="max-w-md rounded-3xl border-border/80 bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Grant AI Credits to Student
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Every grant creates a permanent audit transaction logged with your admin session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* User Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Select User</Label>
              <Select value={targetUserId} onValueChange={setTargetUserId}>
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="Choose user..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.name || "User"} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grant Mode Switcher */}
            <div className="flex rounded-xl border border-border bg-secondary/50 p-1">
              <button
                type="button"
                onClick={() => setGrantMode("plan")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  grantMode === "plan" ? "bg-foreground text-background shadow-xs" : "text-muted-foreground"
                }`}
              >
                Choose Existing Plan
              </button>
              <button
                type="button"
                onClick={() => setGrantMode("custom")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  grantMode === "custom" ? "bg-foreground text-background shadow-xs" : "text-muted-foreground"
                }`}
              >
                Custom USD Amount
              </button>
            </div>

            {grantMode === "plan" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Credit Plan</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger className="h-10 text-xs rounded-xl">
                    <SelectValue placeholder="Select plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name} (+${p.creditsGrantedUSD.toFixed(2)} USD — {p.priceNPR} NPR)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">Amount in USD ($)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="e.g. 15.00"
                  className="h-10 text-xs rounded-xl font-mono"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Transaction Reason / Note</Label>
              <Input
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                placeholder="e.g. Arranged via WhatsApp payment eSewa #8812"
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setGrantOpen(false)}
              className="h-9 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGrantCredits}
              disabled={granting}
              className="h-9 text-xs font-semibold rounded-xl bg-foreground text-background hover:bg-foreground/90"
            >
              {granting ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              Confirm Credit Grant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Add / Edit Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl border-border/80 bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {editingPlan ? `Edit ${editingPlan.name}` : "Create Credit Plan"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure price in NPR and granted USD credits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Plan Name</Label>
              <Input
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                placeholder="e.g. Studio Pro Pack"
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Price in NPR</Label>
                <Input
                  type="number"
                  value={planForm.priceNPR}
                  onChange={(e) => setPlanForm({ ...planForm, priceNPR: e.target.value })}
                  placeholder="500"
                  className="h-10 text-xs rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Credits Granted (USD)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={planForm.creditsGrantedUSD}
                  onChange={(e) => setPlanForm({ ...planForm, creditsGrantedUSD: e.target.value })}
                  placeholder="10.00"
                  className="h-10 text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Display Order</Label>
                <Input
                  type="number"
                  value={planForm.displayOrder}
                  onChange={(e) => setPlanForm({ ...planForm, displayOrder: e.target.value })}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="flex items-center justify-between rounded-xl border border-border p-2">
                  <span className="text-xs font-medium">Active</span>
                  <Switch
                    checked={planForm.active}
                    onCheckedChange={(checked) => setPlanForm({ ...planForm, active: checked })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setPlanDialogOpen(false)}
              className="h-9 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePlan}
              disabled={savingPlan}
              className="h-9 text-xs font-semibold rounded-xl bg-foreground text-background hover:bg-foreground/90"
            >
              {savingPlan ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              {editingPlan ? "Save Plan" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
