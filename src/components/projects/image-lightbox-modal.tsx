"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, X, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ImageLightboxModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl?: string;
  filename: string;
  sizeFormatted?: string;
  onOpenFileInEditor?: () => void;
}

export function ImageLightboxModal({
  open,
  onOpenChange,
  imageUrl,
  filename,
  sizeFormatted,
  onOpenFileInEditor,
}: ImageLightboxModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!imageUrl) return null;

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloaded ${filename}`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(imageUrl);
    setCopied(true);
    toast.success("Copied image data URL to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold font-mono text-foreground truncate">
                {filename}
              </DialogTitle>
              {sizeFormatted && (
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  File Size: {sizeFormatted}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-8 gap-1.5 text-xs border-border/80"
              >
                {copied ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                <span>{copied ? "Copied" : "Copy Data"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="h-8 gap-1.5 text-xs border-border/80"
              >
                <Download className="size-3.5" />
                <span>Download</span>
              </Button>

              {onOpenFileInEditor && (
                <Button
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenFileInEditor();
                  }}
                  className="h-8 gap-1.5 text-xs bg-foreground text-background font-semibold"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Open in Editor</span>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Image Display Area with transparent checkerboard background */}
        <div className="relative mt-4 flex items-center justify-center rounded-xl border border-border/60 bg-muted/30 p-4 max-h-[65vh] overflow-hidden">
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
              backgroundSize: "16px 16px",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={filename}
            className="max-h-[55vh] max-w-full rounded-lg object-contain shadow-md transition-transform"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
