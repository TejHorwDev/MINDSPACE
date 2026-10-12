"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import {
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SlideImageRegionProps {
  imageUrl?: string;
  imageAlt?: string;
  onChange?: (data: { imageUrl: string; imageAlt?: string }) => void;
  className?: string;
  readOnly?: boolean;
}

export function SlideImageRegion({
  imageUrl,
  imageAlt = "Slide figure",
  onChange,
  className,
  readOnly = false,
}: SlideImageRegionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, WEBP, GIF, SVG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file must be under 5MB.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to upload image.");
      }

      onChange?.({
        imageUrl: data.url,
        imageAlt: file.name.replace(/\.[^/.]+$/, ""),
      });
      toast.success("Image uploaded to slide!");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Network error while uploading image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    onChange?.({
      imageUrl: urlInput.trim(),
      imageAlt: "Web image",
    });
    setUrlInput("");
    setShowUrlInput(false);
    toast.success("Image URL applied.");
  };

  const handleRemoveImage = () => {
    onChange?.({
      imageUrl: "",
      imageAlt: "",
    });
    toast.info("Image removed from slide.");
  };

  return (
    <div
      className={cn(
        "relative w-full h-full min-h-[220px] rounded-xl border border-border/80 overflow-hidden bg-secondary/30 flex flex-col items-center justify-center group/img",
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
      />

      {isUploading ? (
        <div className="flex flex-col items-center gap-2 p-6 text-center text-xs text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span>Uploading image to slide...</span>
        </div>
      ) : imageUrl ? (
        /* Image Preview State */
        <div className="relative w-full h-full min-h-[220px] bg-background/50 flex items-center justify-center">
          <img
            src={imageUrl}
            alt={imageAlt || "Slide image"}
            className="w-full h-full object-contain max-h-[340px] rounded-lg transition-transform group-hover/img:scale-[1.01]"
          />

          {/* Hover Actions Overlay */}
          {!readOnly && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-xs opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs bg-card/90 border-border/80 text-foreground hover:bg-card shadow-xs"
              >
                <RefreshCw className="size-3 mr-1.5" />
                Replace
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleRemoveImage}
                className="h-8 text-xs shadow-xs"
              >
                <X className="size-3 mr-1.5" />
                Remove
              </Button>
            </div>
          )}
        </div>
      ) : showUrlInput ? (
        /* URL Input State */
        <div className="p-5 w-full max-w-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span>Insert Image URL</span>
            <button
              type="button"
              onClick={() => setShowUrlInput(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <Input
            placeholder="https://images.unsplash.com/..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApplyUrl();
            }}
            className="h-8 text-xs bg-background/80"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowUrlInput(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApplyUrl}
              className="h-7 text-xs"
            >
              Apply
            </Button>
          </div>
        </div>
      ) : (
        /* Empty Dropzone State */
        readOnly ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 w-full h-full text-muted-foreground/60 select-none">
            <ImageIcon className="size-7 opacity-50" />
            <p className="text-xs font-medium">{imageAlt || "Image frame"}</p>
          </div>
        ) : (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="flex flex-col items-center justify-center p-6 text-center space-y-3 w-full h-full cursor-pointer hover:bg-secondary/40 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="size-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <ImageIcon className="size-5" />
            </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">
              Drop image here or click to browse
            </p>
            <p className="text-[11px] text-muted-foreground">
              Supports PNG, JPG, WEBP, SVG up to 5MB
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="h-7 px-2.5 text-[11px] font-medium"
            >
              <Upload className="size-3 mr-1" />
              Upload File
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setShowUrlInput(true);
              }}
              className="h-7 px-2.5 text-[11px] font-medium"
            >
              <LinkIcon className="size-3 mr-1" />
              Web Link
            </Button>
          </div>
        </div>
      )
    )}
  </div>
);
}
