"use client";

import { motion } from "framer-motion";
import { Layers, LayoutTemplate, Sparkles, User } from "lucide-react";
import type { TemplateMeta, TemplateId } from "@/lib/templates";
import { cn } from "@/lib/utils";

/** Miniature CSS "screenshot" of one template page (no image assets needed). */
function Preview({ meta }: { meta: TemplateMeta }) {
  if (meta.id === "blank") {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-t-lg bg-linear-to-br from-secondary to-secondary/60">
        <span
          className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
          aria-hidden="true"
        >
          <Sparkles className="size-4" />
        </span>
      </div>
    );
  }

  if (meta.id === "multi-page") {
    return (
      <div className="flex h-full w-full gap-1.5 rounded-t-lg bg-secondary/70 p-3" aria-hidden="true">
        {/* mini nav + page thumbnails */}
        <div className="flex flex-1 flex-col gap-1 rounded-md bg-card/90 border border-border/60 p-1.5">
          <div className="flex gap-[3px]">
            <span className="h-px w-3 bg-primary/70" />
            <span className="h-px w-2.5 bg-muted-foreground/40" />
            <span className="h-px w-2 bg-muted-foreground/30" />
          </div>
          <span className="mt-1 block h-1.5 w-4/5 rounded-sm bg-primary/20" />
          <span className="block h-1 w-3/5 rounded-sm bg-muted-foreground/25" />
          <span className="block h-1 w-2/3 rounded-sm bg-muted-foreground/20" />
        </div>
        <div className="flex w-8 flex-col gap-1 rounded-md bg-card/60 border border-border/40 p-1.5">
          <span className="block h-1 w-full rounded-sm bg-primary/15" />
          <span className="block h-1 w-4/5 rounded-sm bg-muted-foreground/20" />
          <span className="block h-1 w-3/5 rounded-sm bg-muted-foreground/15" />
        </div>
        <div className="flex w-8 flex-col gap-1 rounded-md bg-card/40 border border-border/30 p-1.5">
          <span className="block h-1 w-3/4 rounded-sm bg-muted-foreground/20" />
          <span className="block h-1 w-1/2 rounded-sm bg-muted-foreground/15" />
        </div>
      </div>
    );
  }

  const isPortfolio = meta.id === "portfolio";
  return (
    <div
      className="flex h-full w-full flex-col rounded-t-lg bg-linear-to-br from-primary/12 via-secondary to-violet-500/8 p-3"
      aria-hidden="true"
    >
      {/* mini hero */}
      <div className="rounded-md border border-border/50 bg-card/80 p-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[7px] font-medium",
            isPortfolio ? "bg-primary/12 text-primary" : "bg-violet-500/15 text-violet-400"
          )}
        >
          {isPortfolio ? "Portfolio" : "Event"}
        </span>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="block h-2 w-16 rounded-sm bg-foreground/25" />
          {isPortfolio ? (
            <span className="block h-2 w-7 rounded-sm bg-primary/50" />
          ) : (
            <span className="block h-2 w-5 rounded-sm bg-violet-500/50" />
          )}
        </div>
        <span className="mt-1 block h-1 w-24 rounded-sm bg-muted-foreground/30" />
        <span
          className={cn(
            "mt-2 block h-2.5 w-9 rounded-sm",
            isPortfolio ? "bg-primary/60" : "bg-violet-500/60"
          )}
        />
      </div>
      {/* mini sections */}
      <div className="mt-1.5 flex flex-1 gap-1.5">
        <span className="block flex-1 rounded-md border border-border/40 bg-card/50" />
        <span className="block flex-1 rounded-md border border-border/30 bg-card/35" />
        <span className="block flex-1 rounded-md border border-border/20 bg-card/25" />
      </div>
    </div>
  );
}

const TEMPLATE_ICONS = {
  portfolio: User,
  "club-event": LayoutTemplate,
  "multi-page": Layers,
} as const;

export function TemplateCard({
  meta,
  selected,
  onSelect,
  index,
}: {
  meta: TemplateMeta;
  selected: boolean;
  onSelect: (id: TemplateId) => void;
  index: number;
}) {
  const Icon = meta.id === "blank" ? Sparkles : TEMPLATE_ICONS[meta.id];

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(meta.id)}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      aria-pressed={selected}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-lg border text-left transition-[border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        selected
          ? "border-foreground shadow-[0_0_0_1px_var(--border),0_10px_32px_rgba(0,0,0,0.15)]"
          : "border-border hover:border-foreground/40 hover:-translate-y-1 hover:shadow-[0_10px_32px_rgb(0,0,0,0.09)]"
      )}
    >
      {selected ? (
        <motion.span
          layoutId="template-ring"
          className="pointer-events-none absolute inset-0 z-10 rounded-lg ring-1 ring-inset ring-primary/50"
          aria-hidden="true"
        />
      ) : null}

      <Preview meta={meta} />

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors duration-200",
              selected
                ? "border-primary/40 bg-primary/12 text-primary"
                : "border-border bg-secondary text-muted-foreground group-hover:text-foreground"
            )}
            aria-hidden="true"
          >
            <Icon className="size-3.5" />
          </span>
          <h2 className="text-sm font-medium text-foreground">{meta.name}</h2>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {meta.description}
        </p>
        <span className="mt-3 text-xs tabular-nums text-muted-foreground/70">
          {meta.fileCount === 0 ? "No starter files" : `${meta.fileCount} starter file${meta.fileCount === 1 ? "" : "s"}`}
        </span>
      </div>
    </motion.button>
  );
}
