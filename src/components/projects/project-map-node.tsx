"use client";

import React, { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import {
  AlertTriangle,
  Code2,
  ExternalLink,
  Eye,
  FileCode,
  FileImage,
  FileText,
  Palette,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { ProjectMapNodeData, FileCategory } from "@/lib/project-map-parser";

export type ProjectFileNodeType = Node<ProjectMapNodeData, "projectFileNode">;

function getCategoryConfig(category: FileCategory) {
  switch (category) {
    case "html":
      return {
        label: "HTML",
        icon: FileCode,
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
        accentGlow: "group-hover:border-amber-500/50",
      };
    case "css":
      return {
        label: "CSS",
        icon: Palette,
        badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
        accentGlow: "group-hover:border-sky-500/50",
      };
    case "js":
      return {
        label: "JS",
        icon: Code2,
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
        accentGlow: "group-hover:border-emerald-500/50",
      };
    case "image":
      return {
        label: "IMG",
        icon: FileImage,
        badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25",
        accentGlow: "group-hover:border-purple-500/50",
      };
    default:
      return {
        label: "FILE",
        icon: FileText,
        badgeClass: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/25",
        accentGlow: "group-hover:border-zinc-500/50",
      };
  }
}

export const ProjectFileNode = memo(function ProjectFileNode({
  data,
  selected,
}: NodeProps<ProjectFileNodeType>) {
  const config = getCategoryConfig(data.category);
  const Icon = config.icon;

  const isEntryHtml = data.path === "index.html" || data.path === "main.py";
  const isMissing = !!data.isMissing;
  const isOrphan = !!data.isOrphan && !isMissing;
  const isHighlighted = !!data.isHighlighted;
  const isDimmed = !!data.isDimmed;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    if (isMissing) {
      toast.error(
        `Missing file: "${data.filename}" is referenced by ${
          data.referencedBy?.join(", ") || "your project"
        } but does not exist in the project.`
      );
      return;
    }

    // If it's an image and has an image URL, open preview
    if (data.category === "image" && data.imageUrl) {
      data.onPreviewImage?.(data.imageUrl, data.filename, data.formattedSize);
      return;
    }

    data.onOpenFile?.(data.path);
  };

  // 1. Ghost Node for Missing Broken References
  if (isMissing) {
    return (
      <div
        onClick={handleCardClick}
        className={`group relative w-[240px] rounded-xl border border-dashed border-red-500/60 dark:border-red-400/60 bg-red-500/5 dark:bg-red-950/20 p-3 shadow-xs transition-all duration-150 select-none cursor-pointer ${
          selected
            ? "ring-2 ring-red-500/40 shadow-sm"
            : "hover:border-red-500 hover:bg-red-500/10"
        } ${isHighlighted ? "ring-2 ring-red-500 shadow-md" : ""} ${
          isDimmed ? "opacity-30" : "opacity-100"
        }`}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2.5 !h-2.5 !bg-red-500 !border-2 !border-background transition-colors"
        />

        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-mono font-semibold">
            <AlertTriangle className="size-3" aria-hidden="true" />
            <span>MISSING FILE</span>
          </span>
          <span className="text-[10px] font-mono text-red-500/80 font-medium">
            404
          </span>
        </div>

        <div className="mb-2 min-w-0">
          {data.directory && (
            <p className="text-[10px] font-mono text-red-500/60 truncate leading-tight">
              {data.directory}/
            </p>
          )}
          <p className="text-xs font-mono font-bold text-red-600 dark:text-red-400 truncate">
            {data.filename}
          </p>
        </div>

        <div className="flex items-center justify-between text-[10px] text-red-500/80 border-t border-red-500/20 pt-1.5 mt-1">
          <span className="truncate">
            Referenced in {data.referencedBy?.[0] || "code"}
          </span>
        </div>
      </div>
    );
  }

  // 2. Image Node with Visual Thumbnail Preview (HERO REDESIGN)
  if (data.category === "image") {
    return (
      <div
        onClick={handleCardClick}
        className={`group relative w-[260px] rounded-xl border bg-card/95 backdrop-blur-xs p-3 shadow-xs transition-all duration-200 select-none cursor-pointer ${
          selected
            ? "border-purple-500/80 shadow-md ring-2 ring-purple-500/20"
            : "border-border/80 hover:border-purple-500/40 hover:shadow-xs"
        } ${
          isHighlighted
            ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary shadow-md"
            : ""
        } ${isDimmed ? "opacity-30" : "opacity-100"}`}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2 !h-2 !bg-purple-500/50 !border-2 !border-background group-hover:!bg-purple-500 transition-colors"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-2 !h-2 !bg-purple-500/50 !border-2 !border-background group-hover:!bg-purple-500 transition-colors"
        />

        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-semibold ${config.badgeClass}`}
            >
              <FileImage className="size-3" aria-hidden="true" />
              <span>{data.extension || "IMG"}</span>
            </span>
            {isOrphan && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] font-medium"
                title="Zero inbound connections — this image is not referenced in your project"
              >
                Unused
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              title="Open in editor"
              onClick={(e) => {
                e.stopPropagation();
                data.onOpenFile?.(data.path);
              }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <ExternalLink className="size-3" aria-hidden="true" />
            </button>
            <button
              type="button"
              title={`Delete ${data.filename}`}
              onClick={(e) => {
                e.stopPropagation();
                data.onDeleteFile?.(data.fileId, data.filename);
              }}
              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="size-3" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Filename */}
        <div className="min-w-0 mb-2">
          {data.directory && (
            <p className="text-[10px] font-mono text-muted-foreground/70 truncate leading-tight">
              {data.directory}/
            </p>
          )}
          <p className="text-xs font-mono font-semibold text-foreground truncate group-hover:text-foreground/90">
            {data.filename}
          </p>
        </div>

        {/* Actual Visual Image Thumbnail Frame */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (data.imageUrl) {
              data.onPreviewImage?.(data.imageUrl, data.filename, data.formattedSize);
            }
          }}
          className="group/img relative w-full h-28 rounded-lg border border-border/70 bg-secondary/40 overflow-hidden flex items-center justify-center cursor-pointer transition-all hover:border-purple-500/50"
        >
          {/* Subtle checkerboard pattern for transparent PNG / SVG */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
              backgroundSize: "8px 8px",
            }}
          />

          {data.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.imageUrl}
              alt={data.filename}
              className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover/img:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground text-[10px]">
              <FileImage className="size-5 mb-1 opacity-50" />
              <span>Image Asset</span>
            </div>
          )}

          {/* Hover Zoom Scrim */}
          <div className="absolute inset-0 bg-background/60 backdrop-blur-2xs opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs font-medium text-foreground">
            <Eye className="size-3.5" />
            <span className="text-[11px]">Inspect</span>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50 pt-2 mt-2">
          <span className="font-mono text-muted-foreground/80">{data.formattedSize}</span>
          <span className="text-[10px]">
            {data.inDegree > 0 ? (
              <span>Linked by {data.inDegree} {data.inDegree === 1 ? "file" : "files"}</span>
            ) : isOrphan ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">Unused asset</span>
            ) : (
              <span className="text-muted-foreground/60">Standalone</span>
            )}
          </span>
        </div>
      </div>
    );
  }

  // 3. HTML / CSS / JS / Code Nodes
  return (
    <div
      onClick={handleCardClick}
      className={`group relative w-[260px] rounded-xl border bg-card/95 backdrop-blur-xs p-3 shadow-xs transition-all duration-200 select-none cursor-pointer ${
        selected
          ? "border-foreground/60 shadow-md ring-2 ring-foreground/20"
          : "border-border/80 hover:border-foreground/30 hover:shadow-xs"
      } ${config.accentGlow} ${
        isHighlighted
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary shadow-md"
          : ""
      } ${isDimmed ? "opacity-30" : "opacity-100"}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-muted-foreground/30 !border-2 !border-background group-hover:!bg-foreground transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-muted-foreground/30 !border-2 !border-background group-hover:!bg-foreground transition-colors"
      />

      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-semibold ${config.badgeClass}`}
          >
            <Icon className="size-3" aria-hidden="true" />
            <span>{config.label}</span>
          </span>
          {isEntryHtml && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9px] font-semibold tracking-tight">
              <Sparkles className="size-2.5" />
              <span>Entry</span>
            </span>
          )}
          {isOrphan && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] font-medium"
              title="Zero inbound connections — this file is not referenced in your project"
            >
              Unused
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            title="Open in editor"
            onClick={(e) => {
              e.stopPropagation();
              data.onOpenFile?.(data.path);
            }}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ExternalLink className="size-3" aria-hidden="true" />
          </button>
          <button
            type="button"
            title={`Delete ${data.filename}`}
            onClick={(e) => {
              e.stopPropagation();
              data.onDeleteFile?.(data.fileId, data.filename);
            }}
            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="size-3" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Filename & Directory */}
      <div className="min-w-0">
        {data.directory && (
          <p className="text-[10px] font-mono text-muted-foreground/70 truncate leading-tight">
            {data.directory}/
          </p>
        )}
        <p className="text-xs font-mono font-semibold text-foreground truncate group-hover:text-foreground/90">
          {data.filename}
        </p>
      </div>

      {/* HTML Title metadata if present */}
      {data.htmlTitle && (
        <p className="mt-1 text-[10px] text-muted-foreground/80 truncate italic">
          &ldquo;{data.htmlTitle}&rdquo;
        </p>
      )}

      {/* CSS Color Swatches if present */}
      {data.cssColors && data.cssColors.length > 0 && (
        <div className="flex items-center gap-1 mt-1.5">
          {data.cssColors.map((color, i) => (
            <span
              key={i}
              title={color}
              className="size-2.5 rounded-full border border-border/80 shadow-2xs"
              style={{ backgroundColor: color }}
            />
          ))}
          <span className="text-[9px] font-mono text-muted-foreground/70 ml-1">
            palette
          </span>
        </div>
      )}

      {/* Bottom Footer Info */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50 pt-2 mt-2">
        <span className="font-mono text-muted-foreground/80">{data.formattedSize}</span>
        <span className="text-[10px]">
          {data.inDegree > 0 ? (
            <span>Linked by {data.inDegree} {data.inDegree === 1 ? "file" : "files"}</span>
          ) : data.outDegree > 0 ? (
            <span>Links to {data.outDegree} {data.outDegree === 1 ? "file" : "files"}</span>
          ) : isOrphan ? (
            <span className="text-amber-600 dark:text-amber-400 font-medium">Unused file</span>
          ) : (
            <span className="text-muted-foreground/60">Standalone</span>
          )}
        </span>
      </div>
    </div>
  );
});
