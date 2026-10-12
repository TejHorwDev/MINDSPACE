"use client";

import { ArrowRight, Eye, Star, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TemplateMiniPreview } from "./template-mini-preview";
import { getTemplateMeta } from "./template-types";
import type { UnifiedTemplate } from "@/lib/templates/service";

type TemplateCardProps = {
  template: UnifiedTemplate;
  onPreview: (template: UnifiedTemplate) => void;
  onSelect: (template: UnifiedTemplate) => void;
};

export function TemplateCard({ template, onPreview, onSelect }: TemplateCardProps) {
  const meta = getTemplateMeta(template);

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs hover:border-foreground/30 hover:shadow-md transition-all duration-200">
      {/* 1. Miniature Browser Chrome & Visual Preview */}
      <div className="relative border-b border-border/70 bg-muted/20">
        {/* Browser Top Window Bar */}
        <div className="flex items-center justify-between px-2.5 py-1 border-b border-border/60 bg-muted/40 text-[10px] font-mono select-none">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-1.5 rounded-full bg-red-500/80" />
            <span className="size-1.5 rounded-full bg-amber-500/80" />
            <span className="size-1.5 rounded-full bg-emerald-500/80" />
            <span className="ml-1 text-[10px] text-muted-foreground truncate max-w-[120px]">
              {template.slug}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {template.isFeatured && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-500 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                <Star className="size-2 fill-amber-500" />
                Featured
              </span>
            )}
            <span className="text-[9px] text-muted-foreground">
              {template.fileCount} {template.fileCount === 1 ? "file" : "files"}
            </span>
          </div>
        </div>

        {/* Thumbnail Screen (Compact Fixed Height: h-36 = 144px) */}
        <div
          onClick={() => onPreview(template)}
          className="relative h-36 w-full overflow-hidden bg-zinc-950 cursor-pointer"
        >
          <TemplateMiniPreview template={template} />

          {/* Smooth Quick-Action Hover Overlay */}
          <div className="absolute inset-0 bg-background/85 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2 p-3 z-10">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(template);
              }}
              className="h-7 px-2.5 text-xs font-medium rounded-lg bg-background border-border shadow-xs hover:bg-secondary cursor-pointer"
            >
              <Eye className="mr-1 size-3 text-muted-foreground" />
              Preview
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(template);
              }}
              className="h-7 px-3 text-xs font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 shadow-xs cursor-pointer"
            >
              Use
              <ArrowRight className="ml-1 size-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Compact Metadata & Content */}
      <div className="flex flex-1 flex-col justify-between p-3.5 space-y-2.5">
        <div className="space-y-1.5">
          {/* Top Line: Category & Difficulty Badges */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono uppercase font-semibold text-muted-foreground tracking-wider text-[10px] bg-secondary/80 px-1.5 py-0.5 rounded border border-border/60">
              {template.category}
            </span>

            <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[10px]">
              <span className="flex items-center gap-1">
                <span
                  className={`size-1.5 rounded-full ${
                    meta.difficulty === "Beginner"
                      ? "bg-emerald-500"
                      : meta.difficulty === "Intermediate"
                      ? "bg-sky-500"
                      : "bg-amber-500"
                  }`}
                />
                {meta.difficulty}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Clock className="size-2.5 text-muted-foreground" />
                {meta.estTime}
              </span>
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <h3
              onClick={() => onPreview(template)}
              className="text-xs sm:text-sm font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors cursor-pointer line-clamp-1"
            >
              {template.name}
            </h3>
            <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {template.description}
            </p>
          </div>

          {/* Tech Stack Pills */}
          <div className="flex flex-wrap gap-1 pt-0.5">
            {meta.stackTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground border border-border/50"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* 3. Footer Bar: Metrics & Actions */}
        <div className="pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <span className="flex items-center gap-0.5 text-foreground/80">
              <Star className="size-2.5 text-amber-500 fill-amber-500" />
              <span>{meta.rating}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              <Users className="size-2.5 text-muted-foreground" />
              <span>{meta.clonesCount}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={() => onSelect(template)}
              className="h-6 px-2.5 text-[11px] font-semibold rounded-md bg-foreground text-background hover:bg-foreground/90 shadow-2xs cursor-pointer"
            >
              Use Template
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
