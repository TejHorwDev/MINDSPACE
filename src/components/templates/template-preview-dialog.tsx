"use client";

import { useState, useMemo } from "react";
import {
  ArrowRight,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  FileCode2,
  Globe,
  Layers,
  Monitor,
  RotateCw,
  Smartphone,
  Sparkles,
  Star,
  Tablet,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { bundleProjectFiles } from "@/lib/preview-bundler";
import { getTemplateMeta } from "./template-types";
import type { UnifiedTemplate } from "@/lib/templates/service";

type TemplatePreviewDialogProps = {
  template: UnifiedTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: UnifiedTemplate) => void;
};

export function TemplatePreviewDialog({
  template,
  open,
  onOpenChange,
  onSelect,
}: TemplatePreviewDialogProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "specs">("preview");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [zoom, setZoom] = useState<number>(100);
  const [selectedFilePath, setSelectedFilePath] = useState<string>("index.html");
  const [copied, setCopied] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);

  const meta = useMemo(() => {
    return template ? getTemplateMeta(template) : null;
  }, [template]);

  // Ensure default file selection
  const selectedFile = useMemo(() => {
    if (!template || template.files.length === 0) return null;
    return (
      template.files.find((f) => f.path === selectedFilePath) ||
      template.files[0]
    );
  }, [template, selectedFilePath]);

  // Bundle iframe srcDoc for simulator
  const simulatorHtml = useMemo(() => {
    if (!template) return "";
    const editorFiles = template.files.map((f) => ({
      id: f.path,
      projectId: "preview",
      name: f.path.split("/").pop() || f.path,
      path: f.path,
      content: f.content,
      isEntry: f.path === "index.html",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    return bundleProjectFiles("index.html", editorFiles, {});
  }, [template]);

  const handleCopyCode = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!template || !meta) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] sm:max-w-6xl w-full h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border-border/80 bg-card shadow-2xl">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 bg-muted/40 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-foreground">
                  {template.name}
                </DialogTitle>
                <span className="text-[10px] font-mono uppercase bg-secondary px-2 py-0.5 rounded text-muted-foreground border border-border/60">
                  {template.category}
                </span>
                {template.isFeatured && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-medium text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                    <Star className="size-2.5 fill-amber-500" />
                    Featured
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {template.description}
              </p>
            </div>
          </div>

          {/* Mode Tabs: Preview vs Code vs Specs */}
          <div className="flex items-center rounded-xl border border-border/70 bg-background/80 p-0.5 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer ${
                activeTab === "preview"
                  ? "bg-foreground text-background shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="size-3.5" />
              Live Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("code")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer ${
                activeTab === "code"
                  ? "bg-foreground text-background shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Code2 className="size-3.5" />
              Inspect Code ({template.fileCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("specs")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer ${
                activeTab === "specs"
                  ? "bg-foreground text-background shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="size-3.5" />
              Blueprint Specs
            </button>
          </div>

          {/* Top Right Action Button */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                onOpenChange(false);
                onSelect(template);
              }}
              className="h-9 px-4 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-xl shadow-xs cursor-pointer"
            >
              Use This Blueprint
              <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
          </div>
        </div>

        {/* Tab 1: Live Interactive Preview */}
        {activeTab === "preview" && (
          <div className="flex-1 flex flex-col min-h-0 bg-zinc-950">
            {/* Simulator Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/90 px-5 py-2 text-xs font-mono text-zinc-400 select-none">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-red-500/80" />
                <span className="size-2 rounded-full bg-amber-500/80" />
                <span className="size-2 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-medium text-zinc-300 text-[11px] truncate max-w-[200px]">
                  https://preview.studio/blueprint/{template.slug}
                </span>
              </div>

              {/* Device and Zoom Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setDevice("desktop")}
                    className={`flex items-center gap-1 rounded px-2.5 py-1 transition-all cursor-pointer ${
                      device === "desktop"
                        ? "bg-zinc-800 text-white font-bold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Monitor className="size-3" />
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevice("tablet")}
                    className={`flex items-center gap-1 rounded px-2.5 py-1 transition-all cursor-pointer ${
                      device === "tablet"
                        ? "bg-zinc-800 text-white font-bold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Tablet className="size-3" />
                    Tablet
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevice("mobile")}
                    className={`flex items-center gap-1 rounded px-2.5 py-1 transition-all cursor-pointer ${
                      device === "mobile"
                        ? "bg-zinc-800 text-white font-bold"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Smartphone className="size-3" />
                    Mobile
                  </button>
                </div>

                {/* Zoom Switcher */}
                <div className="hidden sm:flex items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5 text-[10px]">
                  {[100, 75, 50].map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setZoom(z)}
                      className={`rounded px-2 py-1 transition-all cursor-pointer ${
                        zoom === z
                          ? "bg-zinc-800 text-white font-bold"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {z}%
                    </button>
                  ))}
                </div>

                {/* Reload Simulator */}
                <button
                  type="button"
                  onClick={() => setIframeKey((prev) => prev + 1)}
                  className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  title="Reload simulator"
                >
                  <RotateCw className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Sandbox Canvas */}
            <div className="flex-1 p-4 sm:p-6 flex items-center justify-center overflow-auto studio-grid-bg">
              <div
                className={`h-full transition-all duration-300 rounded-xl overflow-hidden shadow-2xl border border-zinc-800 bg-white ${
                  device === "mobile"
                    ? "w-[390px] max-h-[750px]"
                    : device === "tablet"
                    ? "w-[820px] max-h-[800px]"
                    : "w-full max-w-[1300px]"
                }`}
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "center center",
                }}
              >
                <iframe
                  key={iframeKey}
                  title="Template Live Preview"
                  srcDoc={simulatorHtml}
                  className="w-full h-full border-0 bg-white"
                  sandbox="allow-scripts allow-modals allow-same-origin"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Code & File Tree Inspector */}
        {activeTab === "code" && (
          <div className="flex-1 flex min-h-0 bg-zinc-950">
            {/* Left Column: File Tree */}
            <div className="w-56 sm:w-64 border-r border-zinc-800 bg-zinc-900/60 p-3 space-y-2 shrink-0 overflow-y-auto">
              <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider px-2">
                Project Files ({template.files.length})
              </div>
              <div className="space-y-1">
                {template.files.map((file) => {
                  const active = file.path === selectedFile?.path;
                  return (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => setSelectedFilePath(file.path)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all text-left cursor-pointer ${
                        active
                          ? "bg-zinc-800 text-white font-bold border border-zinc-700/80 shadow-2xs"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <FileCode2 className="size-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{file.path}</span>
                      </span>
                      <span className="text-[9px] text-zinc-600">
                        {Math.ceil(file.content.length / 1024)}kb
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Code Viewer */}
            <div className="flex-1 flex flex-col min-h-0 bg-zinc-950">
              <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 py-2 text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <FileCode2 className="size-3.5 text-emerald-400" />
                  <span className="font-semibold text-zinc-200">
                    {selectedFile?.path}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    ({selectedFile?.content.split("\n").length} lines)
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyCode}
                  className="h-7 px-2.5 text-[11px] rounded bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="mr-1 size-3 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 size-3" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>

              <div className="flex-1 p-4 overflow-auto font-mono text-xs text-zinc-300 leading-relaxed bg-zinc-950">
                <pre className="select-text whitespace-pre-wrap">
                  {selectedFile?.content}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Blueprint Specs & Features */}
        {activeTab === "specs" && (
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6 bg-card text-foreground">
            <div className="max-w-3xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Blueprint Specifications & Overview
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Everything you need to know about this template before launching in the MINDSPACE studio.
                </p>
              </div>

              {/* Features List */}
              <div className="rounded-xl border border-border/80 bg-background/50 p-5 space-y-3">
                <span className="text-xs font-semibold text-foreground">
                  Included Features & Capabilities
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {meta.features.map((feat) => (
                    <div key={feat} className="flex items-center gap-2 text-muted-foreground">
                      <Check className="size-3.5 text-emerald-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border/80 bg-background/50 p-4 space-y-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">
                    Difficulty
                  </span>
                  <div className="text-sm font-bold text-foreground">{meta.difficulty}</div>
                </div>
                <div className="rounded-xl border border-border/80 bg-background/50 p-4 space-y-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">
                    Est. Setup Time
                  </span>
                  <div className="text-sm font-bold text-foreground">{meta.estTime}</div>
                </div>
                <div className="rounded-xl border border-border/80 bg-background/50 p-4 space-y-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">
                    Total Files
                  </span>
                  <div className="text-sm font-bold text-foreground">{template.fileCount}</div>
                </div>
                <div className="rounded-xl border border-border/80 bg-background/50 p-4 space-y-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">
                    Community Clones
                  </span>
                  <div className="text-sm font-bold text-foreground">{meta.clonesCount}</div>
                </div>
              </div>

              {/* Stack & Customization */}
              <div className="rounded-xl border border-border/80 bg-background/50 p-5 space-y-3 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Customization & Editing Workflow</span>
                <p>
                  Once cloned, all project files reside in your private workspace. You can edit HTML markup, tweak CSS variables, test responsive rendering in the live preview iframe, and publish to a live link on <code>/p/[slug]</code> anytime with a single click.
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
