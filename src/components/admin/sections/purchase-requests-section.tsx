"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  ExternalLink,
  Filter,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface AdminPurchaseRequestItem {
  id: string;
  userId: string;
  type: string;
  targetPlanId: string | null;
  creditPlanId: string | null;
  planName: string | null;
  amountUSD: number | null;
  priceNPR: number | null;
  status: "pending" | "approved" | "rejected";
  contactHandle: string | null;
  notes: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    planExpiresAt?: string | null;
    accountPlan?: {
      id: string;
      name: string;
      dailyFreeCreditUSD: number;
    } | null;
    freeCreditsBalance: number;
    purchasedCreditsBalance: number;
  };
  targetPlan?: {
    id: string;
    name: string;
    dailyFreeCreditUSD: number;
    maxProjects: number;
    maxStorageMB: number;
  } | null;
  creditPlan?: {
    id: string;
    name: string;
    creditsGrantedUSD: number;
    priceNPR: number;
  } | null;
}

interface PurchaseRequestsSectionProps {
  onNavigateSection?: (section: string) => void;
}

export function PurchaseRequestsSection({ onNavigateSection }: PurchaseRequestsSectionProps) {
  const [requests, setRequests] = useState<AdminPurchaseRequestItem[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Review Modal State
  const [selectedRequest, setSelectedRequest] = useState<AdminPurchaseRequestItem | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/purchase-requests?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
        if (data.counts) setCounts(data.counts);
      } else {
        toast.error("Failed to load purchase requests.");
      }
    } catch {
      toast.error("Network error while loading requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Request ID copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleApprove = async (request: AdminPurchaseRequestItem) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/purchase-requests/${request.id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Request #${request.id.slice(-6)} approved!`);
        setSelectedRequest(null);
        fetchRequests();
      } else {
        toast.error(data.error || "Failed to approve request.");
      }
    } catch {
      toast.error("Network error during approval.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (request: AdminPurchaseRequestItem) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/purchase-requests/${request.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Request #${request.id.slice(-6)} rejected.`);
        setSelectedRequest(null);
        setIsRejecting(false);
        setRejectionReason("");
        fetchRequests();
      } else {
        toast.error(data.error || "Failed to reject request.");
      }
    } catch {
      toast.error("Network error during rejection.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* 1. Header Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Purchase Requests Queue
            </h2>
            <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-xs font-mono">
              {counts.pending} Pending Review
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Single-click approval for student Pro tier upgrades and credit packs. Automatically updates plan, limits, and logs audit transactions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchRequests}
            disabled={loading}
            className="h-8 text-xs font-semibold rounded-xl border-border/80"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* 2. Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="inline-flex items-center rounded-xl border border-border/80 bg-muted/40 p-1 shadow-2xs">
          {[
            { id: "pending", label: "Pending", count: counts.pending, color: "text-amber-400" },
            { id: "all", label: "All Requests", count: counts.total, color: "text-muted-foreground" },
            { id: "approved", label: "Approved", count: counts.approved, color: "text-emerald-400" },
            { id: "rejected", label: "Rejected", count: counts.rejected, color: "text-rose-400" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-secondary ${tab.color}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchRequests()}
            placeholder="Search email, name, ID..."
            className="h-8 pl-8 pr-8 text-xs rounded-xl bg-card border-border/70"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setTimeout(fetchRequests, 0);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Requests Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 border-b border-border/70 text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Requested Package</th>
                <th className="py-3 px-4">Price / Value</th>
                <th className="py-3 px-4">Handle</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Submitted</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading purchase requests...</span>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <CheckCircle2 className="size-8 text-emerald-400/50 mx-auto mb-2" />
                    <p className="font-semibold text-foreground">No purchase requests in queue</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {statusFilter === "pending"
                        ? "All student purchase requests have been reviewed!"
                        : "No requests found matching your current filter."}
                    </p>
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const isPending = req.status === "pending";
                  const isApproved = req.status === "approved";

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-secondary/20 transition-colors cursor-pointer"
                      onClick={() => setSelectedRequest(req)}
                    >
                      {/* Request ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <span>{req.id.slice(0, 10)}...</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(req.id, req.id)}
                            className="p-1 text-muted-foreground hover:text-foreground"
                            title="Copy full Request ID"
                          >
                            {copiedId === req.id ? (
                              <CheckCheck className="size-3 text-emerald-400" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{req.user.name || "Student"}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{req.user.email}</div>
                      </td>

                      {/* Request Type */}
                      <td className="py-3.5 px-4">
                        {req.type === "plan_upgrade" ? (
                          <Badge variant="secondary" className="bg-secondary text-foreground border-border/80 text-[10px]">
                            <Sparkles className="size-2.5 mr-1" />
                            <span>Plan Upgrade</span>
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                            <Coins className="size-2.5 mr-1" />
                            <span>Credit Top-Up</span>
                          </Badge>
                        )}
                      </td>

                      {/* Package Name */}
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        {req.planName || "Package"}
                      </td>

                      {/* Price / Allowance */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-semibold text-foreground">
                          {req.priceNPR ? `NPR ${req.priceNPR.toLocaleString()}` : "N/A"}
                        </div>
                        {req.amountUSD !== null && (
                          <div className="text-[10px] text-emerald-400">
                            +${req.amountUSD.toFixed(2)} USD
                          </div>
                        )}
                      </td>

                      {/* Student Contact Handle */}
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        {req.contactHandle || "—"}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isApproved ? (
                          <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-semibold">
                            Approved
                          </Badge>
                        ) : req.status === "rejected" ? (
                          <Badge variant="secondary" className="bg-rose-500/15 text-rose-400 border-rose-500/30 text-[10px] font-semibold">
                            Rejected
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] font-semibold animate-pulse">
                            Pending
                          </Badge>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-muted-foreground font-mono">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => setSelectedRequest(req)}
                              className="h-7 px-2.5 text-[11px] font-bold bg-foreground text-background hover:bg-foreground/90 rounded-lg"
                            >
                              Review & Act
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedRequest(req)}
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            Details
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. Detail / Action Dialog Modal                      */}
      {/* ---------------------------------------------------- */}
      <Dialog
        open={Boolean(selectedRequest)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequest(null);
            setIsRejecting(false);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Review Purchase Request</span>
              {selectedRequest && (
                <Badge
                  variant="secondary"
                  className={
                    selectedRequest.status === "approved"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]"
                      : selectedRequest.status === "rejected"
                      ? "bg-rose-500/20 text-rose-400 border-rose-500/30 text-[10px]"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]"
                  }
                >
                  {selectedRequest.status.toUpperCase()}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cross-reference the Request ID against your Discord or WhatsApp payment conversation.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-2 text-xs">
              {/* Full Request ID Card */}
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                    Request ID (for chat lookup)
                  </div>
                  <div className="font-mono font-bold text-foreground text-sm">
                    {selectedRequest.id}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(selectedRequest.id, "dialog_copy")}
                  className="h-7 text-xs font-semibold rounded-lg"
                >
                  {copiedId === "dialog_copy" ? (
                    <>
                      <CheckCheck className="size-3 mr-1 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3 mr-1" />
                      <span>Copy ID</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Student Details */}
              <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5 space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-border/60">
                  <span className="font-semibold text-foreground">Student:</span>
                  <div className="text-right">
                    <div className="font-bold text-foreground">{selectedRequest.user.name || "Student"}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{selectedRequest.user.email}</div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Current Tier:</span>
                  <span className="font-semibold text-foreground">
                    {selectedRequest.user.accountPlan?.name || "Free Tier"} (${selectedRequest.user.freeCreditsBalance.toFixed(2)} USD today)
                  </span>
                </div>

                {selectedRequest.contactHandle && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Student Chat Handle:</span>
                    <span className="font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border border-border">
                      {selectedRequest.contactHandle}
                    </span>
                  </div>
                )}
              </div>

              {/* Package Details */}
              <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Package Requested:</span>
                  <span className="font-bold text-foreground text-sm">{selectedRequest.planName}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Price in NPR:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedRequest.priceNPR ? `NPR ${selectedRequest.priceNPR.toLocaleString()}` : "N/A"}
                  </span>
                </div>

                {selectedRequest.amountUSD !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      {selectedRequest.type === "plan_upgrade" ? "Daily Allowance:" : "Credit Top-Up Granted:"}
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      ${selectedRequest.amountUSD.toFixed(2)} USD
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                  <span>Submitted At:</span>
                  <span className="font-mono">{new Date(selectedRequest.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* If Rejected: Show Reason */}
              {selectedRequest.status === "rejected" && selectedRequest.rejectionReason && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs space-y-1">
                  <div className="font-bold text-rose-400">Rejection Reason:</div>
                  <p className="text-muted-foreground">{selectedRequest.rejectionReason}</p>
                </div>
              )}

              {/* Rejection Form Input */}
              {isRejecting && selectedRequest.status === "pending" && (
                <div className="space-y-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
                  <label className="font-semibold text-foreground block">
                    Reason for Rejection (Optional):
                  </label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Payment receipt was unverified or invalid."
                    rows={2}
                    className="text-xs bg-background rounded-lg border-border"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsRejecting(false)}
                      className="h-7 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleReject(selectedRequest)}
                      className="h-7 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg"
                    >
                      {actionLoading ? "Rejecting..." : "Confirm Reject"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedRequest?.status === "pending" && !isRejecting ? (
              <div className="flex items-center justify-between w-full gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsRejecting(true)}
                  className="text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-xl"
                >
                  Reject...
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedRequest(null)}
                    className="text-xs"
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => handleApprove(selectedRequest)}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md rounded-xl cursor-pointer"
                  >
                    {actionLoading ? "Applying..." : "Approve & Apply Plan (1-Click)"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedRequest(null)}
                className="text-xs rounded-xl"
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
