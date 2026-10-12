"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Download,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Sparkles,
  Play,
  Terminal,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectBreadcrumbs } from "@/components/layout/project-breadcrumbs";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { FileTabs } from "./file-tabs";
import { EditorPublishPopover } from "./editor-publish-popover";
import type { EditorFile, ProjectMeta, SaveStatus, AccountPlanInfo } from "./types";

type EditorTopBarProps = {
  project: ProjectMeta;
  files: EditorFile[];
  openFileIds: string[];
  activeFileId: string | null;
  dirtyFileIds: Set<string>;
  saveStatus: SaveStatus;
  showPreview?: boolean;
  onTogglePreview?: () => void;
  showTerminal?: boolean;
  onToggleTerminal?: () => void;
  showAiChat?: boolean;
  onToggleAiChat?: () => void;
  onOpenHistory?: () => void;
  userCredits?: number | null;
  accountPlan?: AccountPlanInfo | null;
  onRunCode?: () => void;
  isRunningCode?: boolean;
  getLatestFiles?: () => { path: string; content: string }[];
  onSelectTab: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
};

export function EditorTopBar({
  project,
  files,
  openFileIds,
  activeFileId,
  dirtyFileIds,
  saveStatus,
  showPreview = true,
  onTogglePreview,
  showTerminal = false,
  onToggleTerminal,
  showAiChat = false,
  onToggleAiChat,
  onOpenHistory,
  userCredits,
  accountPlan,
  onRunCode,
  isRunningCode = false,
  getLatestFiles,
  onSelectTab,
  onCloseTab,
  user,
}: EditorTopBarProps) {
  const [downloadingZip, setDownloadingZip] = useState(false);

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/download`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName =
        project.name.toLowerCase().replace(/[^a-z0-9_-]/g, "_") || "mindspace";
      a.download = `${safeName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("ZIP download error:", err);
      alert("Failed to download project zip");
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="flex flex-col border-b border-border bg-card/95 backdrop-blur-xs select-none">
      {/* Unified IDE Header (h-12 / 48px) */}
      <div className="flex h-12 items-center justify-between px-3 sm:px-4 border-b border-border/60 gap-3">
        {/* Left: Brand / Project breadcrumbs / Saved status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-foreground hover:opacity-80 transition-opacity shrink-0"
            title="Return to MINDSPACE Dashboard"
          >
            <div className="size-6 rounded-md bg-foreground text-background flex items-center justify-center font-black text-[11px] shadow-xs">
              M
            </div>
            <span className="hidden lg:inline font-bold tracking-widest text-[11px] uppercase">
              MINDSPACE
            </span>
          </Link>

          <div className="h-4 w-px bg-border/80 shrink-0 hidden sm:block" />

          <ProjectBreadcrumbs
            projectId={project.id}
            projectName={project.name}
            isEditor
          />

          {/* Save status badge */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-border/70 bg-secondary/50 text-[11px] font-medium shrink-0"
            role="status"
            aria-live="polite"
          >
            {saveStatus === "saved" && (
              <>
                <Check className="size-3 text-emerald-500" aria-hidden="true" />
                <span className="text-muted-foreground text-[11px]">Saved</span>
              </>
            )}
            {saveStatus === "saving" && (
              <>
                <Loader2 className="size-3 animate-spin text-primary" aria-hidden="true" />
                <span className="text-muted-foreground text-[11px]">Saving…</span>
              </>
            )}
            {saveStatus === "unsaved" && (
              <>
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
                <span className="text-muted-foreground text-[11px]">Unsaved</span>
              </>
            )}
            {saveStatus === "error" && (
              <>
                <AlertCircle className="size-3 text-destructive" aria-hidden="true" />
                <span className="text-destructive text-[11px]">Failed to save</span>
              </>
            )}
          </div>

          {/* Account Plan Tier & Allowance Pill */}
          {accountPlan && (
            <Link
              href="/credits"
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-border/80 bg-secondary/60 hover:bg-secondary text-[11px] font-medium text-foreground transition-colors shrink-0"
              title={`Active Tier: ${accountPlan.name} · $${accountPlan.dailyFreeCreditUSD.toFixed(2)} Daily Allowance`}
            >
              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold">{accountPlan.name} Tier</span>
              <span className="text-muted-foreground/60">·</span>
              <span className="font-mono text-muted-foreground">${accountPlan.dailyFreeCreditUSD.toFixed(2)}/day</span>
            </Link>
          )}
        </div>

        {/* Center: Command Controls Container */}
        <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-secondary/30 p-1 shadow-2xs backdrop-blur-xs shrink-0">
          {/* Run Code Button (Multi-Language Execution Sandbox) */}
          {onRunCode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRunCode}
              disabled={isRunningCode}
              className="h-7.5 gap-1.5 px-3 text-xs font-medium rounded-lg bg-secondary/80 hover:bg-secondary text-foreground border border-border/70 hover:border-border transition-colors shadow-2xs"
              title="Run code in sandbox (Python, C++, Java, Node, etc.)"
            >
              {isRunningCode ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Play className="size-3 fill-emerald-500 text-emerald-500" />
              )}
              <span>Run</span>
            </Button>
          )}

          {/* Toggle Terminal Button */}
          {onToggleTerminal && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleTerminal}
              className={`h-7.5 gap-1.5 px-2.5 text-xs font-medium rounded-lg transition-colors border ${
                showTerminal
                  ? "text-foreground bg-accent border-border shadow-2xs"
                  : "text-muted-foreground hover:text-foreground border-transparent hover:bg-secondary/60"
              }`}
              title={showTerminal ? "Hide interactive terminal" : "Open interactive terminal"}
            >
              <Terminal className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Terminal</span>
            </Button>
          )}

          {/* Toggle AI Help Button */}
          {onToggleAiChat && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleAiChat}
              className={`h-7.5 gap-1.5 px-3 text-xs font-medium rounded-lg border transition-colors ${
                showAiChat
                  ? "border-border bg-accent text-foreground shadow-2xs"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
              title="Toggle AI Help & Diff Assistant"
            >
              <Sparkles className="size-3.5" />
              <span>AI Help</span>
              {userCredits !== undefined && userCredits !== null && (
                <span className="font-mono text-[10px] text-muted-foreground bg-background/60 px-1.5 py-0.2 rounded border border-border/60">
                  ${userCredits.toFixed(2)}
                </span>
              )}
            </Button>
          )}

          {/* Toggle Preview Button */}
          {onTogglePreview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onTogglePreview}
              className={`h-7.5 gap-1.5 px-2.5 text-xs font-medium rounded-lg transition-colors border ${
                showPreview
                  ? "text-foreground bg-accent border-border shadow-2xs"
                  : "text-muted-foreground hover:text-foreground border-transparent hover:bg-secondary/60"
              }`}
              title={showPreview ? "Hide live preview" : "Show live preview"}
            >
              {showPreview ? (
                <>
                  <Eye className="size-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Preview</span>
                </>
              ) : (
                <>
                  <EyeOff className="size-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Preview</span>
                </>
              )}
            </Button>
          )}

          {/* Toggle File Version History Button */}
          {onOpenHistory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenHistory}
              className="h-7.5 gap-1.5 px-2.5 text-xs rounded-lg border border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              title="View Version History & Snapshots"
            >
              <History className="size-3.5" />
              <span className="hidden md:inline">History</span>
            </Button>
          )}
        </div>

        {/* Right: ZIP download, Publish, ThemeToggle, UserMenu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Download ZIP Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="h-8 gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-lg"
            title="Download project as .zip"
          >
            {downloadingZip ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Download className="size-3" />
            )}
            <span className="hidden xl:inline">ZIP</span>
          </Button>

          {/* Publish / Live 30-min Countdown Popover */}
          <EditorPublishPopover
            projectId={project.id}
            projectName={project.name}
            initialIsPublished={project.isPublished}
            initialPublicSlug={project.publicSlug}
            initialPublishedAt={project.publishedAt}
            getLatestFiles={getLatestFiles}
          />

          {/* Back to Project Info */}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground rounded-lg"
            title="Back to project overview"
          >
            <Link href={`/project/${project.id}`}>
              <ArrowLeft className="size-3" aria-hidden="true" />
              <span className="hidden 2xl:inline">Info</span>
            </Link>
          </Button>

          <div className="h-4 w-px bg-border/80 shrink-0 mx-1 hidden sm:block" />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          {user && <UserMenu name={user.name} email={user.email} />}
        </div>
      </div>

      {/* File Tabs bar */}
      <FileTabs
        files={files}
        openFileIds={openFileIds}
        activeFileId={activeFileId}
        dirtyFileIds={dirtyFileIds}
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
      />
    </div>
  );
}
