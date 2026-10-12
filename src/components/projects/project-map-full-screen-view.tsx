"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";

import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  Globe,
  Loader2,
  Network,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  X,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RenameProjectDialog } from "@/components/projects/rename-project-dialog";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { ProjectFileNode } from "@/components/projects/project-map-node";
import { ImageLightboxModal } from "@/components/projects/image-lightbox-modal";
import {
  buildProjectMapGraph,
  type ProjectMapFile,
  type ProjectMapNodeData,
} from "@/lib/project-map-parser";

interface ProjectMapFullScreenViewProps {
  projectId: string;
  projectName: string;
  initialFiles: ProjectMapFile[];
  initialIsPublished: boolean;
  initialPublicSlug: string | null;
  initialPublishedAt: string | Date | null;
}

const PUBLISH_DURATION_SECONDS = 30 * 60;

function InnerFullScreenProjectMap({
  projectId,
  projectName,
  initialFiles,
  initialIsPublished,
  initialPublicSlug,
  initialPublishedAt,
}: ProjectMapFullScreenViewProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { fitView, zoomIn, zoomOut, getViewport, setViewport, setCenter } =
    useReactFlow();

  const [files, setFiles] = useState<ProjectMapFile[]>(initialFiles);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  // Project action dialogs
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // File deletion dialog
  const [fileToDelete, setFileToDelete] = useState<{
    fileId: string;
    filename: string;
  } | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);

  // Image lightbox preview modal
  const [lightboxData, setLightboxData] = useState<{
    open: boolean;
    imageUrl?: string;
    filename: string;
    size?: string;
    filePath?: string;
  }>({
    open: false,
    filename: "",
  });

  // Publish / Download state
  const [isPublished, setIsPublished] = useState(initialIsPublished);
  const [publicSlug, setPublicSlug] = useState<string | null>(initialPublicSlug);
  const [publishedAt, setPublishedAt] = useState<Date | null>(
    initialPublishedAt ? new Date(initialPublishedAt) : null
  );
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Live countdown timer
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (!initialIsPublished || !initialPublishedAt) return 0;
    const elapsed = Math.floor(
      (Date.now() - new Date(initialPublishedAt).getTime()) / 1000
    );
    return Math.max(0, PUBLISH_DURATION_SECONDS - elapsed);
  });

  useEffect(() => {
    if (!isPublished || !publishedAt) {
      setRemainingSeconds(0);
      return;
    }
    const updateTimer = () => {
      const elapsed = Math.floor(
        (Date.now() - new Date(publishedAt).getTime()) / 1000
      );
      const remaining = Math.max(0, PUBLISH_DURATION_SECONDS - elapsed);
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        setIsPublished(false);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isPublished, publishedAt]);

  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  const handleOpenFile = useCallback(
    (filePath: string) => {
      router.push(
        `/project/${projectId}/build?file=${encodeURIComponent(filePath)}`
      );
    },
    [projectId, router]
  );

  const handleDeleteFile = useCallback(
    (fileId: string, filename: string) => {
      setFileToDelete({ fileId, filename });
    },
    []
  );

  const handlePreviewImage = useCallback(
    (imageUrl: string, filename: string, size: string) => {
      setLightboxData({
        open: true,
        imageUrl,
        filename,
        size,
      });
    },
    []
  );

  // Generate initial graph
  const graphResult = useMemo(() => {
    return buildProjectMapGraph(files, projectId, {
      onDeleteFile: handleDeleteFile,
      onOpenFile: handleOpenFile,
      onPreviewImage: handlePreviewImage,
    });
  }, [files, projectId, handleDeleteFile, handleOpenFile, handlePreviewImage]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ProjectMapNodeData>>(
    graphResult.nodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    graphResult.edges
  );

  // Auto-sync when files change
  useEffect(() => {
    const fresh = buildProjectMapGraph(files, projectId, {
      onDeleteFile: handleDeleteFile,
      onOpenFile: handleOpenFile,
      onPreviewImage: handlePreviewImage,
    });
    setNodes(fresh.nodes);
    setEdges(fresh.edges);

    const timer = setTimeout(() => {
      fitView({ padding: 0.22, duration: 400 });
    }, 120);
    return () => clearTimeout(timer);
  }, [files, projectId, handleDeleteFile, handleOpenFile, handlePreviewImage, setNodes, setEdges, fitView]);

  // Handle Search & Filter
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();

    setNodes((current) => {
      let firstMatch: Node<ProjectMapNodeData> | null = null;

      const updated = current.map((n) => {
        let isMatch = true;
        let isDimmed = false;

        // 1. Text search
        if (q) {
          const textMatches =
            n.data.filename.toLowerCase().includes(q) ||
            n.data.path.toLowerCase().includes(q);
          if (!textMatches) {
            isMatch = false;
            isDimmed = true;
          } else if (!firstMatch) {
            firstMatch = n;
          }
        }

        // 2. Category filter
        if (activeCategory !== "all") {
          if (activeCategory === "missing" && !n.data.isMissing) {
            isDimmed = true;
          } else if (activeCategory === "unused" && !n.data.isOrphan) {
            isDimmed = true;
          } else if (
            activeCategory !== "missing" &&
            activeCategory !== "unused" &&
            n.data.category !== activeCategory
          ) {
            isDimmed = true;
          }
        }

        return {
          ...n,
          data: {
            ...n.data,
            isHighlighted: q ? isMatch : false,
            isDimmed,
          },
        };
      });

      if (firstMatch) {
        const m = firstMatch as Node<ProjectMapNodeData>;
        setCenter(m.position.x + 130, m.position.y + 60, {
          zoom: 1.15,
          duration: 400,
        });
      }

      return updated;
    });
  }, [searchQuery, activeCategory, setCenter, setNodes]);

  const handleResetLayout = () => {
    const fresh = buildProjectMapGraph(files, projectId, {
      onDeleteFile: handleDeleteFile,
      onOpenFile: handleOpenFile,
      onPreviewImage: handlePreviewImage,
    });
    setNodes(fresh.nodes);
    setEdges(fresh.edges);
    setTimeout(() => {
      fitView({ padding: 0.22, duration: 450 });
    }, 80);
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(activeEl.tagName);

      if (e.key === "Escape") {
        if (isInput) (activeEl as HTMLElement).blur();
        setSearchQuery("");
        setActiveCategory("all");
        setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
        return;
      }

      if (isInput) return;

      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn({ duration: 150 });
        return;
      }

      if (e.key === "-") {
        e.preventDefault();
        zoomOut({ duration: 150 });
        return;
      }

      const PAN_STEP = 60;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const vp = getViewport();
        setViewport({ ...vp, y: vp.y + PAN_STEP });
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const vp = getViewport();
        setViewport({ ...vp, y: vp.y - PAN_STEP });
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const vp = getViewport();
        setViewport({ ...vp, x: vp.x + PAN_STEP });
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const vp = getViewport();
        setViewport({ ...vp, x: vp.x - PAN_STEP });
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const selected = nodes.find((n) => n.selected);
        if (selected && !selected.data.isMissing) {
          e.preventDefault();
          setFileToDelete({
            fileId: selected.data.fileId,
            filename: selected.data.filename,
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nodes, getViewport, setViewport, zoomIn, zoomOut, setNodes]);

  // File Deletion
  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    setIsDeletingFile(true);

    try {
      const res = await fetch(
        `/api/projects/${projectId}/files/${fileToDelete.fileId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete file.");
      }

      toast.success(`Deleted ${fileToDelete.filename}`);
      setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.fileId));
      router.refresh();
    } catch (err: any) {
      console.error("Delete file error:", err);
      toast.error(err.message || "Failed to delete file.");
    } finally {
      setIsDeletingFile(false);
      setFileToDelete(null);
    }
  };

  // Export as PNG
  const handleExportPng = async () => {
    const container = document.querySelector(
      ".project-map-canvas-container"
    ) as HTMLElement;
    if (!container) return;

    setIsExporting(true);
    try {
      const dataUrl = await toPng(container, {
        backgroundColor: resolvedTheme === "dark" ? "#09090b" : "#ffffff",
        quality: 0.95,
        filter: (node) => {
          if (
            node?.classList?.contains("react-flow__controls") ||
            node?.classList?.contains("project-map-no-export")
          ) {
            return false;
          }
          return true;
        },
      });

      const a = document.createElement("a");
      const safeName =
        projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "_") || "mindspace";
      a.download = `${safeName}-project-map.png`;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Project Map saved as PNG!");
    } catch (err) {
      console.error("Export PNG error:", err);
      toast.error("Failed to export image. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Publish
  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to publish project.");
      const data = await res.json();
      setIsPublished(true);
      setPublicSlug(data.publicSlug);
      setPublishedAt(new Date(data.publishedAt));
      setRemainingSeconds(PUBLISH_DURATION_SECONDS);
      toast.success("Project is live on the web for 30 minutes!");
    } catch (err) {
      console.error("Publish error:", err);
      toast.error("Failed to publish project.");
    } finally {
      setIsPublishing(false);
    }
  };

  // Download .zip
  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/download`);
      if (!res.ok) throw new Error("Failed to download project.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName =
        projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "_") || "mindspace";
      a.download = `${safeName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Downloaded project .zip");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download project zip.");
    } finally {
      setIsDownloading(false);
    }
  };

  const publicUrl = publicSlug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${publicSlug}`
    : "";

  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    toast.success("Copied public link to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const minutesLeft = Math.floor(remainingSeconds / 60);
  const secondsLeft = remainingSeconds % 60;
  const isCurrentlyLive = isPublished && remainingSeconds > 0;

  const nodeTypes = useMemo(() => ({ projectFileNode: ProjectFileNode }), []);

  const missingCount = graphResult.stats.missingFiles;
  const orphanCount = graphResult.stats.orphanFiles;

  if (files.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-card">
        <div className="size-16 rounded-2xl border border-border/80 bg-secondary/60 flex items-center justify-center text-muted-foreground mb-4 shadow-sm">
          <FileCode2 className="size-8" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          None yet — a clean slate
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Create or upload HTML, CSS, JS, or image files in the editor to see your
          connected project map come to life automatically.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button
            asChild
            className="gap-2 bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-xs"
          >
            <Link href={`/project/${projectId}/build`}>
              <Code2 className="size-4" />
              Open Editor
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/project/${projectId}`}>Back to Project</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden min-h-0 bg-background">
      {/* Top Studio Header Bar */}
      <header className="shrink-0 border-b border-border/80 bg-card/95 backdrop-blur-md px-4 sm:px-6 py-2.5 z-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Back Link & Project Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground gap-1.5"
            >
              <Link href={`/project/${projectId}`}>
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline">Back to Project</span>
              </Link>
            </Button>

            <span className="text-border h-4 w-px bg-border hidden sm:block" />

            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-flex size-7 items-center justify-center rounded-lg border border-border/80 bg-secondary text-foreground shadow-2xs"
                aria-hidden="true"
              >
                <Network className="size-3.5" />
              </span>
              <h1 className="text-sm font-bold text-foreground truncate max-w-[180px] sm:max-w-[260px] md:max-w-xs">
                {projectName}
              </h1>
              <span className="rounded-full border border-border/70 bg-secondary px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                Architecture Map
              </span>
            </div>
          </div>

          {/* Center: Search Box */}
          <div className="flex items-center gap-2 order-3 md:order-2 w-full md:w-auto">
            <div className="relative w-full md:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search files (or press Esc)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-7 rounded-lg border border-border bg-muted/40 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Key Project Actions */}
          <div className="flex flex-wrap items-center gap-1.5 order-2 md:order-3">
            <Button
              asChild
              size="sm"
              className="h-8 gap-1.5 text-xs bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-xs"
            >
              <Link href={`/project/${projectId}/build`}>
                <Code2 className="size-3.5" />
                <span>Open Editor</span>
              </Link>
            </Button>

            {isCurrentlyLive ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="h-8 gap-1.5 text-xs border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                >
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
                  </span>
                  <span>Live ({minutesLeft}m {secondsLeft.toString().padStart(2, "0")}s)</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="h-8 px-2 text-xs"
                  title="Copy link"
                >
                  {copiedLink ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  title="Open live site"
                >
                  <a href={`/p/${publicSlug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePublish}
                disabled={isPublishing}
                className="h-8 gap-1.5 text-xs border-border/80"
                title="Publish temporary test link for 30 minutes"
              >
                {isPublishing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Globe className="size-3.5" />
                )}
                <span className="hidden sm:inline">Publish (30 min)</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="h-8 gap-1.5 text-xs border-border/80"
              title="Download project as .zip"
            >
              {isDownloading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              <span className="hidden lg:inline">Download .zip</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPng}
              disabled={isExporting}
              className="h-8 gap-1.5 text-xs border-border/80"
              title="Save project map diagram as PNG image"
            >
              {isExporting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Camera className="size-3.5" />
              )}
              <span className="hidden xl:inline">Save as PNG</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setRenameOpen(true)}
              className="h-8 px-2 text-xs border-border/80"
              title="Rename project"
            >
              <Pencil className="size-3.5" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="h-8 px-2 text-xs border-border/80 text-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Delete project"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Secondary Studio Control Strip: Filters & Canvas Tools */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-2 pt-2 border-t border-border/60 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                activeCategory === "all"
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              All ({graphResult.stats.realFiles})
            </button>

            {graphResult.stats.imageCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory(activeCategory === "image" ? "all" : "image")}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors border ${
                  activeCategory === "image"
                    ? "bg-purple-500 text-white border-purple-500 font-semibold"
                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20"
                }`}
              >
                <span>Images ({graphResult.stats.imageCount})</span>
              </button>
            )}

            {graphResult.stats.cssCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory(activeCategory === "css" ? "all" : "css")}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors border ${
                  activeCategory === "css"
                    ? "bg-sky-500 text-white border-sky-500 font-semibold"
                    : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 hover:bg-sky-500/20"
                }`}
              >
                <span>CSS ({graphResult.stats.cssCount})</span>
              </button>
            )}

            {graphResult.stats.jsCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory(activeCategory === "js" ? "all" : "js")}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors border ${
                  activeCategory === "js"
                    ? "bg-emerald-500 text-white border-emerald-500 font-semibold"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                }`}
              >
                <span>JS ({graphResult.stats.jsCount})</span>
              </button>
            )}

            {missingCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory(activeCategory === "missing" ? "all" : "missing")}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors border ${
                  activeCategory === "missing"
                    ? "bg-red-500 text-white border-red-500 font-semibold"
                    : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25 hover:bg-red-500/20"
                }`}
              >
                <AlertTriangle className="size-3" />
                <span>Missing ({missingCount})</span>
              </button>
            )}

            {orphanCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory(activeCategory === "unused" ? "all" : "unused")}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors border ${
                  activeCategory === "unused"
                    ? "bg-amber-500 text-white border-amber-500 font-semibold"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/20"
                }`}
              >
                <span>Unused ({orphanCount})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fitView({ padding: 0.22, duration: 400 })}
              className="h-7 px-2 text-xs gap-1.5 border-border/70 text-muted-foreground hover:text-foreground"
              title="Fit diagram into view"
            >
              <ZoomIn className="size-3.5" />
              <span>Fit View</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetLayout}
              className="h-7 px-2 text-xs gap-1.5 border-border/70 text-muted-foreground hover:text-foreground"
              title="Re-run clean Dagre auto-layout"
            >
              <RotateCcw className="size-3.5" />
              <span>Re-align</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Full-Screen Canvas Area */}
      <div className="flex-1 w-full relative min-h-0 bg-card project-map-canvas-container overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          colorMode={resolvedTheme === "dark" ? "dark" : "light"}
          fitView
          fitViewOptions={{ padding: 0.22 }}
          minZoom={0.15}
          maxZoom={2.4}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          proOptions={{ hideAttribution: true }}
          className="bg-muted/10 selection:bg-foreground/10"
        >
          {/* Blueprint dot grid */}
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.2}
            className="!text-border/40"
          />

          <Controls
            showInteractive={false}
            className="!bg-card !border-border/80 !shadow-xs !rounded-xl overflow-hidden [&>button]:!bg-card [&>button]:!border-border/50 [&>button]:!text-foreground hover:[&>button]:!bg-secondary !m-4"
          />

          <MiniMap
            zoomable
            pannable
            nodeColor={(n) => {
              const d = n.data as ProjectMapNodeData;
              if (d?.isMissing) return "#ef4444";
              if (d?.isOrphan) return "#f59e0b";
              if (d?.category === "html") return "#f59e0b";
              if (d?.category === "css") return "#0ea5e9";
              if (d?.category === "js") return "#10b981";
              if (d?.category === "image") return "#a855f7";
              return "#71717a";
            }}
            className="!bg-card/90 !border !border-border/80 !rounded-xl !shadow-xs !hidden sm:!block !m-4"
            style={{ width: 140, height: 90 }}
          />
        </ReactFlow>

        {/* Keyboard Shortcuts Pill at bottom-left */}
        <div className="project-map-no-export absolute bottom-4 left-4 pointer-events-none hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/85 backdrop-blur-md border border-border/80 text-[11px] text-muted-foreground shadow-xs">
          <span>Shortcuts:</span>
          <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">+/-</kbd>
          <span>Zoom</span>
          <span className="text-border">•</span>
          <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">Arrows</kbd>
          <span>Pan</span>
          <span className="text-border">•</span>
          <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">Del</kbd>
          <span>Delete Node</span>
          <span className="text-border">•</span>
          <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">Esc</kbd>
          <span>Deselect</span>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      <ImageLightboxModal
        open={lightboxData.open}
        onOpenChange={(open) => setLightboxData((prev) => ({ ...prev, open }))}
        imageUrl={lightboxData.imageUrl}
        filename={lightboxData.filename}
        sizeFormatted={lightboxData.size}
        onOpenFileInEditor={() => {
          if (lightboxData.filePath) {
            handleOpenFile(lightboxData.filePath);
          }
        }}
      />

      {/* Delete File Confirmation Dialog */}
      <AlertDialog
        open={fileToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setFileToDelete(null);
        }}
      >
        <AlertDialogContent className="max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Delete {fileToDelete?.filename}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This action will permanently delete{" "}
              <strong className="text-foreground font-mono">
                {fileToDelete?.filename}
              </strong>{" "}
              from this project. Any references pointing to it in your HTML or CSS will
              be flagged as broken references.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              disabled={isDeletingFile}
              className="border-border/80 text-xs font-medium"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteFile}
              disabled={isDeletingFile}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold shadow-xs"
            >
              {isDeletingFile ? "Deleting..." : "Delete file"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Project Dialog */}
      <RenameProjectDialog
        projectId={projectId}
        currentName={projectName}
        open={renameOpen}
        onOpenChange={setRenameOpen}
        onRenamed={() => router.refresh()}
      />

      {/* Delete Project Dialog */}
      <DeleteProjectDialog
        projectId={projectId}
        projectName={projectName}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        redirectToDashboard
      />
    </div>
  );
}

export function ProjectMapFullScreenView(props: ProjectMapFullScreenViewProps) {
  return (
    <ReactFlowProvider>
      <InnerFullScreenProjectMap {...props} />
    </ReactFlowProvider>
  );
}
