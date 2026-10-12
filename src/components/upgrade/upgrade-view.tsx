"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  CreditCard,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  Sparkles,
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
import { safeUrl } from "@/lib/sanitize";

export type PurchaseRequestItem = {
  id: string;
  type: string;
  planName: string | null;
  amountUSD: number | null;
  priceNPR: number | null;
  status: string;
  contactHandle: string | null;
  notes: string | null;
  rejectionReason: string | null;
  createdAt: string;
};

export type ContactChannelItem = {
  id: string;
  name: string;
  iconType: string;
  contactLink: string;
  instructions: string;
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

export type CreditPlanItem = {
  id: string;
  name: string;
  priceNPR: number;
  creditsGrantedUSD: number;
  active: boolean;
};

interface UpgradeViewProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  };
  currentPlan?: AccountPlanItem | null;
  allAccountPlans: AccountPlanItem[];
  creditPlans: CreditPlanItem[];
  channels: ContactChannelItem[];
  initialRequests: PurchaseRequestItem[];
  balance: {
    freeCredits: number;
    purchasedCredits: number;
    totalCredits: number;
    isPaidUser: boolean;
  };
}

export function UpgradeView({
  user,
  currentPlan,
  allAccountPlans,
  creditPlans,
  channels,
  initialRequests,
  balance,
}: UpgradeViewProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<PurchaseRequestItem[]>(initialRequests);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal states for initiating request
  const [selectedAction, setSelectedAction] = useState<{
    type: "plan_upgrade" | "credit_topup";
    targetPlanId?: string;
    creditPlanId?: string;
    planName: string;
    amountUSD?: number;
    priceNPR?: number;
  } | null>(null);
  const [contactHandle, setContactHandle] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Success Confirmation Modal state
  const [confirmedRequest, setConfirmedRequest] = useState<PurchaseRequestItem | null>(null);

  const activePlanName = currentPlan?.name || "Free";
  const isPro = activePlanName.toLowerCase().includes("pro");
  const proPlan = allAccountPlans.find((p) => p.name.toLowerCase().includes("pro"));
  const proPriceNPR = proPlan?.priceNPR ?? 1500;
  const approxUSD = Math.round(proPriceNPR / 133);

  // Find if user already has an active pending request
  const pendingRequest = requests.find((r) => r.status === "pending");

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Request ID copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenRequestModal = (
    type: "plan_upgrade" | "credit_topup",
    targetPlanId?: string,
    creditPlanId?: string,
    planName = "",
    amountUSD?: number,
    priceNPR?: number
  ) => {
    setSelectedAction({
      type,
      targetPlanId,
      creditPlanId,
      planName,
      amountUSD,
      priceNPR,
    });
  };

  const handleSubmitRequest = async () => {
    if (!selectedAction) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/purchase-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedAction.type,
          targetPlanId: selectedAction.targetPlanId,
          creditPlanId: selectedAction.creditPlanId,
          contactHandle,
          notes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.alreadyPending) {
          toast.info("You already have an active pending request.");
        } else {
          toast.success("Purchase request created!");
          setRequests((prev) => [data.request, ...prev.filter((r) => r.id !== data.request.id)]);
        }
        setConfirmedRequest(data.request);
        setSelectedAction(null);
        setContactHandle("");
        setNotes("");
        router.refresh();
      } else {
        toast.error(data.error || "Failed to submit request.");
      }
    } catch {
      toast.error("Network error while creating purchase request.");
    } finally {
      setSubmitting(false);
    }
  };

  // Build helpful contact link prefilled with request ID
  const getChannelLink = (channel: ContactChannelItem, reqId: string, plan = "") => {
    const rawLink = safeUrl(channel.contactLink) || "#";
    const msg = `Hi MINDSPACE! I submitted a purchase request for ${plan} (Request ID: ${reqId}). Here is my payment receipt to activate my account.`;
    if (channel.iconType.toLowerCase().includes("whatsapp") && rawLink.includes("wa.me")) {
      const separator = rawLink.includes("?") ? "&" : "?";
      return `${rawLink}${separator}text=${encodeURIComponent(msg)}`;
    }
    return rawLink;
  };

  return (
    <div className="w-full space-y-10 max-w-6xl mx-auto">
      {/* 1. Header Command Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/dashboard"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="size-3" />
              <span>Workspace</span>
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-xs font-semibold text-foreground">Upgrade & Pricing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Account Tiers & Credit Upgrades
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Higher daily AI allowances for active developers, or one-time top-ups that never expire.
          </p>
        </div>

        {/* Live Balance Card */}
        <div className="flex items-center gap-3 self-stretch sm:self-auto bg-card p-3 rounded-2xl border border-border/80 shadow-xs shrink-0">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Coins className="size-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Current Plan & Balance
            </div>
            <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>{activePlanName} Tier</span>
              <span className="text-muted-foreground/40">•</span>
              <span className="font-mono text-emerald-400">${balance.totalCredits.toFixed(2)} USD</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Active Pending Request Warning Banner */}
      {pendingRequest && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <Clock className="size-4 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    Active Purchase Request: {pendingRequest.planName || "Plan Upgrade"}
                  </h3>
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] font-mono">
                    Pending Approval
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Message us on Discord or WhatsApp with your Request ID to verify payment and activate your plan.
                </p>
              </div>
            </div>

            {/* Request ID + Copy Button */}
            <div className="flex items-center gap-2 self-start sm:self-auto bg-background/80 rounded-xl px-3 py-1.5 border border-border">
              <span className="text-xs font-mono font-bold text-foreground">
                {pendingRequest.id}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(pendingRequest.id, pendingRequest.id)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                title="Copy Request ID"
              >
                {copiedId === pendingRequest.id ? (
                  <CheckCheck className="size-3.5 text-emerald-400" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Quick Contact Links */}
          {channels.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Send ID & payment proof via:
              </span>
              {channels.map((ch) => (
                <a
                  key={ch.id}
                  href={getChannelLink(ch, pendingRequest.id, pendingRequest.planName || "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                >
                  <MessageCircle className="size-3 text-indigo-400" />
                  <span>{ch.name}</span>
                  <ExternalLink className="size-2.5 text-muted-foreground" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Primary Pricing Comparison Grid: Free vs Pro */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Account Plans</h2>
          <p className="text-xs text-muted-foreground">
            Ongoing tiers with generous daily resets every 24 hours at 00:00 UTC.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* A. Free Tier Card */}
          <div
            className={`rounded-3xl border p-6 sm:p-8 flex flex-col justify-between transition-all bg-card shadow-xs ${
              !isPro ? "border-border/90" : "border-border/60 opacity-90"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Free Forever
                </span>
                {!isPro && (
                  <span className="text-[10px] bg-secondary text-foreground font-semibold px-2 py-0.5 rounded-full border border-border">
                    Current Tier
                  </span>
                )}
              </div>

              <h3 className="text-2xl font-extrabold text-foreground mt-2">Free Tier</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Ideal for beginners and students learning to build clean full-stack web applications.
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold font-mono text-foreground">$0</span>
                <span className="text-xs text-muted-foreground">/ free forever</span>
              </div>

              <div className="mt-6 space-y-3 pt-6 border-t border-border/70 text-xs">
                <div className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span><strong className="text-foreground">$20.00 / day</strong> AI credit allowance</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span><strong className="text-foreground">5 active projects</strong> at a time</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span><strong className="text-foreground">50 MB</strong> cloud file storage</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span>All starter templates & live preview</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span>Bring Your Own Key (BYOK) for $0 deduction</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-border/60">
              <Button
                variant="outline"
                disabled={!isPro}
                onClick={() => router.push("/dashboard")}
                className="w-full h-10 text-xs font-bold rounded-xl"
              >
                {!isPro ? "Current Active Tier" : "Default Starter Plan"}
              </Button>
            </div>
          </div>

          {/* B. Pro Tier Card (Featured) */}
          <div
            className={`rounded-3xl border-2 p-6 sm:p-8 flex flex-col justify-between transition-all relative shadow-xl ${
              isPro
                ? "border-foreground/30 bg-card"
                : "border-border/90 bg-card"
            }`}
          >
            {/* Recommended Pill */}
            <div className="absolute -top-3.5 right-6">
              <span className="bg-foreground text-background font-semibold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                <Sparkles className="size-3" />
                <span>Recommended for Builders</span>
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Power Creator
                </span>
                {isPro && (
                  <span className="text-[10px] bg-secondary text-foreground font-semibold px-2 py-0.5 rounded-full border border-border/80">
                    Current Tier
                  </span>
                )}
              </div>

              <h3 className="text-2xl font-extrabold text-foreground mt-2">Pro Tier</h3>
              <p className="text-xs text-muted-foreground mt-1">
                For serious developers shipping multi-page websites, commercial projects, and heavy AI code edits.
              </p>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold font-mono text-foreground">
                  NPR {proPriceNPR.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">
                  / month {proPriceNPR > 0 ? `(~$${approxUSD} USD)` : ""}
                </span>
              </div>

              <div className="mt-6 space-y-3 pt-6 border-t border-border/70 text-xs">
                <div className="flex items-center gap-2.5">
                  <Check className="size-4 text-foreground shrink-0" />
                  <span><strong className="text-foreground">$50.00 / day</strong> AI credit allowance (2.5x more)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="size-4 text-foreground shrink-0" />
                  <span><strong className="text-foreground">50 active projects</strong> (10x workspace limit)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="size-4 text-foreground shrink-0" />
                  <span><strong className="text-foreground">2,500 MB (2.5 GB)</strong> cloud storage (50x storage)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="size-4 text-foreground shrink-0" />
                  <span>Priority fallback across all configured AI models</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="size-4 text-foreground shrink-0" />
                  <span>Custom MCP server integrations & full tool execution</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-border/60">
              {isPro ? (
                <Button
                  disabled
                  className="w-full h-10 text-xs font-medium rounded-xl bg-secondary text-muted-foreground"
                >
                  <Check className="mr-1.5 size-3.5" />
                  <span>Your Current Plan</span>
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    handleOpenRequestModal(
                      "plan_upgrade",
                      proPlan?.id,
                      undefined,
                      `${proPlan?.name || "Pro"} Tier Upgrade`,
                      proPlan?.dailyFreeCreditUSD || 50.0,
                      proPriceNPR
                    );
                  }}
                  className="w-full h-10 text-xs font-medium rounded-xl bg-foreground text-background hover:bg-foreground/90 shadow-2xs transition-colors cursor-pointer"
                >
                  <Sparkles className="mr-1.5 size-3.5" />
                  <span>Request Upgrade to Pro</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. One-Time Credit Top-Up Options (Never Expire) */}
      <div className="space-y-4 pt-4 border-t border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">One-Time Credit Top-Ups</h2>
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
              Never Expire
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Purchased top-ups never expire and stack on top of your daily free allowance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {creditPlans.map((plan) => {
            const isHighlighted = plan.name.toLowerCase().includes("100") || plan.creditsGrantedUSD >= 50;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all bg-card ${
                  isHighlighted ? "border-emerald-500/50 shadow-md" : "border-border/80"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Top-Up Pack
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      +${plan.creditsGrantedUSD.toFixed(2)} USD
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-foreground mt-2">{plan.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Provides ${plan.creditsGrantedUSD.toFixed(2)} of durable credits that never reset.
                  </p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-foreground">
                      NPR {plan.priceNPR.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">one-time</span>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-border/60">
                  <Button
                    onClick={() =>
                      handleOpenRequestModal(
                        "credit_topup",
                        undefined,
                        plan.id,
                        plan.name,
                        plan.creditsGrantedUSD,
                        plan.priceNPR
                      )
                    }
                    variant={isHighlighted ? "default" : "outline"}
                    className={`w-full h-8 text-xs font-bold rounded-xl cursor-pointer ${
                      isHighlighted ? "bg-emerald-600 hover:bg-emerald-500 text-white" : ""
                    }`}
                  >
                    <span>Request {plan.name}</span>
                    <ArrowRight className="size-3 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Request History Section */}
      {requests.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-border/70">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">Your Purchase Requests</h3>
              <p className="text-xs text-muted-foreground">
                Track status and view Request IDs for your payment conversations.
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {requests.length} request{requests.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/40 border-b border-border/70 text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Package</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {requests.map((r) => {
                    const statusBadge =
                      r.status === "approved" ? (
                        <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold text-[10px]">
                          Approved & Active
                        </Badge>
                      ) : r.status === "rejected" ? (
                        <Badge variant="secondary" className="bg-rose-500/15 text-rose-400 border-rose-500/30 font-semibold text-[10px]">
                          Rejected
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold text-[10px]">
                          Pending Approval
                        </Badge>
                      );

                    return (
                      <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>{r.id}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(r.id, r.id)}
                              className="text-muted-foreground hover:text-foreground p-0.5"
                              title="Copy ID"
                            >
                              {copiedId === r.id ? (
                                <CheckCheck className="size-3 text-emerald-400" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {r.planName || "Plan Upgrade"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground capitalize">
                          {r.type.replace("_", " ")}
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          {r.priceNPR ? `NPR ${r.priceNPR.toLocaleString()}` : "N/A"}
                        </td>
                        <td className="py-3 px-4">{statusBadge}</td>
                        <td className="py-3 px-4 text-muted-foreground font-mono">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 6. MODAL: Submit Purchase Request                     */}
      {/* ---------------------------------------------------- */}
      <Dialog open={Boolean(selectedAction)} onOpenChange={(open) => !open && setSelectedAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Confirm Purchase Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              This initiates a structured purchase request for admin approval. Payment is completed manually via Discord or WhatsApp.
            </DialogDescription>
          </DialogHeader>

          {selectedAction && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Selected Package:</span>
                  <span className="font-bold text-foreground">{selectedAction.planName}</span>
                </div>
                {selectedAction.priceNPR !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Price:</span>
                    <span className="font-bold font-mono text-foreground">
                      NPR {selectedAction.priceNPR.toLocaleString()}
                    </span>
                  </div>
                )}
                {selectedAction.amountUSD !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Credit Allowance:</span>
                    <span className="font-bold font-mono text-emerald-400">
                      ${selectedAction.amountUSD.toFixed(2)} USD
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <label className="font-semibold text-foreground">
                  Your Discord / WhatsApp Handle (Optional):
                </label>
                <Input
                  value={contactHandle}
                  onChange={(e) => setContactHandle(e.target.value)}
                  placeholder="e.g. discord_username or 98XXXXXXXX"
                  className="h-8 text-xs bg-background rounded-xl"
                />
                <span className="text-[11px] text-muted-foreground block">
                  Helps our team match your message when you send the payment receipt.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedAction(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={submitting}
              onClick={handleSubmitRequest}
              className="text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? "Creating Request..." : "Create Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------- */}
      {/* 7. MODAL: Confirmation & Instructions Screen (Honest) */}
      {/* ---------------------------------------------------- */}
      <Dialog open={Boolean(confirmedRequest)} onOpenChange={(open) => !open && setConfirmedRequest(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <CheckCircle2 className="size-4" />
              </div>
              <DialogTitle className="text-base font-bold">
                Purchase Request Created!
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Your request is saved and waiting in the admin approval queue. Follow the steps below to complete payment and activate your plan.
            </DialogDescription>
          </DialogHeader>

          {confirmedRequest && (
            <div className="space-y-4 py-2">
              {/* Highlighted Request ID Card */}
              <div className="rounded-2xl border-2 border-indigo-500/40 bg-indigo-500/5 p-4 text-center space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Your Unique Request ID
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg font-mono font-extrabold text-foreground tracking-tight select-all">
                    {confirmedRequest.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(confirmedRequest.id, "confirmed_id")}
                    className="p-1 rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                    title="Copy Request ID"
                  >
                    {copiedId === "confirmed_id" ? (
                      <CheckCheck className="size-4 text-emerald-400" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Copy and send this ID to our support channels below along with your payment receipt.
                </p>
              </div>

              {/* Steps Guidance */}
              <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5 space-y-2 text-xs">
                <h5 className="font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-indigo-400" />
                  <span>How Manual Activation Works:</span>
                </h5>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                  <li>Copy your Request ID above.</li>
                  <li>Click a channel below to open Discord or WhatsApp.</li>
                  <li>Send your payment screenshot and paste your Request ID.</li>
                  <li>An admin reviews your payment and approves your account with 1 click!</li>
                </ol>
              </div>

              {/* Direct Channel Buttons */}
              {channels.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-foreground block">
                    Message us now to activate:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {channels.map((ch) => (
                      <a
                        key={ch.id}
                        href={getChannelLink(ch, confirmedRequest.id, confirmedRequest.planName || "")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-card p-2.5 text-xs font-bold text-foreground hover:bg-secondary transition-all shadow-2xs"
                      >
                        <MessageCircle className="size-3.5 text-indigo-400" />
                        <span>Open {ch.name}</span>
                        <ExternalLink className="size-3 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setConfirmedRequest(null)}
              className="w-full text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-xl"
            >
              Done / Return to Plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
