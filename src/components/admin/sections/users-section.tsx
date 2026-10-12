"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Coins,
  ExternalLink,
  FolderGit2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Trash2,
  User as UserIcon,
  X,
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

interface AccountPlan {
  id: string;
  name: string;
  dailyFreeCreditUSD: number;
  maxProjects: number;
  maxStorageMB: number;
}

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  planId: string | null;
  freeCreditsBalance: number;
  purchasedCreditsBalance: number;
  createdAt: string;
  accountPlan?: AccountPlan | null;
  _count?: {
    projects: number;
    creditTransactions: number;
  };
}

interface UserDetail extends UserItem {
  projects: Array<{
    id: string;
    name: string;
    isPublished: boolean;
    publicSlug: string | null;
    createdAt: string;
    updatedAt: string;
    _count: { files: number; aiChatMessages: number };
  }>;
  creditTransactions: Array<{
    id: string;
    amount: number;
    type: string;
    reason: string;
    createdAt: string;
  }>;
}

interface UsersSectionProps {
  currentUserId: string;
  userRole?: string;
  onOpenPlan?: () => void;
}

export function UsersSection({
  currentUserId,
  userRole = "admin",
}: UsersSectionProps) {
  const isModerator = userRole === "moderator";

  const [users, setUsers] = useState<UserItem[]>([]);
  const [plans, setPlans] = useState<Array<{ id: string; name: string; dailyFreeCreditUSD?: number }>>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkTargetValue, setBulkTargetValue] = useState("");
  const [isBulkExecuting, setIsBulkExecuting] = useState(false);

  // Detail Modal
  const [detailUser, setDetailUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<AccountPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  // Single Delete Confirmation
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        role: roleFilter,
        planId: planFilter,
        sortBy,
        sortOrder,
      });
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        if (data.plans) setPlans(data.plans);
      }
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, roleFilter, planFilter, sortBy, sortOrder]);

  // Open User Detail
  const handleOpenDetail = async (userId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setDetailUser(data.user);
        setAvailablePlans(data.availablePlans || []);
        setSelectedPlanId(data.user.planId || data.user.accountPlan?.id || "");
      }
    } catch {
      toast.error("Failed to load user details");
    } finally {
      setDetailLoading(false);
    }
  };

  // Change Plan in Detail Modal
  const handleUpdatePlan = async () => {
    if (!detailUser || !selectedPlanId) return;
    setIsUpdatingPlan(true);
    try {
      const res = await fetch(`/api/admin/users/${detailUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlanId }),
      });
      if (res.ok) {
        const data = await res.json();
        setDetailUser((prev) => (prev ? { ...prev, ...data.user } : null));
        setUsers((prev) =>
          prev.map((u) => (u.id === detailUser.id ? { ...u, ...data.user } : u))
        );
        toast.success(`Account plan updated to ${data.user.accountPlan?.name || "selected plan"}`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update account plan");
      }
    } catch {
      toast.error("Failed to update plan");
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  // Quick switch plan from table row
  const handleQuickSwitchPlan = async (userId: string, targetPlanId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: targetPlanId }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, ...data.user } : u))
        );
        toast.success(`Account plan changed to ${data.user.accountPlan?.name || "plan"}`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to change plan");
      }
    } catch {
      toast.error("Network error while changing plan");
    }
  };

  // Bulk Actions
  const handleExecuteBulk = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    setIsBulkExecuting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: bulkAction,
          userIds: selectedIds,
          targetValue: bulkTargetValue,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Bulk action completed");
        setSelectedIds([]);
        setBulkAction(null);
        setBulkTargetValue("");
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error(err.error || "Bulk action failed");
      }
    } catch {
      toast.error("Bulk action failed");
    } finally {
      setIsBulkExecuting(false);
    }
  };

  // Delete Individual User
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`Deleted ${userToDelete.email}`);
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
        setUserToDelete(null);
        if (detailUser?.id === userToDelete.id) setDetailUser(null);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete user");
      }
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u.id));
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Users Management
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Search, filter, bulk update roles and account plans, or inspect individual student details.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
            className="h-9 gap-1.5 text-xs shadow-2xs"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-border/80 bg-card/60 p-3 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="h-9 w-full rounded-xl border border-border/70 bg-background/80 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter by role"
          className="h-9 rounded-xl border border-border/70 bg-background/80 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs cursor-pointer"
        >
          <option value="all">All Roles</option>
          <option value="student">Students</option>
          <option value="moderator">Moderators</option>
          <option value="admin">Admins</option>
        </select>

        {/* Quick Plan Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPlanFilter("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              planFilter === "all"
                ? "bg-foreground text-background font-bold shadow-xs"
                : "bg-secondary text-muted-foreground hover:text-foreground border border-border/60"
            }`}
          >
            All Tiers
          </button>
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlanFilter(p.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                planFilter === p.id
                  ? "bg-foreground text-background font-semibold shadow-xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground border border-border/60"
              }`}
            >
              {p.name} {p.dailyFreeCreditUSD ? `($${p.dailyFreeCreditUSD}/d)` : ""}
            </button>
          ))}
        </div>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="Sort users by"
          className="h-9 rounded-xl border border-border/70 bg-background/80 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs cursor-pointer"
        >
          <option value="createdAt">Date Joined</option>
          <option value="name">Name</option>
          <option value="email">Email</option>
          <option value="credits">Credit Balance</option>
        </select>

        <button
          type="button"
          onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
          className="flex h-9 items-center gap-1 rounded-xl border border-border/70 bg-background/80 px-2.5 text-xs text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer"
          title="Toggle sort direction"
        >
          <ArrowUpDown className="size-3.5" />
          <span className="text-[10px] uppercase font-mono">{sortOrder}</span>
        </button>
      </div>

      {/* Bulk Actions Bar (Shown when items are selected) */}
      {selectedIds.length > 0 && !isModerator && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-400 animate-in fade-in-0 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{selectedIds.length} user(s) selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Change Plan */}
            <select
              value={bulkAction === "change_plan" ? bulkTargetValue : ""}
              onChange={(e) => {
                if (e.target.value) {
                  setBulkAction("change_plan");
                  setBulkTargetValue(e.target.value);
                }
              }}
              className="h-8 rounded-lg border border-indigo-500/40 bg-background px-2 text-xs text-foreground focus:outline-none cursor-pointer"
            >
              <option value="">Move to Plan...</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Change Role */}
            <select
              value={bulkAction === "change_role" ? bulkTargetValue : ""}
              onChange={(e) => {
                if (e.target.value) {
                  setBulkAction("change_role");
                  setBulkTargetValue(e.target.value);
                }
              }}
              className="h-8 rounded-lg border border-indigo-500/40 bg-background px-2 text-xs text-foreground focus:outline-none cursor-pointer"
            >
              <option value="">Change Role...</option>
              <option value="student">Student</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>

            {/* Bulk Delete */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setBulkAction("delete");
                setBulkTargetValue("");
              }}
              className="h-8 text-xs gap-1"
            >
              <Trash2 className="size-3" />
              <span>Delete</span>
            </Button>

            {bulkAction && (
              <Button
                variant="default"
                size="sm"
                onClick={handleExecuteBulk}
                disabled={isBulkExecuting}
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 font-semibold"
              >
                {isBulkExecuting ? "Applying..." : "Confirm Bulk Action"}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedIds([]);
                setBulkAction(null);
              }}
              className="h-8 text-xs text-muted-foreground"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/80 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedIds.length === users.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all users"
                    className="size-3.5 rounded border-border cursor-pointer accent-indigo-500"
                  />
                </th>
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="p-3">Account Plan</th>
                <th className="p-3">Daily Allowance</th>
                <th className="p-3">Projects</th>
                <th className="p-3">Credits</th>
                <th className="p-3">Joined</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="p-3">
                      <Skeleton className="size-4" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-14" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-10" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-3 text-right">
                      <Skeleton className="h-7 w-14 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No users matched your query.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelected = selectedIds.includes(u.id);
                  const planName = u.accountPlan?.name || "Free";
                  const isPro = planName.toLowerCase().includes("pro");

                  return (
                    <tr
                      key={u.id}
                      onClick={() => handleOpenDetail(u.id)}
                      className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                        isSelected ? "bg-indigo-500/5" : ""
                      }`}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectUser(u.id)}
                          aria-label={`Select user ${u.email}`}
                          className="size-3.5 rounded border-border cursor-pointer accent-indigo-500"
                        />
                      </td>

                      {/* Name & Email */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-7 items-center justify-center rounded-lg bg-secondary text-foreground font-semibold text-xs shrink-0">
                            {(u.name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {u.name || "Nameless User"}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            u.role === "admin"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : u.role === "moderator"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {u.role === "admin" && <Shield className="size-2.5" />}
                          {u.role}
                        </span>
                      </td>

                      {/* Plan - Interactive Switcher */}
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        {!isModerator && plans.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={u.planId || u.accountPlan?.id || ""}
                              onChange={(e) => handleQuickSwitchPlan(u.id, e.target.value)}
                              aria-label={`Change plan for ${u.name || u.email}`}
                              className={`h-7 rounded-lg border text-[11px] font-medium px-2 py-0.5 cursor-pointer focus:outline-none transition-colors ${
                                isPro
                                  ? "bg-secondary text-foreground border-border hover:bg-secondary/80"
                                  : "bg-secondary/60 text-muted-foreground border-border/70 hover:bg-secondary/80"
                              }`}
                              title="Click to change user Account Plan tier"
                            >
                              {plans.map((p) => (
                                <option key={p.id} value={p.id} className="bg-popover text-foreground">
                                  {p.name} {p.dailyFreeCreditUSD ? `($${p.dailyFreeCreditUSD}/d)` : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium ${
                              isPro
                                ? "bg-secondary text-foreground border border-border"
                                : "bg-secondary/60 text-muted-foreground border border-border/70"
                            }`}
                          >
                            <Sparkles className="size-3" />
                            <span>{planName}</span>
                          </span>
                        )}
                      </td>

                      {/* Daily Allowance */}
                      <td className="p-3 font-mono font-medium text-foreground">
                        ${(u.accountPlan?.dailyFreeCreditUSD ?? 20.0).toFixed(2)}/day
                      </td>

                      {/* Projects Count */}
                      <td className="p-3 text-muted-foreground font-mono">
                        {u._count?.projects ?? 0}
                      </td>

                      {/* Credits Balance */}
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-mono font-semibold text-foreground">
                            ${(u.freeCreditsBalance + u.purchasedCreditsBalance).toFixed(2)}
                          </span>
                          {u.purchasedCreditsBalance > 0 && (
                            <span className="text-[10px] text-emerald-400 font-mono">
                              (${u.purchasedCreditsBalance.toFixed(2)} paid)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td className="p-3 text-muted-foreground text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {!isModerator && plans.length > 0 && (
                            <>
                              {!isPro ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const pro = plans.find((p) => p.name.toLowerCase().includes("pro"));
                                    if (pro) handleQuickSwitchPlan(u.id, pro.id);
                                  }}
                                  className="h-7 text-[10px] px-2 font-medium text-foreground border border-border bg-secondary/80 hover:bg-secondary"
                                  title="Instantly upgrade to Pro tier ($50/day, 50 projects)"
                                >
                                  <Sparkles className="size-3 mr-1" />
                                  Make Pro
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const free = plans.find((p) => p.name.toLowerCase().includes("free"));
                                    if (free) handleQuickSwitchPlan(u.id, free.id);
                                  }}
                                  className="h-7 text-[10px] px-2 font-medium text-muted-foreground border-border hover:bg-secondary"
                                  title="Switch back to Free tier ($20/day, 5 projects)"
                                >
                                  Make Free
                                </Button>
                              )}
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetail(u.id)}
                            className="h-7 text-xs px-2"
                          >
                            Details
                          </Button>
                          {!isModerator && u.id !== currentUserId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setUserToDelete(u)}
                              className="size-7 text-muted-foreground hover:text-destructive"
                              title="Delete user"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Dialog (with Account Plan switcher) */}
      <Dialog open={Boolean(detailUser)} onOpenChange={(open) => !open && setDetailUser(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailUser && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-border/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-foreground font-bold text-lg border border-border/80">
                    {(detailUser.name || detailUser.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {detailUser.name || "Nameless User"}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">{detailUser.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary uppercase font-semibold text-muted-foreground">
                        {detailUser.role}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Joined {new Date(detailUser.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Plan Management Card */}
              <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-foreground" />
                    <h4 className="text-sm font-bold text-foreground">Account Plan Tier</h4>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-secondary text-foreground border border-border/80">
                    Current: {detailUser.accountPlan?.name || "Free"}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  Upgrading or moving this user to another tier changes their daily free credit
                  allowance (${(detailUser.accountPlan?.dailyFreeCreditUSD ?? 20.0).toFixed(2)}
                  /day), max project limit ({detailUser.accountPlan?.maxProjects ?? 5}), and storage
                  quota.
                </p>

                {!isModerator && (
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      value={selectedPlanId}
                      onChange={(e) => setSelectedPlanId(e.target.value)}
                      aria-label="Select new account plan"
                      className="h-9 flex-1 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none cursor-pointer"
                    >
                      {availablePlans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} Tier · ${p.dailyFreeCreditUSD.toFixed(2)}/day · {p.maxProjects}{" "}
                          projects max
                        </option>
                      ))}
                    </select>

                    <Button
                      size="sm"
                      onClick={handleUpdatePlan}
                      disabled={isUpdatingPlan || selectedPlanId === detailUser.planId}
                      className="h-9 bg-foreground text-background hover:bg-foreground/90 font-medium text-xs transition-colors"
                    >
                      {isUpdatingPlan ? "Saving..." : "Change Plan"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Credit Balance Breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">
                    Free Balance
                  </span>
                  <p className="text-base font-bold font-mono text-foreground mt-0.5">
                    ${detailUser.freeCreditsBalance.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">
                    Purchased Balance
                  </span>
                  <p className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                    ${detailUser.purchasedCreditsBalance.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">
                    Total Active
                  </span>
                  <p className="text-base font-bold font-mono text-indigo-400 mt-0.5">
                    $
                    {(
                      detailUser.freeCreditsBalance + detailUser.purchasedCreditsBalance
                    ).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* User Projects List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  User Projects ({detailUser.projects.length})
                </h4>
                {detailUser.projects.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    This user has not created any projects yet.
                  </p>
                ) : (
                  <div className="rounded-xl border border-border/70 overflow-hidden divide-y divide-border/60">
                    {detailUser.projects.map((p) => (
                      <div key={p.id} className="p-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <FolderGit2 className="size-3.5 text-muted-foreground" />
                          <span className="font-semibold text-foreground">{p.name}</span>
                          {p.isPublished && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-mono">
                              Published
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                          <span>{p._count.files} files</span>
                          <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Credit Transactions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Recent Credit Transactions
                </h4>
                {detailUser.creditTransactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No transactions recorded.</p>
                ) : (
                  <div className="rounded-xl border border-border/70 overflow-hidden divide-y divide-border/60 max-h-48 overflow-y-auto">
                    {detailUser.creditTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-2.5 flex items-center justify-between text-xs hover:bg-muted/30"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-medium text-foreground block truncate">
                            {tx.reason}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {tx.type} · {new Date(tx.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span
                          className={`font-mono font-bold shrink-0 ${
                            tx.amount >= 0 ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {tx.amount >= 0 ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(4)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={Boolean(userToDelete)} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <span>Confirm Delete User</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{userToDelete?.email}</strong>? This action cascades and immediately removes
              all of their projects, starter files, chat sessions, and settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setUserToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Permanently Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
