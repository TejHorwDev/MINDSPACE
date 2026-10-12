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

import {
  Maximize2,
  RotateCcw,
  ZoomIn,
  Network,
  FileCode2,
  Code2,
  AlertTriangle,
  Info,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { ProjectFileNode } from "@/components/projects/project-map-node";
import { ImageLightboxModal } from "@/components/projects/image-lightbox-modal";
import {
  buildProjectMapGraph,
  type ProjectMapFile,
  type ProjectMapNodeData,
} from "@/lib/project-map-parser";

interface ProjectMapSectionProps {
  projectId: string;
  projectName: string;
  initialFiles: ProjectMapFile[];
}

function InnerProjectMap({
  projectId,
  projectName,
  initialFiles,
}: ProjectMapSectionProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { fitView } = useReactFlow();

  const [files, setFiles] = useState<ProjectMapFile[]>(initialFiles);
  const [fileToDelete, setFileToDelete] = useState<{
    fileId: string;
    filename: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active category filter
  const [activeCategory, setActiveCategory] = useState<string>("all");

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

  // Generate graph layout via Dagre
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

  // Auto-sync whenever files change
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

  // Filter nodes when active category changes
  useEffect(() => {
    setNodes((current) =>
      current.map((n) => {
        let isDimmed = false;
        if (activeCategory !== "all") {
          if (activeCategory === "missing") {
            isDimmed = !n.data.isMissing;
          } else if (activeCategory === "unused") {
            isDimmed = !n.data.isOrphan;
          } else {
            isDimmed = n.data.category !== activeCategory;
          }
        }
        return {
          ...n,
          data: {
            ...n.data,
            isDimmed,
          },
        };
      })
    );
  }, [activeCategory, setNodes]);

  // Execute file deletion
  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);

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
      setIsDeleting(false);
      setFileToDelete(null);
    }
  };

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
    }, 60);
  };

  const nodeTypes = useMemo(() => ({ projectFileNode: ProjectFileNode }), []);

  // Empty State: Matches the "None yet — a clean slate" style
  if (files.length === 0) {
    return (
      <Card className="rounded-2xl border border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex size-9 items-center justify-center rounded-xl border border-border/80 bg-secondary text-foreground shadow-2xs"
              aria-hidden="true"
            >
              <Network className="size-4" />
            </span>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Project Map
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Visual file relationships and visual asset map
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 sm:p-12 flex flex-col items-center justify-center text-center">
          <div className="size-12 rounded-2xl border border-border/80 bg-secondary/60 flex items-center justify-center text-muted-foreground mb-3 shadow-2xs">
            <FileCode2 className="size-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            None yet — a clean slate
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Create or upload HTML, CSS, JS, or image files in the editor to see your
            connected project map come to life automatically.
          </p>
          <Button
            size="sm"
            onClick={() => router.push(`/project/${projectId}/build`)}
            className="mt-4 gap-2 bg-foreground text-background hover:bg-foreground/90 font-medium shadow-xs"
          >
            <Code2 className="size-3.5" />
            Open Editor
          </Button>
        </CardContent>
      </Card>
    );
  }

  const missingCount = graphResult.stats.missingFiles;
  const orphanCount = graphResult.stats.orphanFiles;

  return (
    <>
      <Card className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60 bg-muted/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className="inline-flex size-9 items-center justify-center rounded-xl border border-border/80 bg-secondary text-foreground shadow-2xs"
                aria-hidden="true"
              >
                <Network className="size-4" />
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Project Map
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Visual architecture and asset relationship map auto-derived from code
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground border-border/80 shadow-2xs"
                title="Open Dedicated Full-Screen Project Map"
              >
                <Link href={`/project/${projectId}/map`}>
                  <Maximize2 className="size-3.5" />
                  <span>Expand Studio</span>
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 h-[480px] sm:h-[520px]">
          <div className="relative w-full h-full flex flex-col bg-card overflow-hidden">
            {/* Filter & Toolbar Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-border/60 bg-muted/20 text-xs">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* Category Pills */}
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

              {/* Controls */}
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
                  <span className="hidden sm:inline">Fit View</span>
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
                  <span className="hidden sm:inline">Re-align</span>
                </Button>
              </div>
            </div>

            {/* React Flow Canvas Area */}
            <div className="flex-1 w-full h-full relative">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                colorMode={resolvedTheme === "dark" ? "dark" : "light"}
                fitView
                fitViewOptions={{ padding: 0.22 }}
                minZoom={0.2}
                maxZoom={2.2}
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={true}
                proOptions={{ hideAttribution: true }}
                className="bg-muted/10 selection:bg-foreground/10"
              >
                {/* Clean dot matrix background */}
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={1.2}
                  className="!text-border/40"
                />

                {/* Zoom & Pan controls */}
                <Controls
                  showInteractive={false}
                  className="!bg-card !border-border/80 !shadow-xs !rounded-xl overflow-hidden [&>button]:!bg-card [&>button]:!border-border/50 [&>button]:!text-foreground hover:[&>button]:!bg-secondary !m-3"
                />

                {/* MiniMap */}
                {nodes.length > 2 && (
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
                    className="!bg-card/90 !border !border-border/80 !rounded-xl !shadow-xs !hidden sm:!block !m-3"
                    style={{ width: 120, height: 80 }}
                  />
                )}
              </ReactFlow>

              {/* Instructions banner */}
              <div className="absolute bottom-3 left-3 pointer-events-none hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card/85 backdrop-blur-xs border border-border/60 text-[11px] text-muted-foreground shadow-2xs">
                <Info className="size-3 text-muted-foreground" />
                <span>Click image to inspect • Click file to open in editor</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
              be flagged as missing references.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              disabled={isDeleting}
              className="border-border/80 text-xs font-medium"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteFile}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold shadow-xs"
            >
              {isDeleting ? "Deleting..." : "Delete file"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ProjectMapSection(props: ProjectMapSectionProps) {
  return (
    <ReactFlowProvider>
      <InnerProjectMap {...props} />
    </ReactFlowProvider>
  );
}
