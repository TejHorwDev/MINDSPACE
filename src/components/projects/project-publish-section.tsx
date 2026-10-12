"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  Rocket,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ProjectPublishSectionProps = {
  projectId: string;
  projectName: string;
  initialIsPublished: boolean;
  initialPublicSlug: string | null;
  initialPublishedAt: string | Date | null;
};

const PUBLISH_DURATION_SECONDS = 30 * 60; // 30 minutes in seconds

export function ProjectPublishSection({
  projectId,
  projectName,
  initialIsPublished,
  initialPublicSlug,
  initialPublishedAt,
}: ProjectPublishSectionProps) {
  const [isPublished, setIsPublished] = useState(initialIsPublished);
  const [publicSlug, setPublicSlug] = useState<string | null>(initialPublicSlug);
  const [publishedAt, setPublishedAt] = useState<Date | null>(
    initialPublishedAt ? new Date(initialPublishedAt) : null
  );

  const [isPublishing, setIsPublishing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (!initialIsPublished || !initialPublishedAt) return 0;
    const elapsed = Math.floor(
      (Date.now() - new Date(initialPublishedAt).getTime()) / 1000
    );
    return Math.max(0, PUBLISH_DURATION_SECONDS - elapsed);
  });

  // Calculate live remaining seconds every 1s
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
      const res = await fetch(`/api/projects/${projectId}/publish`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Failed to publish project.");
      }
      const data = await res.json();
      setIsPublished(true);
      setPublicSlug(data.publicSlug);
      setPublishedAt(new Date(data.publishedAt));
      setRemainingSeconds(PUBLISH_DURATION_SECONDS);
    } catch (err) {
      console.error("Publish error:", err);
      alert("Failed to publish project. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/download`);
      if (!res.ok) {
        throw new Error("Failed to download project.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName =
        projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "_") || "mindspace";
      a.download = `${safeName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download project zip.");
    } finally {
      setIsDownloading(false);
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

  return (
    <Card className="mt-6 rounded-lg border border-border bg-card shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Globe className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Share & Export
              </CardTitle>
              <CardDescription className="text-xs">
                Test publish your site online for 30 minutes, or download the full code.
              </CardDescription>
            </div>
          </div>

          {/* Quick Download Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className="h-8 gap-1.5 text-xs border-border/80"
          >
            {isDownloading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            <span>Download .zip</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 pb-4">
        {isCurrentlyLive ? (
          /* State 1: Project is LIVE with 30-min countdown */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <span className="relative flex size-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex size-3 rounded-full bg-emerald-500"></span>
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Live on the web
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      (expires in {minutesLeft}m {secondsLeft.toString().padStart(2, "0")}s)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Live for {minutesLeft > 0 ? `${minutesLeft} more minute${minutesLeft === 1 ? "" : "s"}` : `${secondsLeft} seconds`} before auto-expiring.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePublish}
                disabled={isPublishing}
                className="h-7 text-xs gap-1.5 shrink-0"
                title="Reset 30-minute timer and update static files"
              >
                <RefreshCw
                  className={`size-3 ${isPublishing ? "animate-spin" : ""}`}
                />
                <span>Republish (+30 min)</span>
              </Button>
            </div>

            {/* Public Link Input + Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="w-full h-9 rounded-md border border-border bg-muted/40 px-3 text-xs font-mono text-foreground focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-9 gap-1.5 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </Button>

                <Button
                  asChild
                  size="sm"
                  className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <a href={`/p/${publicSlug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5" />
                    <span>Open Site</span>
                  </a>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* State 2: Not published or expired */
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-1">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {publicSlug
                    ? "Previous preview has expired"
                    : "Temporary 30-minute test publish"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
                Publish a temporary live URL accessible to anyone on the web for 30 minutes to confirm your site works. You can republish at any time to reset the 30-minute clock.
              </p>
            </div>

            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="gap-2 shrink-0 text-xs shadow-xs"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Publishing…</span>
                </>
              ) : (
                <>
                  <Rocket className="size-3.5" />
                  <span>{publicSlug ? "Republish (30 min)" : "Publish (30 min)"}</span>
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
