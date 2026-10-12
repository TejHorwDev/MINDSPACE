"use client";

import { ArrowRight, Eye, Star, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTemplateMeta } from "./template-types";
import type { UnifiedTemplate } from "@/lib/templates/service";

type TemplateListRowProps = {
  template: UnifiedTemplate;
  onPreview: (template: UnifiedTemplate) => void;
  onSelect: (template: UnifiedTemplate) => void;
};

export function TemplateListRow({ template, onPreview, onSelect }: TemplateListRowProps) {
  const meta = getTemplateMeta(template);

  return (
    <div className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors border-b border-border/60 last:border-b-0">
      {/* Left: Info */}
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPreview(template)}
            className="text-sm font-semibold text-foreground hover:text-primary transition-colors text-left cursor-pointer"
          >
            {template.name}
          </button>

          <span className="font-mono text-[10px] uppercase font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border/60">
            {template.category}
          </span>

          <span className="text-[10px] font-mono text-muted-foreground">
            {template.slug}
          </span>

          {template.isFeatured && (
            <span className="inline-flex items-center gap-1 text-[9px] font-medium text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
              <Star className="size-2.5 fill-amber-500" />
              Featured
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground line-clamp-1 max-w-2xl">
          {template.description}
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-muted-foreground">
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
          <span>{template.fileCount} {template.fileCount === 1 ? "file" : "files"}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Users className="size-3" />
            {meta.clonesCount} clones
          </span>
          <span>•</span>
          <div className="flex gap-1">
            {meta.stackTags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-1.5 py-0.2 rounded bg-muted/60 text-[10px]">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPreview(template)}
          className="h-8 px-3 text-xs rounded-lg cursor-pointer"
        >
          <Eye className="mr-1.5 size-3 text-muted-foreground" />
          Preview
        </Button>
        <Button
          size="sm"
          onClick={() => onSelect(template)}
          className="h-8 px-3.5 text-xs font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs"
        >
          Use Template
          <ArrowRight className="ml-1.5 size-3" />
        </Button>
      </div>
    </div>
  );
}
