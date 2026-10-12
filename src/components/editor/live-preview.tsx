"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Code2,
  ExternalLink,
  FileCode2,
  FilePlus,
  Laptop,
  Lock,
  MousePointerClick,
  RefreshCw,
  Smartphone,
  Sparkles,
  Tablet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bundleProjectFiles, normalizePath } from "@/lib/preview-bundler";
import type { EditorFile } from "./types";

type DeviceMode = "full" | "tablet" | "mobile";

export type VisualEditEvent = {
  filePath: string;
  mindspaceId: string;
  text?: string;
  styles?: Record<string, string>;
  reorder?: {
    movedId: string;
    targetId: string;
    position: "before" | "after";
  };
  imageChange?: {
    mindspaceId: string;
    src: string;
    isBackground?: boolean;
  };
  uploadPhoto?: {
    mindspaceId: string;
    filename: string;
    fileType: string;
    fileSize: number;
    dataUrl: string;
    isBackground?: boolean;
  };
};

type LivePreviewProps = {
  files: EditorFile[];
  fileContents: Record<string, string>;
  activeFileId: string | null;
  className?: string;
  isResizing?: boolean;
  lastSwappedImage?: { mindspaceId: string; url: string; isBackground?: boolean } | null;
  onQuickScaffold?: (preset: "webapp" | "html" | "python") => void;
  onVisualEdit?: (event: VisualEditEvent) => void;
};

