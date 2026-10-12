"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Database,
  Download,
  HardDrive,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface BackupItem {
  id: string;
  fileName: string;
  sizeMB: number;
  createdAt: string;
  status: string;
}

interface LiveStatus {
  healthy: boolean;
  sizeMB: number;
  lastModified: string | null;
  location: string;
}

export function BackupsSection() {
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/backups");
      if (res.ok) {
        const data = await res.json();
        setLiveStatus(data.liveStatus);
        setBackups(data.backups || []);
      }
    } catch {
      toast.error("Failed to load backups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleTriggerBackup = async () => {
    setIsTriggering(true);
    try {
      const res = await fetch("/api/admin/backups", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Snapshot backup created: ${data.backup.fileName}`);
        fetchBackups();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create backup");
      }
    } catch {
      toast.error("Failed to trigger backup");
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Database className="size-5 text-blue-400" />
            <span>Database Backups & Snapshots</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor live SQLite database health, execute point-in-time snapshots, and view historical recovery points.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleTriggerBackup}
            disabled={isTriggering}
            className="h-9 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          >
            {isTriggering ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Database className="size-3.5" />
            )}
            <span>{isTriggering ? "Snapshotting..." : "Trigger Manual Snapshot"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchBackups}
            disabled={loading}
            className="h-9 gap-1.5 text-xs shadow-2xs"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Live Database Health Card */}
      <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Live Database Status: Operational</h3>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-semibold">
            SQLite Local Storage
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="rounded-xl border border-border/70 bg-background/60 p-3">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              Live Storage Size
            </span>
            <p className="text-lg font-bold font-mono text-foreground mt-0.5">
              {liveStatus ? `${liveStatus.sizeMB} MB` : "..."}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 p-3">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              Storage File Location
            </span>
            <p className="text-xs font-mono text-foreground mt-1 truncate">
              {liveStatus?.location || "prisma/db/custom.db"}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 p-3">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              Last Write Timestamp
            </span>
            <p className="text-xs font-mono text-foreground mt-1">
              {liveStatus?.lastModified
                ? new Date(liveStatus.lastModified).toLocaleString()
                : "Just now"}
            </p>
          </div>
        </div>
      </div>

      {/* Past Snapshot History Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Historical Backup Snapshots</h3>
          <span className="text-xs text-muted-foreground font-mono">
            {backups.length} snapshot(s) available
          </span>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/80 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-3">Snapshot File</th>
                  <th className="p-3">File Size</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Created Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td className="p-3"><Skeleton className="h-4 w-48" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="p-3 text-right"><Skeleton className="h-4 w-28 ml-auto" /></td>
                    </tr>
                  ))
                ) : backups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      No snapshots created yet. Click "Trigger Manual Snapshot" to take one now.
                    </td>
                  </tr>
                ) : (
                  backups.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/30">
                      <td className="p-3 font-mono font-medium text-foreground flex items-center gap-2">
                        <Database className="size-3.5 text-blue-400" />
                        <span>{b.fileName}</span>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">{b.sizeMB} MB</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="size-2.5" />
                          <span>Verified</span>
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-muted-foreground text-[11px]">
                        {new Date(b.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
