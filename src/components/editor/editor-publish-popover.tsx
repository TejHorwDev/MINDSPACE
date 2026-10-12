"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type EditorPublishPopoverProps = {
  projectId: string;
  projectName: string;
  initialIsPublished?: boolean;
  initialPublicSlug?: string | null;
  initialPublishedAt?: string | Date | null;
  getLatestFiles?: () => { path: string; content: string }[];
};

const PUBLISH_DURATION_SECONDS = 30 * 60; // 30 minutes

export function EditorPublishPopover({
  projectId,
  projectName,
  initialIsPublished = false,
  initialPublicSlug = null,
  initialPublishedAt = null,
  getLatestFiles,
}: EditorPublishPopoverProps) {
  const [isPublished, setIsPublished] = useState(initialIsPublished);
  const [publicSlug, setPublicSlug] = useState<string | null>(initialPublicSlug);
  const [publishedAt, setPublishedAt] = useState<Date | null>(
    initialPublishedAt ? new Date(initialPublishedAt) : null
  );

  const [isPublishing, setIsPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (!initialIsPublished || !initialPublishedAt) return 0;
    const elapsed = Math.floor(
      (Date.now() - new Date(initialPublishedAt).getTime()) / 1000
    );
    return Math.max(0, PUBLISH_DURATION_SECONDS - elapsed);
  });

  // Countdown timer effect
  useEffect(() => {
    if (!isPublished || !publishedAt) {
      setRemainingSeconds(0);
      return;
    }

    const updateTimer = () => {
      const elapsed = Math.floor(
        (Date.now() - new Date(publishedAt).getTime()) / 1000
      );
      const remaining = Math.max(0, PUBLISH_DURATION_SECONDS - elapsed);
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        setIsPublished(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isPublished, publishedAt]);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const latestFiles = getLatestFiles ? getLatestFiles() : undefined;
      const res = await fetch(`/api/projects/${projectId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: latestFiles }),
      });
      if (!res.ok) {
        throw new Error("Failed to publish project.");
      }
      const data = await res.json();
      setIsPublished(true);
      setPublicSlug(data.publicSlug);
      setPublishedAt(new Date(data.publishedAt));
      setRemainingSeconds(PUBLISH_DURATION_SECONDS);
      setIsOpen(true);
    } catch (err) {
      console.error("Publish error:", err);
      alert("Failed to publish project. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const publicUrl = publicSlug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${publicSlug}`
    : "";

  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const minutesLeft = Math.floor(remainingSeconds / 60);
  const secondsLeft = remainingSeconds % 60;
  const isCurrentlyLive = isPublished && remainingSeconds > 0;

  if (!isCurrentlyLive) {
    return (
      <Button
        size="sm"
        onClick={handlePublish}
        disabled={isPublishing}
        className="h-7.5 gap-1.5 px-3 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 shadow-2xs rounded-lg transition-colors"
        title="Publish a 30-minute test preview accessible to anyone"
      >
        {isPublishing ? (
          <>
            <Loader2 className="size-3 animate-spin" />
            <span>Publishing…</span>
          </>
        ) : (
          <>
            <Rocket className="size-3" />
            <span>{publicSlug ? "Republish" : "Publish"}</span>
          </>
        )}
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7.5 gap-1.5 px-2.5 text-xs border border-border bg-secondary/80 hover:bg-secondary text-foreground rounded-lg transition-colors"
          title="Your preview is live! Click to view link and countdown."
        >
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
          </span>
          <span className="font-medium font-mono">Live · {minutesLeft}m</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
          <div className="flex items-center gap-1.5">
            <Globe className="size-4 text-emerald-500" />
            <span className="text-xs font-semibold text-foreground">
              Site is Live
            </span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
            {minutesLeft}m {secondsLeft.toString().padStart(2, "0")}s left
          </span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Anyone with this link can view your working site for the next 30 minutes.
        </p>

        {/* Link box */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            readOnly
            value={publicUrl}
            className="flex-1 h-8 rounded-md border border-border bg-muted/40 px-2.5 text-[11px] font-mono text-foreground focus:outline-hidden"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className="size-8 shrink-0"
            title="Copy public link"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span className="sr-only">Copy link</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            asChild
            size="sm"
            className="flex-1 h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <a href={`/p/${publicSlug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3" />
              <span>Open in new tab</span>
            </a>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePublish}
            disabled={isPublishing}
            className="h-8 gap-1 text-xs px-2.5"
            title="Reset timer for another 30 minutes"
          >
            <RefreshCw
              className={`size-3 ${isPublishing ? "animate-spin" : ""}`}
            />
            <span>+30m</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
