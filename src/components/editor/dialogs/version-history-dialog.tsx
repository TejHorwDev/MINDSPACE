"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  History,
  RotateCcw,
  Check,
  AlertTriangle,
  FileCode2,
  Clock,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EditorFile } from "../types";

export type FileSnapshot = {
  id: string;
  fileId: string;
  filePath: string;
  content: string;
  timestamp: string;
  label: string;
  sizeBytes: number;
};

type VersionHistoryDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  activeFile: EditorFile | null;
  snapshots: FileSnapshot[];
  onRestoreSnapshot: (snapshot: FileSnapshot) => void;
};

export function VersionHistoryDialog({
  isOpen,
  onClose,
  activeFile,
  snapshots,
  onRestoreSnapshot,
}: VersionHistoryDialogProps) {
  const [selectedSnapshot, setSelectedSnapshot] = useState<FileSnapshot | null>(null);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [snapshotToRestore, setSnapshotToRestore] = useState<FileSnapshot | null>(null);

  const fileSnapshots = activeFile
    ? snapshots.filter((s) => s.fileId === activeFile.id || s.filePath === activeFile.path)
    : [];

  const handleOpenRestoreConfirm = (snapshot: FileSnapshot) => {
    setSnapshotToRestore(snapshot);
    setConfirmRestoreOpen(true);
  };

  const handleConfirmRestore = () => {
    if (!snapshotToRestore) return;
    onRestoreSnapshot(snapshotToRestore);
    setConfirmRestoreOpen(false);
    setSnapshotToRestore(null);
    onClose();
    toast.success(`Restored ${snapshotToRestore.filePath} to snapshot from ${format(new Date(snapshotToRestore.timestamp), "MMM d, h:mm a")}`);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader className="border-b border-border/70 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-secondary text-foreground border border-border/80">
                <History className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Version History — {activeFile?.path || "Active File"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Browse previous revisions and restore snapshots with one click.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-4 min-h-[320px] max-h-[460px]">
            {/* Left: Snapshots Timeline */}
            <div className="md:col-span-5 border-r border-border/70 pr-3 overflow-y-auto space-y-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">
                Saved Timeline ({fileSnapshots.length})
              </span>

              {fileSnapshots.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border/70 rounded-xl space-y-2">
                  <Clock className="size-5 mx-auto text-muted-foreground/60" />
                  <p>No prior snapshots recorded for this file yet.</p>
                  <p className="text-[10px]">Snapshots are automatically created as you save and edit files.</p>
                </div>
              ) : (
                fileSnapshots.map((snap, idx) => {
                  const isSelected = (selectedSnapshot?.id || fileSnapshots[0]?.id) === snap.id;
                  const dateStr = format(new Date(snap.timestamp), "MMM d, yyyy · h:mm:ss a");

                  return (
                    <div
                      key={snap.id}
                      onClick={() => setSelectedSnapshot(snap)}
                      className={`group p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? "bg-secondary border-foreground/30 shadow-2xs"
                          : "border-border/70 bg-card hover:bg-secondary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-semibold text-foreground truncate">
                          {snap.label || (idx === 0 ? "Latest Revision" : `Snapshot #${fileSnapshots.length - idx}`)}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {snap.sizeBytes} B
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-mono text-[10px]">{dateStr}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRestoreConfirm(snap);
                          }}
                          className="h-6 px-2 text-[10px] font-semibold text-foreground hover:bg-background rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <RotateCcw className="size-2.5 mr-1" />
                          Restore
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: Snapshot Content Inspector */}
            <div className="md:col-span-7 flex flex-col min-h-0">
              <div className="flex items-center justify-between pb-2 border-b border-border/60 text-xs">
                <span className="font-mono text-[11px] text-muted-foreground">
                  Preview Content
                </span>
                {(selectedSnapshot || fileSnapshots[0]) && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenRestoreConfirm(selectedSnapshot || fileSnapshots[0])}
                    className="h-7 px-3 text-xs font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 shadow-2xs"
                  >
                    <RotateCcw className="size-3 mr-1.5" />
                    Restore this version
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-auto bg-background rounded-xl border border-border/80 mt-2 p-3 font-mono text-[11px] leading-relaxed text-foreground select-text whitespace-pre">
                {(selectedSnapshot || fileSnapshots[0])?.content || "Select a snapshot to preview its content..."}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/70 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 rounded-xl text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog before Restoring */}
      <Dialog open={confirmRestoreOpen} onOpenChange={setConfirmRestoreOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <AlertTriangle className="size-4" />
              </div>
              <DialogTitle className="text-base font-bold text-foreground">
                Confirm Version Restore
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1.5 leading-relaxed">
              Are you sure you want to restore <strong>{snapshotToRestore?.filePath}</strong> to the snapshot taken on{" "}
              {snapshotToRestore ? format(new Date(snapshotToRestore.timestamp), "MMM d, h:mm a") : ""}?
              Any unsaved edits currently in the editor for this file will be replaced.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmRestoreOpen(false)}
              className="h-8 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmRestore}
              className="h-8 rounded-xl text-xs font-semibold bg-foreground text-background hover:bg-foreground/90"
            >
              Confirm Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
