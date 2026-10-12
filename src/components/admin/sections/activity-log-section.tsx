"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Calendar,
  ChevronDown,
  Filter,
  RefreshCw,
  Search,
  Shield,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface LogItem {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: any;
  createdAt: string;
  adminUser: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

export function ActivityLogSection() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [staff, setStaff] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState("all");
  const [adminFilter, setAdminFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        action: actionFilter,
        adminId: adminFilter,
        search,
      });
      const res = await fetch(`/api/admin/activity-log?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        if (data.staff) setStaff(data.staff);
      }
    } catch {
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 250);
    return () => clearTimeout(timer);
  }, [actionFilter, adminFilter, search]);

  const formatActionName = (action: string) => {
    return action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="size-5 text-violet-400" />
            <span>Admin Activity Audit Log</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable audit trail of sensitive administrative actions, role modifications, plan changes, and credit grants.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
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
            placeholder="Search action or admin..."
            className="h-9 w-full rounded-xl border border-border/70 bg-background/80 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-violet-500 shadow-2xs"
          />
        </div>

        {/* Action Type Filter */}
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          aria-label="Filter by action"
          className="h-9 rounded-xl border border-border/70 bg-background/80 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500 shadow-2xs cursor-pointer"
        >
          <option value="all">All Actions</option>
          <option value="user_plan_updated">User Plan Changed</option>
          <option value="credit_granted">Credit Granted</option>
          <option value="account_plan_created">Plan Created</option>
          <option value="account_plan_updated">Plan Updated</option>
          <option value="account_plan_deleted">Plan Deleted</option>
          <option value="ai_provider_created">Provider Created</option>
          <option value="ai_provider_updated">Provider Updated</option>
          <option value="ai_provider_deleted">Provider Deleted</option>
          <option value="report_resolved">Report Resolved</option>
          <option value="staff_role_changed">Role Changed</option>
          <option value="user_deleted">User Deleted</option>
          <option value="project_deleted">Project Deleted</option>
          <option value="database_backup_created">Backup Created</option>
        </select>

        {/* Admin Filter */}
        <select
          value={adminFilter}
          onChange={(e) => setAdminFilter(e.target.value)}
          aria-label="Filter by admin user"
          className="h-9 rounded-xl border border-border/70 bg-background/80 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500 shadow-2xs cursor-pointer"
        >
          <option value="all">All Admins</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name || s.email}
            </option>
          ))}
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/80 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="p-3">Admin</th>
                <th className="p-3">Action</th>
                <th className="p-3">Target</th>
                <th className="p-3">Details</th>
                <th className="p-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="p-3 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <tr key={log.id} className="hover:bg-muted/30">
                      {/* Admin User */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex size-6 items-center justify-center rounded-lg bg-secondary text-[11px] font-semibold">
                            {(log.adminUser?.name || log.adminUser?.email || "A").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground block truncate">
                              {log.adminUser?.name || "Admin"}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono truncate">
                              {log.adminUser?.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20 font-mono">
                          {formatActionName(log.action)}
                        </span>
                      </td>

                      {/* Target */}
                      <td className="p-3 font-mono text-[11px] text-muted-foreground">
                        <span className="capitalize">{log.targetType}</span>
                        {log.targetId && (
                          <span className="block text-[10px] text-muted-foreground/70 truncate max-w-[120px]">
                            {log.targetId}
                          </span>
                        )}
                      </td>

                      {/* Details */}
                      <td className="p-3 max-w-[280px]">
                        {log.details ? (
                          <div>
                            <button
                              type="button"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="text-[11px] text-muted-foreground hover:text-foreground font-mono flex items-center gap-1 cursor-pointer truncate"
                            >
                              <span>
                                {typeof log.details === "object"
                                  ? JSON.stringify(log.details).slice(0, 45) + "..."
                                  : String(log.details)}
                              </span>
                              <ChevronDown className={`size-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>

                            {isExpanded && (
                              <pre className="mt-1.5 p-2 rounded-lg bg-background border border-border text-[10px] font-mono text-muted-foreground overflow-x-auto max-w-sm whitespace-pre-wrap">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">None</span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="p-3 text-right font-mono text-muted-foreground text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
