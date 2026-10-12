"use client";

import { useState, useMemo } from "react";
import { ArrowRight, Eye, Flame, Monitor, Smartphone, Tablet, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTemplateMeta } from "./template-types";
import { bundleProjectFiles } from "@/lib/preview-bundler";
import type { UnifiedTemplate } from "@/lib/templates/service";

type TemplateSpotlightProps = {
  template: UnifiedTemplate;
  onPreview: (template: UnifiedTemplate) => void;
  onSelect: (template: UnifiedTemplate) => void;
};

export function TemplateSpotlight({ template, onPreview, onSelect }: TemplateSpotlightProps) {
  const meta = getTemplateMeta(template);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const previewHtml = useMemo(() => {
    try {
      const editorFiles = template.files.map((f) => ({
        id: f.path,
        projectId: "spotlight-preview",
        name: f.path.split("/").pop() || f.path,
        path: f.path,
        content: f.content,
        isEntry: f.path === "index.html",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      const raw = bundleProjectFiles("index.html", editorFiles, {});
      const cleanStyles = `
        <style>
          html, body {
            overflow: hidden !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          ::-webkit-scrollbar { display: none !important; }
        </style>
      `;
      if (raw.includes("</head>")) {
        return raw.replace("</head>", `${cleanStyles}</head>`);
      }
      return `${cleanStyles}${raw}`;
    } catch {
      return "";
    }
  }, [template]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs transition-all hover:border-foreground/30">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Template Details */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-500 border border-amber-500/20">
              <Flame className="size-3" />
              Editor's Choice
            </span>
            <span className="text-[10px] font-mono uppercase bg-secondary px-2 py-0.5 rounded text-muted-foreground border border-border/60">
              {template.category}
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {template.name}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {template.description}
            </p>
          </div>

          {/* Key Features Bullet List */}
          <div className="space-y-1 text-xs">
            {meta.features.slice(0, 2).map((feat) => (
              <div key={feat} className="flex items-center gap-2 text-foreground/80">
                <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                <span className="text-[11px] line-clamp-1">{feat}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Button
              size="sm"
              onClick={() => onSelect(template)}
              className="h-8 px-4 font-semibold text-xs bg-foreground text-background hover:bg-foreground/90 shadow-xs rounded-lg cursor-pointer"
            >
              Launch in Studio
              <ArrowRight className="ml-1.5 size-3" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onPreview(template)}
              className="h-8 px-3 text-xs font-medium border-border/80 rounded-lg cursor-pointer"
            >
              <Eye className="mr-1.5 size-3 text-muted-foreground" />
              Preview & Code
            </Button>
          </div>
        </div>

        {/* Right Column: Interactive Browser Frame */}
        <div className="lg:col-span-7 relative rounded-lg overflow-hidden border border-border/80 bg-zinc-950 shadow-md">
          {/* Top Window Bar with Device Mode Selector */}
          <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-400 font-mono select-none">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-red-500/80" />
              <span className="size-1.5 rounded-full bg-amber-500/80" />
              <span className="size-1.5 rounded-full bg-emerald-500/80" />
              <span className="ml-1 text-[10px] text-zinc-300 font-medium truncate max-w-[150px]">
                blueprint/{template.slug}
              </span>
            </div>

            {/* Quick Device Mode Pills */}
            <div className="flex items-center rounded border border-zinc-800 bg-zinc-950 p-0.5 text-[9px]">
              <button
                type="button"
                onClick={() => setDevice("desktop")}
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition-all ${
                  device === "desktop"
                    ? "bg-zinc-800 text-white font-bold"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                title="Desktop view"
              >
                <Monitor className="size-2.5" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setDevice("tablet")}
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition-all ${
                  device === "tablet"
                    ? "bg-zinc-800 text-white font-bold"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                title="Tablet view"
              >
                <Tablet className="size-2.5" />
                <span>Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setDevice("mobile")}
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition-all ${
                  device === "mobile"
                    ? "bg-zinc-800 text-white font-bold"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                title="Mobile view"
              >
                <Smartphone className="size-2.5" />
                <span>Mobile</span>
              </button>
            </div>
          </div>

          {/* Screen Container */}
          <div className="bg-zinc-950 p-2 flex items-center justify-center min-h-[180px] max-h-[210px] overflow-hidden">
            <div
              className={`h-[190px] transition-all duration-300 rounded border border-zinc-800 bg-white shadow-sm overflow-hidden ${
                device === "mobile"
                  ? "w-[200px]"
                  : device === "tablet"
                  ? "w-[340px]"
                  : "w-full"
              }`}
            >
              <iframe
                title="Spotlight Sandbox"
                srcDoc={previewHtml}
                className="w-full h-full border-0 bg-white pointer-events-auto"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
