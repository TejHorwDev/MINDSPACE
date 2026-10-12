"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Edit2,
  HardDrive,
  Layers,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AccountPlanItem {
  id: string;
  name: string;
  priceNPR: number;
  dailyFreeCreditUSD: number;
  maxProjects: number;
  maxStorageMB: number;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
  };
}

interface AccountPlansSectionProps {
  userRole?: string;
}

export function AccountPlansSection({ userRole = "admin" }: AccountPlansSectionProps) {
  const isModerator = userRole === "moderator";

  const [plans, setPlans] = useState<AccountPlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create / Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AccountPlanItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    priceNPR: 0,
    dailyFreeCreditUSD: 20.0,
    maxProjects: 5,
    maxStorageMB: 50,
    isDefault: false,
    active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal
  const [planToDelete, setPlanToDelete] = useState<AccountPlanItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/account-plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch {
      toast.error("Failed to load account plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      priceNPR: 0,
      dailyFreeCreditUSD: 20.0,
      maxProjects: 5,
      maxStorageMB: 50,
      isDefault: false,
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: AccountPlanItem) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      priceNPR: plan.priceNPR ?? 0,
      dailyFreeCreditUSD: plan.dailyFreeCreditUSD,
      maxProjects: plan.maxProjects,
      maxStorageMB: plan.maxStorageMB,
      isDefault: plan.isDefault,
      active: plan.active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Plan name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingPlan
        ? `/api/admin/account-plans/${editingPlan.id}`
        : "/api/admin/account-plans";
      const method = editingPlan ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          priceNPR: Math.max(0, parseInt(String(formData.priceNPR), 10) || 0),
          dailyFreeCreditUSD: Number(formData.dailyFreeCreditUSD),
          maxProjects: Number(formData.maxProjects),
          maxStorageMB: Number(formData.maxStorageMB),
          isDefault: Boolean(formData.isDefault),
          active: Boolean(formData.active),
        }),
      });

      if (res.ok) {
        toast.success(editingPlan ? "Account plan updated" : "Account plan created");
        setIsModalOpen(false);
        fetchPlans();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save plan");
      }
    } catch {
      toast.error("Failed to save plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/account-plans/${planToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Account plan deleted");
        setPlanToDelete(null);
        fetchPlans();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete plan");
      }
    } catch {
      toast.error("Failed to delete plan");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetDefault = async (plan: AccountPlanItem) => {
    if (plan.isDefault) return;
    try {
      const res = await fetch(`/api/admin/account-plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        toast.success(`"${plan.name}" is now the default plan for new signups`);
        fetchPlans();
      }
    } catch {
      toast.error("Failed to set default plan");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="size-5 text-foreground" />
            <span>Account Plans (Free vs Paid Tiers)</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Configure ongoing account tiers. Sets daily free credit allowances, project limits, and
            storage quotas. Every user sits in exactly one Account Plan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isModerator && (
            <Button
              onClick={handleOpenCreate}
              size="sm"
              className="h-9 gap-1.5 text-xs bg-foreground text-background hover:bg-foreground/90 font-medium shadow-xs"
            >
              <Plus className="size-3.5" />
              <span>Create New Plan</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchPlans}
            disabled={loading}
            className="h-9 gap-1.5 text-xs shadow-2xs"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))
        ) : plans.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-border/80 bg-card p-8 text-center text-muted-foreground">
            No account plans configured yet.
          </div>
        ) : (
          plans.map((p) => {
            const isPro = p.name.toLowerCase().includes("pro");

            return (
              <div
                key={p.id}
                className={`relative rounded-2xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                  p.isDefault
                    ? "border-border bg-card ring-1 ring-border/80"
                    : "border-border/80 bg-card hover:border-border"
                }`}
              >
                <div>
                  {/* Top Badges & Name */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-foreground">{p.name}</h3>
                        {p.isDefault && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-foreground border border-border">
                            <Check className="size-2.5" />
                            Default Signup Tier
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {p._count?.users ?? 0} active users assigned
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                        p.active
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.active ? "Active" : "Disabled"}
                    </span>
                  </div>

                  {/* Pricing / Allowance Callout Grid */}
                  <div className="grid grid-cols-2 gap-2.5 mb-4">
                    <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                        Subscription Price
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-lg font-bold font-mono text-foreground">
                          {p.priceNPR > 0 ? `NPR ${p.priceNPR.toLocaleString()}` : "Free"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                        Daily AI Reset
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-lg font-bold font-mono text-foreground">
                          ${p.dailyFreeCreditUSD.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">/day</span>
                      </div>
                    </div>
                  </div>

                  {/* Quota Limits List */}
                  <div className="space-y-2 text-xs mb-5">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Layers className="size-3.5 text-indigo-400" />
                        <span>Max Projects Allowed</span>
                      </span>
                      <span className="font-mono font-bold text-foreground">{p.maxProjects}</span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <HardDrive className="size-3.5 text-cyan-400" />
                        <span>Storage Quota</span>
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {p.maxStorageMB} MB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                {!isModerator && (
                  <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    {!p.isDefault ? (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(p)}
                        className="text-[11px] text-muted-foreground hover:text-foreground font-medium transition-colors"
                      >
                        Set as default
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Automatic for new users
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(p)}
                        className="size-7 text-muted-foreground hover:text-foreground"
                        title="Edit plan limits"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>

                      {plans.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPlanToDelete(p)}
                          className="size-7 text-muted-foreground hover:text-destructive"
                          title="Delete plan"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Plan Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-foreground" />
              <span>{editingPlan ? "Edit Account Plan" : "Create New Account Plan"}</span>
            </DialogTitle>
            <DialogDescription>
              Define the ongoing daily allowance and capacity limits for this tier.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground">Plan Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Free, Pro, Enterprise"
                required
                className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 shadow-2xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">
                Subscription Tier Price (NPR)
              </label>
              <div className="relative mt-1">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.priceNPR}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priceNPR: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                  placeholder="e.g. 1500 (Set to 0 for Free tier)"
                  required
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground/20 shadow-2xs"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Set to 0 for free default tier. Set to 1500 (or custom price) for Pro tier upgrade in Nepalese Rupees.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">
                  Daily Free Credit ($USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.dailyFreeCreditUSD}
                  onChange={(e) =>
                    setFormData({ ...formData, dailyFreeCreditUSD: parseFloat(e.target.value) || 0 })
                  }
                  required
                  className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground/20 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Max Projects</label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxProjects}
                  onChange={(e) =>
                    setFormData({ ...formData, maxProjects: parseInt(e.target.value, 10) || 1 })
                  }
                  required
                  className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground/20 shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Storage Quota (MB)</label>
              <input
                type="number"
                min="1"
                value={formData.maxStorageMB}
                onChange={(e) =>
                  setFormData({ ...formData, maxStorageMB: parseInt(e.target.value, 10) || 1 })
                }
                required
                className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground/20 shadow-2xs"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-border/60">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="size-4 rounded border-border accent-foreground"
                />
                <span className="text-xs font-medium text-foreground">
                  Default plan for new signups
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="size-4 rounded border-border accent-foreground"
                />
                <span className="text-xs font-medium text-foreground">Active plan</span>
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-foreground text-background hover:bg-foreground/90 font-medium transition-colors"
              >
                {isSubmitting ? "Saving..." : editingPlan ? "Save Changes" : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Plan Confirmation Dialog */}
      <Dialog open={Boolean(planToDelete)} onOpenChange={(open) => !open && setPlanToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <span>Confirm Delete Plan</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the “{planToDelete?.name}” account plan?
              {planToDelete?._count?.users ? (
                <span className="block mt-2 font-semibold text-foreground">
                  {planToDelete._count.users} user(s) currently on this plan will be automatically
                  reassigned to the fallback default plan.
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setPlanToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePlan}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Permanently Delete Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