export function LivePreview({
  files,
  fileContents,
  activeFileId,
  className = "",
  isResizing = false,
  lastSwappedImage,
  onQuickScaffold,
  onVisualEdit,
}: LivePreviewProps) {
  // Find all available HTML pages in the project
  const htmlFiles = useMemo(() => {
    return files.filter(
      (f) => f.path.endsWith(".html") || f.path.endsWith(".htm")
    );
  }, [files]);

  // Active HTML file being previewed
  const [selectedHtmlPath, setSelectedHtmlPath] = useState<string>(() => {
    const indexFile = htmlFiles.find((f) => f.path === "index.html");
    return indexFile ? indexFile.path : htmlFiles[0]?.path ?? "index.html";
  });

  // Keep track of runtime JS error reported by iframe
  const [runtimeError, setRuntimeError] = useState<{
    message: string;
    lineno: number;
  } | null>(null);

  // Automatically sync preview page if user is actively editing another HTML file
  useEffect(() => {
    if (!activeFileId) return;
    const activeFile = files.find((f) => f.id === activeFileId);
    if (activeFile && (activeFile.path.endsWith(".html") || activeFile.path.endsWith(".htm"))) {
      setSelectedHtmlPath(activeFile.path);
    }
  }, [activeFileId, files]);

  // If selectedHtmlPath was deleted, fall back to index.html or first HTML
  useEffect(() => {
    if (htmlFiles.length > 0 && !htmlFiles.some((f) => f.path === selectedHtmlPath)) {
      const fallback = htmlFiles.find((f) => f.path === "index.html") ?? htmlFiles[0];
      setSelectedHtmlPath(fallback.path);
    }
  }, [htmlFiles, selectedHtmlPath]);

  // Visual Edit Mode: OFF by default so normal preview browsing isn't intercepted
  const [isVisualEditMode, setIsVisualEditMode] = useState<boolean>(false);

  // In-memory bundled HTML & states
  const [renderedHtml, setRenderedHtml] = useState<string>(() =>
    bundleProjectFiles(selectedHtmlPath, files, fileContents, { isEditorPreview: true })
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("full");

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isFirstMountRef = useRef(true);
  const isInternalVisualEditRef = useRef(false);

  // Sync visual edit mode state with iframe whenever mode or iframe changes
  const syncVisualEditModeToIframe = useCallback((enabled: boolean) => {
    try {
      console.log("[MINDSPACE LivePreview -> Iframe] Sending MINDSPACE_SET_VISUAL_EDIT_MODE:", enabled);
      iframeRef.current?.contentWindow?.postMessage(
        { type: "MINDSPACE_SET_VISUAL_EDIT_MODE", enabled },
        "*"
      );
    } catch (err) {
      console.warn("[MINDSPACE Preview] Could not sync visual edit mode to iframe:", err);
    }
  }, []);

  const handleToggleVisualEdit = useCallback((enabled: boolean) => {
    setIsVisualEditMode(enabled);
    syncVisualEditModeToIframe(enabled);
  }, [syncVisualEditModeToIframe]);

  // Inform iframe when an image swap is confirmed by parent
  useEffect(() => {
    if (lastSwappedImage) {
      console.log("[MINDSPACE LivePreview -> Iframe] Sending MINDSPACE_IMAGE_SWAP_CONFIRMED:", lastSwappedImage);
      try {
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: "MINDSPACE_IMAGE_SWAP_CONFIRMED",
            mindspaceId: lastSwappedImage.mindspaceId,
            url: lastSwappedImage.url,
            isBackground: lastSwappedImage.isBackground,
          },
          "*"
        );
      } catch (err) {
        console.warn("[MINDSPACE Preview] Could not send image swap confirmation to iframe:", err);
      }
    }
  }, [lastSwappedImage]);

  // Debounced auto-update: 500ms after user pauses typing in Monaco.
  // CRITICAL: When the change originated from the visual editor inside preview,
  // do NOT reload the iframe (prevents cursor jump, loss of selection, and reload flicker).
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    if (isInternalVisualEditRef.current) {
      isInternalVisualEditRef.current = false;
      return;
    }

    setIsUpdating(true);
    const timer = setTimeout(() => {
      const bundled = bundleProjectFiles(selectedHtmlPath, files, fileContents, { isEditorPreview: true });
      setRenderedHtml(bundled);
      setIsUpdating(false);
      setRuntimeError(null);
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedHtmlPath, files, fileContents]);

  // Listen for internal navigation, runtime errors, and visual edits from sandboxed iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate that message source is strictly this preview iframe
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) {
        return;
      }

      if (!event.data || typeof event.data !== "object") return;
      const type = event.data.type;

      // 0. Iframe handshake: iframe loaded and ready for mode state
      if (type === "MINDSPACE_PREVIEW_IFRAME_READY") {
        console.log("[MINDSPACE LivePreview <- Iframe] Handshake received: MINDSPACE_PREVIEW_IFRAME_READY");
        syncVisualEditModeToIframe(isVisualEditMode);
        return;
      }

      // 1. Internal link click navigation
      if (
        type === "MINDSPACE_PREVIEW_NAVIGATE" &&
        typeof event.data.path === "string"
      ) {
        console.log("[MINDSPACE LivePreview <- Iframe] Internal navigation requested:", event.data.path);
        const targetPath = normalizePath(event.data.path);
        const matched = htmlFiles.find(
          (f) => normalizePath(f.path) === targetPath
        );
        if (matched) {
          setSelectedHtmlPath(matched.path);
          setRenderedHtml(bundleProjectFiles(matched.path, files, fileContents, { isEditorPreview: true }));
          setRuntimeError(null);
        }
        return;
      }

      // 2. Runtime script errors
      if (type === "MINDSPACE_PREVIEW_RUNTIME_ERROR") {
        const msg = String(event.data.message || "Script execution error");
        if (
          msg.includes("SecurityError") &&
          (msg.includes("localStorage") || msg.includes("sessionStorage") || msg.includes("cookie"))
        ) {
          return;
        }
        setRuntimeError({
          message: msg,
          lineno: Number(event.data.lineno || 0),
        });
        return;
      }

      // 3. Visual Edit: In-preview Text Edit
      if (type === "MINDSPACE_VISUAL_TEXT_CHANGE") {
        console.log("[MINDSPACE LivePreview <- Iframe] Received MINDSPACE_VISUAL_TEXT_CHANGE:", {
          mindspaceId: event.data.mindspaceId,
          textLength: typeof event.data.text === "string" ? event.data.text.length : 0,
        });
        if (!event.data.mindspaceId || typeof event.data.text !== "string") {
          console.warn("[MINDSPACE Visual Edit] Malformed MINDSPACE_VISUAL_TEXT_CHANGE message:", event.data);
          return;
        }
        isInternalVisualEditRef.current = true;
        onVisualEdit?.({
          filePath: selectedHtmlPath,
          mindspaceId: event.data.mindspaceId,
          text: event.data.text,
        });
        return;
      }

      // 4. Visual Edit: In-preview Style Change
      if (type === "MINDSPACE_VISUAL_STYLE_CHANGE") {
        console.log("[MINDSPACE LivePreview <- Iframe] Received MINDSPACE_VISUAL_STYLE_CHANGE:", {
          mindspaceId: event.data.mindspaceId,
          styles: event.data.styles,
        });
        if (!event.data.mindspaceId || !event.data.styles || typeof event.data.styles !== "object") {
          console.warn("[MINDSPACE Visual Edit] Malformed MINDSPACE_VISUAL_STYLE_CHANGE message:", event.data);
          return;
        }
        isInternalVisualEditRef.current = true;
        onVisualEdit?.({
          filePath: selectedHtmlPath,
          mindspaceId: event.data.mindspaceId,
          styles: event.data.styles as Record<string, string>,
        });
        return;
      }


      // 6. Visual Edit: Inline Photo Upload Request (Step 3)
      if (type === "MINDSPACE_VISUAL_UPLOAD_PHOTO") {
        console.log("[MINDSPACE LivePreview <- Iframe] Received MINDSPACE_VISUAL_UPLOAD_PHOTO:", {
          mindspaceId: event.data.mindspaceId,
          filename: event.data.filename,
          fileType: event.data.fileType,
          fileSize: event.data.fileSize,
          isBackground: event.data.isBackground,
        });
        if (!event.data.mindspaceId || !event.data.dataUrl) {
          console.warn("[MINDSPACE Visual Edit] Malformed MINDSPACE_VISUAL_UPLOAD_PHOTO message:", event.data);
          return;
        }
        // Do NOT suppress bundle update for photo upload so preview always syncs
        onVisualEdit?.({
          filePath: selectedHtmlPath,
          mindspaceId: event.data.mindspaceId,
          uploadPhoto: {
            mindspaceId: event.data.mindspaceId,
            filename: event.data.filename || "image.png",
            fileType: event.data.fileType || "image/png",
            fileSize: Number(event.data.fileSize || 0),
            dataUrl: event.data.dataUrl,
            isBackground: Boolean(event.data.isBackground),
          },
        });
        return;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [htmlFiles, files, fileContents, selectedHtmlPath, isVisualEditMode, onVisualEdit, syncVisualEditModeToIframe]);

  // User manually selects page from dropdown: switch immediately without waiting
  const handlePageSelect = useCallback(
    (newPath: string) => {
      setSelectedHtmlPath(newPath);
      setRenderedHtml(bundleProjectFiles(newPath, files, fileContents, { isEditorPreview: true }));
      setIsUpdating(false);
      setRuntimeError(null);
    },
    [files, fileContents]
  );

  // Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    setIsUpdating(true);
    setRuntimeError(null);
    const freshBundle = bundleProjectFiles(selectedHtmlPath, files, fileContents, { isEditorPreview: true });
    setRenderedHtml(freshBundle);
    setIframeKey((k) => k + 1);
    setTimeout(() => {
      setIsUpdating(false);
      syncVisualEditModeToIframe(isVisualEditMode);
    }, 200);
  }, [selectedHtmlPath, files, fileContents, isVisualEditMode, syncVisualEditModeToIframe]);

  // Open in new tab handler (standalone clean bundle without editor toolbar)
  const handleOpenInNewTab = useCallback(() => {
    const bundled = bundleProjectFiles(selectedHtmlPath, files, fileContents, { isEditorPreview: false });
    const blob = new Blob([bundled], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }, [selectedHtmlPath, files, fileContents]);

  return (
    <section
      aria-label="Live Site Preview"
      className={`relative flex h-full flex-col border-l border-border bg-card/60 backdrop-blur-sm select-none ${className}`}
    >
      {/* Preview Header Bar */}
      <div className="flex h-11 items-center justify-between border-b border-border/80 px-3 bg-muted/20">
        {/* Left: Status Badge & Page Selector */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex items-center gap-1.5 shrink-0"
            role="status"
            title={
              isUpdating
                ? "Compiling changes in real-time..."
                : runtimeError
                ? `Runtime error: ${runtimeError.message}`
                : "Live preview is up to date"
            }
          >
            <span
              className={`size-2 rounded-full ${
                isUpdating
                  ? "bg-amber-400 animate-pulse"
                  : runtimeError
                  ? "bg-destructive animate-pulse"
                  : "bg-emerald-500"
              }`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline text-xs font-medium text-foreground">
              {isUpdating ? "Updating…" : "Live Preview"}
            </span>
          </div>

          {runtimeError && (
            <div
              className="flex items-center gap-1.5 text-[11px] text-destructive bg-destructive/10 px-2 py-0.5 rounded-md truncate max-w-[160px] sm:max-w-[220px]"
              title={`Line ${runtimeError.lineno}: ${runtimeError.message}`}
            >
              <AlertTriangle className="size-3 shrink-0" />
              <span className="truncate">Error: {runtimeError.message}</span>
              <button
                type="button"
                onClick={() => setRuntimeError(null)}
                className="ml-0.5 hover:opacity-75 text-xs font-bold leading-none"
                title="Dismiss error notice"
              >
                ×
              </button>
            </div>
          )}

          <div className="h-3.5 w-px bg-border shrink-0" aria-hidden="true" />

          {/* HTML Page Switcher */}
          {htmlFiles.length > 1 ? (
            <Select
              value={selectedHtmlPath}
              onValueChange={handlePageSelect}
            >
              <SelectTrigger
                size="sm"
                className="h-7 text-xs border-border/80 bg-background/80 hover:bg-background px-2 gap-1.5 max-w-[130px] sm:max-w-[170px]"
                aria-label="Select preview page"
              >
                <FileCode2 className="size-3 text-primary shrink-0" />
                <SelectValue placeholder="Select page" />
              </SelectTrigger>
              <SelectContent align="start">
                {htmlFiles.map((f) => (
                  <SelectItem key={f.id} value={f.path} className="text-xs">
                    {f.path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono truncate">
              <FileCode2 className="size-3 text-primary shrink-0" />
              {selectedHtmlPath}
            </span>
          )}
        </div>

        {/* Right: Visual Edit Toggle, Device View Presets, Reload, & Open in New Tab */}
        <div className="flex items-center gap-1.5">
          {/* Visual Edit / Code Toggle */}
          <div className="flex items-center rounded-md border border-border/70 bg-muted/50 p-0.5">
            <button
              type="button"
              onClick={() => handleToggleVisualEdit(false)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-xs transition-all ${
                !isVisualEditMode
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Code / Normal Preview (browse links and forms normally)"
            >
              <Code2 className="size-3" />
              <span>Code</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleVisualEdit(true)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-xs transition-all ${
                isVisualEditMode
                  ? "bg-violet-600 text-white shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
              title="Visual Edit Mode (click text to edit inline, click elements for style toolbar)"
            >
              <MousePointerClick className="size-3" />
              <span>Visual Edit</span>
            </button>
          </div>

          <div className="h-3.5 w-px bg-border shrink-0" aria-hidden="true" />

          {/* Responsive device switchers */}
          <div className="hidden lg:flex items-center rounded-md border border-border/60 bg-muted/40 p-0.5 mr-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeviceMode("full")}
              className={`size-6 rounded-xs ${
                deviceMode === "full"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Desktop (full width)"
            >
              <Laptop className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeviceMode("tablet")}
              className={`size-6 rounded-xs ${
                deviceMode === "tablet"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Tablet (768px)"
            >
              <Tablet className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeviceMode("mobile")}
              className={`size-6 rounded-xs ${
                deviceMode === "mobile"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Mobile (375px)"
            >
              <Smartphone className="size-3" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleManualRefresh}
            className="size-7 text-muted-foreground hover:text-foreground"
            title="Reload preview"
          >
            <RefreshCw
              className={`size-3.5 ${isUpdating ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span className="sr-only">Reload preview</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenInNewTab}
            className="size-7 text-muted-foreground hover:text-foreground"
            title="Open in new tab (full screen)"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Open preview in new tab</span>
          </Button>
        </div>
      </div>

      {/* Visual Edit Status Sub-banner */}
      {isVisualEditMode && (
        <div className="flex h-7 items-center justify-between border-b border-violet-500/25 bg-violet-950/40 px-3 text-[11px] text-violet-200 shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <span className="size-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="font-semibold text-violet-300">Visual Edit Mode:</span>
            <span className="text-violet-200/80 truncate">
              Click any text to edit inline &bull; Click element to adjust styles &bull; Auto-syncs with Monaco code
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleToggleVisualEdit(false)}
            className="text-[10px] text-violet-300 hover:text-white underline shrink-0 ml-2 cursor-pointer font-medium"
          >
            Exit Visual Edit
          </button>
        </div>
      )}

      {/* Main Preview Container */}
      <div className="relative flex-1 overflow-auto bg-muted/20 p-2 sm:p-3 flex items-center justify-center">
        {/* If the user is dragging the split resize handle, an invisible layer prevents iframe from intercepting mouse */}
        {isResizing && <div className="absolute inset-0 z-50 cursor-col-resize" />}

        {htmlFiles.length === 0 ? (
          <div
            className={`h-full transition-all duration-200 overflow-hidden rounded-xl border border-border/80 bg-card/90 backdrop-blur-md shadow-2xl flex flex-col ${
              deviceMode === "full"
                ? "w-full"
                : deviceMode === "tablet"
                ? "w-[768px] max-w-full"
                : "w-[375px] max-w-full"
            }`}
          >
            {/* Simulated Browser Chrome */}
            <div className="flex h-9 items-center justify-between border-b border-border/70 bg-muted/40 px-3.5 select-none shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-rose-500/80 inline-block" />
                <span className="size-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="size-2.5 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/80 px-3 py-0.5 text-[11px] font-mono text-muted-foreground max-w-[260px] truncate shadow-2xs">
                <Lock className="size-2.5 text-emerald-400 shrink-0" />
                <span className="truncate">mindspace.local/preview</span>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground/60 uppercase">
                {deviceMode}
              </div>
            </div>

            {/* Obsidian Canvas Body */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden bg-card">
              <div className="relative mb-5 flex size-14 items-center justify-center rounded-2xl border border-border/80 bg-secondary/60 text-muted-foreground shadow-2xs">
                <Sparkles className="size-7" />
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-secondary/50 px-3 py-1 text-[11px] font-mono text-muted-foreground mb-3">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Live Preview Ready
              </div>

              <h3 className="text-base font-bold tracking-tight text-foreground">
                No HTML Entry Point Found
              </h3>

              <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
                Live Preview compiles and hot-reloads your application as you write HTML, CSS, and JavaScript. Create an entry file or scaffold a starter stack:
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {onQuickScaffold && (
                  <Button
                    size="sm"
                    onClick={() => onQuickScaffold("webapp")}
                    className="gap-1.5 text-xs h-8 px-3.5 font-medium bg-foreground text-background hover:bg-foreground/90 shadow-2xs rounded-lg transition-colors"
                  >
                    <Sparkles className="size-3.5" />
                    Scaffold Web App (HTML+CSS+JS)
                  </Button>
                )}
                {onQuickScaffold && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onQuickScaffold("html")}
                    className="gap-1.5 text-xs h-8 px-3 border-border/80 hover:bg-secondary rounded-lg"
                  >
                    <FilePlus className="size-3.5" />
                    + index.html
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`h-full transition-all duration-200 overflow-hidden rounded-xl border border-border/80 shadow-2xl bg-white flex flex-col ${
              deviceMode === "full"
                ? "w-full"
                : deviceMode === "tablet"
                ? "w-[768px] max-w-full"
                : "w-[375px] max-w-full"
            }`}
          >
            {/* Sleek Browser Frame Top Mini Bar */}
            <div className="flex h-8 items-center justify-between border-b border-border/80 bg-zinc-900 px-3 select-none shrink-0 text-zinc-300">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-500/80 inline-block" />
                <span className="size-2 rounded-full bg-yellow-500/80 inline-block" />
                <span className="size-2 rounded-full bg-green-500/80 inline-block" />
              </div>
              <div className="flex items-center gap-1.5 rounded-sm border border-zinc-700/60 bg-zinc-800/80 px-2.5 py-0.5 text-[10px] font-mono text-zinc-400 max-w-[260px] truncate">
                <Lock className="size-2.5 text-emerald-400 shrink-0" />
                <span className="truncate">mindspace.local/{selectedHtmlPath}</span>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase">
                {deviceMode}
              </div>
            </div>

            <iframe
              key={iframeKey}
              ref={iframeRef}
              title="Sandboxed Live Preview"
              srcDoc={renderedHtml}
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads allow-popups"
              className={`h-full w-full border-0 bg-white ${
                isResizing ? "pointer-events-none" : ""
              }`}
            />
          </div>
        )}
      </div>
    </section>
  );
}
