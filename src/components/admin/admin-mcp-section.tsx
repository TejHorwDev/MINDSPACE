"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, RefreshCw, Server, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function AdminMcpSection() {
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [totalServers, setTotalServers] = useState(0);
  const [activeServers, setActiveServers] = useState(0);
  const [usersWithMcp, setUsersWithMcp] = useState(0);

  const fetchMcpData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/mcp");
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled);
        setTotalServers(data.totalServersCount);
        setActiveServers(data.activeServersCount);
        setUsersWithMcp(data.usersWithMcpCount);
      } else {
        toast.error("Failed to load MCP status");
      }
    } catch {
      toast.error("Network error loading MCP status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMcpData();
  }, []);

  const handleToggle = async (newVal: boolean) => {
    setToggling(true);
    try {
      const res = await fetch("/api/admin/mcp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newVal }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnabled(newVal);
        toast.success(data.message || "MCP status updated");
      } else {
        toast.error(data.error || "Failed to update MCP setting");
      }
    } catch {
      toast.error("Error updating MCP setting");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Platform Toggle Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Server className="size-5 text-indigo-500" />
              <h3 className="text-base font-bold text-foreground">
                Platform-Wide Personal MCP Servers Toggle
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Master kill-switch allowing or restricting student-configured Model Context Protocol servers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold ${enabled ? "text-emerald-500" : "text-rose-500"}`}>
              {enabled ? "Feature Enabled" : "Feature Disabled"}
            </span>
            <Switch
              checked={enabled}
              disabled={toggling}
              onCheckedChange={handleToggle}
              aria-label="Toggle MCP servers platform-wide"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-secondary/40 p-3 text-xs text-muted-foreground flex items-center gap-2.5">
          <Shield className="size-4 text-emerald-500 shrink-0" />
          <span>
            <strong>Zero Secrets Exposure:</strong> Admins view aggregate connection metadata only. Private student API keys, endpoints, and bearer tokens are strictly encrypted and invisible to administrators.
          </span>
        </div>
      </div>

      {/* Aggregate Metadata Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Students With MCP</span>
            <Users className="size-4 text-violet-500" />
          </div>
          <div className="text-3xl font-extrabold text-foreground">{usersWithMcp}</div>
          <p className="text-[11px] text-muted-foreground">Accounts with custom tools</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Total MCP Endpoints</span>
            <Server className="size-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-extrabold text-foreground">{totalServers}</div>
          <p className="text-[11px] text-muted-foreground">Configured tool endpoints</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Active MCP Endpoints</span>
            <Check className="size-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-500">{activeServers}</div>
          <p className="text-[11px] text-muted-foreground">Currently enabled by students</p>
        </div>
      </div>
    </div>
  );
}
