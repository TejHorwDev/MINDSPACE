"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SystemErrorItem {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  source: "frontend" | "backend" | "api";
  url?: string;
  userAgent?: string;
  context?: Record<string, unknown>;
}

export function AdminErrorsSection() {
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [sentryConfigured, setSentryConfigured] = useState(false);
  const [errors, setErrors] = useState<SystemErrorItem[]>([]);

  const fetchErrors = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/errors");
      if (res.ok) {
        const data = await res.json();
        setErrors(data.errors || []);
        setSentryConfigured(Boolean(data.sentryConfigured));
      }
    } catch {
      toast.error("Failed to fetch system errors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  const triggerTestError = async () => {
    try {
      setTriggering(true);
      const res = await fetch("/api/test-error");
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Test error generated and captured successfully!");
        await fetchErrors();
      } else {
        toast.error(data.error || "Failed to trigger test error");
      }
    } catch {
      toast.error("Error triggering test error");
    } finally {
      setTriggering(false);
    }
  };

  const clearErrors = async () => {
    try {
      setClearing(true);
      const res = await fetch("/api/errors", { method: "DELETE" });
      if (res.ok) {
        setErrors([]);
        toast.success("Error log cleared");
      }
    } catch {
      toast.error("Failed to clear error log");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-rose-500 uppercase">
            <Bug className="size-4" />
            <span>Crash & Error Monitoring (Sentry Engine)</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time capture of unhandled server, client, and API exceptions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchErrors}
            disabled={loading}
            className="h-8 gap-1.5 text-xs rounded-xl"
          >
            <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={triggerTestError}
            disabled={triggering}
            className="h-8 gap-1.5 text-xs font-semibold rounded-xl"
          >
            {triggering ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Zap className="size-3" />
            )}
            <span>Trigger Test Error</span>
          </Button>

          {errors.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearErrors}
              disabled={clearing}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-xl"
            >
              <Trash2 className="size-3" />
              <span>Clear Log</span>
            </Button>
          )}
        </div>
      </div>

      {/* Status banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Monitoring Service</span>
            <div className="text-sm font-bold text-foreground">Sentry Free Tier / Autonomous Logger</div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        </div>

        <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Captured Incidents</span>
            <div className="text-sm font-bold text-foreground">{errors.length} Unhandled Events</div>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            Max 50 rolling
          </span>
        </div>
      </div>

      {/* Errors list */}
      {loading && errors.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          <Loader2 className="size-5 animate-spin mx-auto mb-2 text-indigo-500" />
          Loading recent system errors...
        </div>
      ) : errors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center space-y-2">
          <CheckCircle2 className="size-8 text-emerald-500 mx-auto opacity-70" />
          <h4 className="text-sm font-semibold text-foreground">No Unhandled Exceptions</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            All services are operating nominally. Click &quot;Trigger Test Error&quot; above to verify exception capture pipeline.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {errors.map((err) => (
            <div
              key={err.id}
              className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] p-4 text-xs space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-rose-500/20 text-rose-400 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                    {err.source}
                  </span>
                  <span className="font-mono text-muted-foreground text-[11px]">
                    {err.id}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                  <Clock className="size-3" />
                  <span>{new Date(err.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="font-bold text-foreground font-mono select-text">
                {err.message}
              </div>

              {err.stack && (
                <pre className="mt-2 max-h-32 overflow-x-auto rounded-xl bg-background/80 p-2.5 font-mono text-[11px] text-muted-foreground leading-relaxed">
                  {err.stack}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
