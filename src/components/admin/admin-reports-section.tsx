"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface AdminReportItem {
  id: string;
  reason: string;
  details: string | null;
  status: "pending" | "resolved" | "dismissed";
  createdAt: string;
  project: {
    id: string;
    name: string;
    publicSlug: string | null;
    isPublished: boolean;
    owner: {
      id: string;
      email: string;
      name: string | null;
    };
  };
}

export function AdminReportsSection() {
  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      } else {
        toast.error("Failed to load reports");
      }
    } catch {
      toast.error("Error loading reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpdateStatus = async (id: string, status: "resolved" | "dismissed") => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r))
        );
        toast.success(`Report marked as ${status}`);
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to update report");
      }
    } catch {
      toast.error("Error updating report");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredReports = statusFilter === "all"
    ? reports
    : reports.filter((r) => r.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-rose-500" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Flagged Site Reports
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Review user-submitted reports for published websites on MINDSPACE.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none cursor-pointer"
          >
            <option value="all">All Reports</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchReports}
            disabled={loading}
            className="h-9 px-3 rounded-xl gap-2 text-xs"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center space-y-3">
          <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-foreground">No Reports Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {statusFilter === "all"
              ? "No published websites have been flagged or reported."
              : `No ${statusFilter} reports found.`}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-muted-foreground font-semibold border-b border-border/80 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Project</th>
                  <th className="px-5 py-3.5">Owner</th>
                  <th className="px-5 py-3.5">Reason & Details</th>
                  <th className="px-5 py-3.5">Reported At</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredReports.map((r) => (
                  <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          r.status === "pending"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : r.status === "resolved"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            r.status === "pending"
                              ? "bg-amber-400 animate-pulse"
                              : r.status === "resolved"
                              ? "bg-emerald-400"
                              : "bg-muted-foreground"
                          }`}
                        />
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-foreground">{r.project?.name || "Deleted Project"}</div>
                      {r.project?.publicSlug && (
                        <a
                          href={`/p/${r.project.publicSlug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-mono text-indigo-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <span>/p/{r.project.publicSlug}</span>
                          <ExternalLink className="size-2.5" />
                        </a>
                      )}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      <div className="text-foreground font-medium">{r.project?.owner?.name || "User"}</div>
                      <div className="font-mono text-[11px]">{r.project?.owner?.email}</div>
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <div className="font-semibold text-rose-400">{r.reason}</div>
                      {r.details && (
                        <p className="text-muted-foreground text-[11px] mt-0.5 line-clamp-2">
                          {r.details}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap space-x-1.5">
                      {r.status === "pending" ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={updatingId === r.id}
                            onClick={() => handleUpdateStatus(r.id, "resolved")}
                            className="h-8 px-2.5 rounded-lg text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 text-xs"
                          >
                            Resolve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={updatingId === r.id}
                            onClick={() => handleUpdateStatus(r.id, "dismissed")}
                            className="h-8 px-2.5 rounded-lg text-muted-foreground hover:text-foreground text-xs"
                          >
                            Dismiss
                          </Button>
                        </>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
                          Action completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
