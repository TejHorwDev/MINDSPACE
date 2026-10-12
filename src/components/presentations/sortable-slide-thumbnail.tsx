"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Copy,
  MoreVertical,
  Heading1,
  LayoutTemplate,
  Columns2,
  Image as ImageIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SlideItem } from "@/lib/presentations/types";
import { cn } from "@/lib/utils";

interface SortableSlideThumbnailProps {
  slide: SlideItem;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

function getLayoutIcon(type: string) {
  switch (type) {
    case "title":
      return <Heading1 className="size-3.5 text-blue-500" />;
    case "title-content":
      return <LayoutTemplate className="size-3.5 text-emerald-500" />;
    case "two-column":
      return <Columns2 className="size-3.5 text-amber-500" />;
    case "image-text":
      return <ImageIcon className="size-3.5 text-purple-500" />;
    default:
      return <LayoutTemplate className="size-3.5 text-muted-foreground" />;
  }
}

function extractSlideHeading(slide: SlideItem): string {
  const content = slide.contentJson || {};
  try {
    if (slide.layoutType === "title") {
      const titleNode = content.title;
      if (titleNode?.content?.[0]?.content?.[0]?.text) {
        return titleNode.content[0].content[0].text;
      }
      return "Title Slide";
    }

    const headingNode = content.heading;
    if (headingNode?.content?.[0]?.text) {
      return headingNode.content[0].text;
    }
    if (headingNode?.content?.[0]?.content?.[0]?.text) {
      return headingNode.content[0].content[0].text;
    }
  } catch {
    // fallback
  }
  return `Slide ${slide.order + 1}`;
}

export function SortableSlideThumbnail({
  slide,
  index,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
  canDelete,
}: SortableSlideThumbnailProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const headingText = extractSlideHeading(slide);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-2 p-1.5 rounded-xl transition-all cursor-pointer select-none",
        isDragging && "opacity-50 z-50",
        isSelected
          ? "bg-secondary text-foreground ring-2 ring-primary/40 shadow-xs"
          : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
      )}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="p-1 text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing rounded hover:bg-background/80 transition-colors"
        title="Drag to reorder slide"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="size-3.5" />
      </div>

      {/* Slide Index Badge */}
      <span className="font-mono text-xs font-semibold text-muted-foreground/70 w-4 text-center shrink-0">
        {index + 1}
      </span>

      {/* Slide Mini Card / Aspect Miniature */}
      <div
        className={cn(
          "w-20 aspect-[16/9] rounded-lg border flex flex-col justify-between p-1.5 bg-card shrink-0 transition-colors shadow-2xs overflow-hidden",
          isSelected
            ? "border-primary/60 bg-card"
            : "border-border/80 group-hover:border-foreground/30"
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div className="scale-75 origin-top-left">
            {getLayoutIcon(slide.layoutType)}
          </div>
          <span className="text-[8px] font-mono text-muted-foreground/50">
            16:9
          </span>
        </div>
        <div className="w-full truncate text-[9px] font-semibold text-foreground/80 leading-tight">
          {headingText}
        </div>
      </div>

      {/* Title Label in list */}
      <div className="flex-1 min-w-0 pr-1">
        <p className="text-xs font-medium text-foreground truncate">
          {headingText}
        </p>
        <p className="text-[10px] text-muted-foreground/70 capitalize font-mono">
          {slide.layoutType.replace("-", " ")}
        </p>
      </div>

      {/* Actions dropdown */}
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-1 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-background/80 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              title="Slide options"
            >
              <MoreVertical className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 text-xs p-1 rounded-xl">
            <DropdownMenuItem
              onClick={onDuplicate}
              className="gap-2 cursor-pointer text-xs"
            >
              <Copy className="size-3.5 text-muted-foreground" />
              <span>Duplicate Slide</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={onDelete}
              disabled={!canDelete}
              className={cn(
                "gap-2 cursor-pointer text-xs",
                canDelete
                  ? "text-destructive focus:text-destructive focus:bg-destructive/10"
                  : "opacity-40 cursor-not-allowed"
              )}
            >
              <Trash2 className="size-3.5" />
              <span>Delete Slide</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
