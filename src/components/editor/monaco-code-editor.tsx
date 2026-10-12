"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Code2, FilePlus, Loader2, Sparkles, Terminal, Play, Zap, Image as ImageIcon, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getLanguageFromPath } from "./file-icon";
import type { EditorFile } from "./types";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.Editor),
  {
    ssr: false,
    loading: () => <EditorSkeleton />,
  }
);

function EditorSkeleton() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-card text-muted-foreground">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
        <span>Initializing editor...</span>
      </div>
    </div>
  );
}

type MonacoCodeEditorProps = {
  file: EditorFile | null;
  value: string;
  onChange: (value: string) => void;
  onSaveTriggered: () => void;
  onRequestNewFile: () => void;
  onQuickScaffold?: (preset: "webapp" | "html" | "python") => void;
  editorTheme?: string;
  fontSize?: number;
  tabSize?: number;
  wordWrap?: boolean;
  minimap?: boolean;
};

export function MonacoCodeEditor({
  file,
  value,
  onChange,
  onSaveTriggered,
  onRequestNewFile,
  onQuickScaffold,
  editorTheme: customTheme,
  fontSize = 14,
  tabSize = 2,
  wordWrap = true,
  minimap = false,
}: MonacoCodeEditorProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isImage = Boolean(
    file &&
      (/\.(png|jpe?g|webp|gif|svg|ico)$/i.test(file.path) ||
        (typeof value === "string" && value.startsWith("data:image/")))
  );

  if (file && isImage) {
    const imgSrc = value.startsWith("data:") ? value : file.content;
    const cleanName = file.path.split("/").pop() || file.path;

    const copyCode = (code: string, label: string) => {
      navigator.clipboard.writeText(code);
      setCopiedSnippet(label);
      toast.success(`Copied ${label}`);
      setTimeout(() => setCopiedSnippet(null), 2000);
    };

    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-card p-6 select-none overflow-y-auto">
        <div className="relative max-w-md w-full rounded-2xl border border-border/80 bg-secondary/30 p-6 flex flex-col items-center shadow-lg">
          <div className="flex items-center justify-between w-full mb-4 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <ImageIcon className="size-4 text-primary" />
              <span className="text-sm font-semibold text-foreground truncate max-w-[220px]">
                {cleanName}
              </span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground">
              {file.path.split(".").pop()?.toUpperCase()}
            </span>
          </div>

          <div className="relative max-h-72 max-w-full rounded-xl overflow-hidden border border-border/70 bg-background/50 flex items-center justify-center p-3 shadow-inner">
            <img
              src={imgSrc}
              alt={cleanName}
              className="max-h-64 max-w-full object-contain rounded"
            />
          </div>

          <div className="mt-5 w-full flex flex-col gap-2">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider text-center">
              Quick Code Snippets
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  copyCode(`<img src="${cleanName}" alt="${cleanName}">`, "HTML Tag")
                }
                className="text-xs gap-1.5 h-8 border-border/80 hover:bg-secondary"
              >
                {copiedSnippet === "HTML Tag" ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                Copy &lt;img&gt; tag
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  copyCode(`background-image: url('${cleanName}');`, "CSS Rule")
                }
                className="text-xs gap-1.5 h-8 border-border/80 hover:bg-secondary"
              >
                {copiedSnippet === "CSS Rule" ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                Copy CSS url()
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-card px-6 text-center select-none overflow-y-auto py-8">
        <div className="relative mb-5 flex size-14 items-center justify-center rounded-2xl border border-border/80 bg-secondary/60 text-muted-foreground shadow-2xs">
          <Code2 className="size-7" aria-hidden="true" />
        </div>

        <h3 className="text-lg font-bold tracking-tight text-foreground">
          MINDSPACE Code Studio
        </h3>

        <p className="mt-2 max-w-md text-xs text-muted-foreground leading-relaxed">
          Open a file from the explorer on the left, or launch your build immediately using quick scaffolding:
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {onQuickScaffold && (
            <Button
              size="sm"
              onClick={() => onQuickScaffold("webapp")}
              className="gap-2 text-xs h-8.5 px-4 font-medium bg-foreground text-background hover:bg-foreground/90 shadow-2xs rounded-lg transition-colors"
            >
              <Sparkles className="size-3.5" />
              Scaffold Starter Web Stack
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onRequestNewFile}
            className="gap-1.5 text-xs h-8.5 px-3.5 border-border/80 hover:bg-secondary rounded-lg"
          >
            <FilePlus className="size-3.5" aria-hidden="true" />
            Create File
          </Button>
        </div>

        {/* Studio Capabilities / Keyboard Shortcuts Cheat Sheet */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-lg w-full text-left">
          <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Zap className="size-3.5 text-amber-400" />
              <span>Auto-Save</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Changes sync to cloud instantly as you type.</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Play className="size-3.5 text-emerald-400" />
              <span>Run Code</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Piston sandbox runs Python, C++, Java & more.</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Terminal className="size-3.5 text-cyan-400" />
              <span>Terminal</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Interactive sandboxed shell in the browser.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return <EditorSkeleton />;
  }

  // Resolve Monaco theme: user preference if provided, else vs-dark / vs based on dark mode
  let effectiveTheme = customTheme || (resolvedTheme === "dark" ? "vs-dark" : "vs");
  if (effectiveTheme === "system") {
    effectiveTheme = resolvedTheme === "dark" ? "vs-dark" : "vs";
  }

  const language = getLanguageFromPath(file.path);

  return (
    <div className="relative h-full w-full overflow-hidden bg-card">
      <MonacoEditor
        path={file.path}
        language={language}
        value={value}
        theme={effectiveTheme}
        onChange={(val) => onChange(val ?? "")}
        onMount={(editor, monaco) => {
          // Add Ctrl+S / Cmd+S shortcut to immediately trigger auto-save flush
          editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
            () => {
              onSaveTriggered();
            }
          );
        }}
        options={{
          fontSize,
          fontFamily:
            "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontLigatures: true,
          tabSize,
          wordWrap: wordWrap ? "on" : "off",
          automaticLayout: true,
          lineNumbers: "on",
          minimap: { enabled: minimap },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: "all",
          contextmenu: true,
          renderWhitespace: "selection",
          guides: {
            indentation: true,
            bracketPairs: true,
          },
        }}
      />
    </div>
  );
}
