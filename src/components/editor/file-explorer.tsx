"use client";

import { useState, useMemo, useRef } from "react";
import {
  FilePlus,
  FolderPlus,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Pencil,
  Trash2,
  FolderTree,
  Sparkles,
  Image as ImageIcon,
  ImagePlus,
  Copy,
  Check,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileIcon } from "./file-icon";
import type { EditorFile } from "./types";

export type ProjectAssetItem = {
  id: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  url: string;
  relativePath: string;
  width?: number | null;
  height?: number | null;
};

export type TreeNode = {
  name: string;
  path: string;
  isFolder: boolean;
  file?: EditorFile;
  children: TreeNode[];
};

type FileExplorerProps = {
  files: EditorFile[];
  assets?: ProjectAssetItem[];
  activeFileId: string | null;
  onSelectFile: (file: EditorFile) => void;
  onRequestNewFile: (parentFolder?: string) => void;
  onRequestNewFolder: (parentFolder?: string) => void;
  onRequestRenameFile: (file: EditorFile) => void;
  onRequestDeleteFile: (file: EditorFile) => void;
  onUploadAsset?: (file: File) => Promise<void>;
  onDeleteAsset?: (assetId: string) => Promise<void>;
  onMoveItem?: (sourcePath: string, destFolder: string) => Promise<void>;
  onRenameFolder?: (oldPath: string, newPath: string) => Promise<void>;
  onDeleteFolder?: (folderPath: string) => Promise<void>;
  onQuickScaffold?: (preset: "webapp" | "html" | "python") => void;
};

export function FileExplorer({
  files,
  assets = [],
  activeFileId,
  onSelectFile,
  onRequestNewFile,
  onRequestNewFolder,
  onRequestRenameFile,
  onRequestDeleteFile,
  onUploadAsset,
  onDeleteAsset,
  onMoveItem,
  onRenameFolder,
  onDeleteFolder,
  onQuickScaffold,
}: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["root"])
  );
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [isAssetsExpanded, setIsAssetsExpanded] = useState<boolean>(true);
  const [copiedAssetId, setCopiedAssetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyPath = (asset: ProjectAssetItem) => {
    const snippet = `assets/${asset.filename}`;
    navigator.clipboard.writeText(snippet);
    setCopiedAssetId(asset.id);
    toast.success(`Copied path: ${snippet}`);
    setTimeout(() => setCopiedAssetId(null), 2000);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    for (let i = 0; i < fileList.length; i++) {
      onUploadAsset?.(fileList[i]);
    }
    e.target.value = "";
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  // Build hierarchical tree from flat file paths
  const fileTree = useMemo(() => {
    const rootNodes: Record<string, TreeNode> = {};

    for (const file of files) {
      // Don't show raw .gitkeep files in tree, but their folders will be constructed
      const isPlaceholder = file.path.endsWith("/.gitkeep") || file.path === ".gitkeep";
      const parts = file.path.split("/").filter(Boolean);

      let currentMap = rootNodes;
      let currentPath = "";

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (isLast && !isPlaceholder) {
          // It's a file
          currentMap[part] = {
            name: part,
            path: currentPath,
            isFolder: false,
            file,
            children: [],
          };
        } else {
          // It's a directory
          if (!currentMap[part]) {
            currentMap[part] = {
              name: part,
              path: currentPath,
              isFolder: true,
              children: [],
            };
          }
          // Convert children array to map for nested traversal
          const folderNode = currentMap[part];
          const childMap: Record<string, TreeNode> = {};
          for (const c of folderNode.children) {
            childMap[c.name] = c;
          }
          folderNode.children = Object.values(childMap);
          // Move deeper
          if (!isLast || isPlaceholder) {
            currentMap = childMap as any;
          }
        }
      }
    }

    // Convert map to sorted tree array
    function mapToSortedArray(map: Record<string, TreeNode>): TreeNode[] {
      const list = Object.values(map);
      list.forEach((node) => {
        if (node.isFolder && (node as any).childrenMap) {
          node.children = mapToSortedArray((node as any).childrenMap);
        }
      });

      return list.sort((a, b) => {
        // Folders first
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        // Primary files first
        if (a.name === "index.html" || a.name === "main.py") return -1;
        if (b.name === "index.html" || b.name === "main.py") return 1;
        return a.name.localeCompare(b.name);
      });
    }

    // Build cleaner recursive tree structure
    const root: TreeNode[] = [];
    const nodeLookup = new Map<string, TreeNode>();

    // Pass 1: Ensure all folder nodes exist
    for (const file of files) {
      const parts = file.path.split("/").filter(Boolean);
      let cumulative = "";
      for (let i = 0; i < parts.length - 1; i++) {
        const seg = parts[i];
        cumulative = cumulative ? `${cumulative}/${seg}` : seg;
        if (!nodeLookup.has(cumulative)) {
          const folderNode: TreeNode = {
            name: seg,
            path: cumulative,
            isFolder: true,
            children: [],
          };
          nodeLookup.set(cumulative, folderNode);

          const parentPath = cumulative.includes("/")
            ? cumulative.slice(0, cumulative.lastIndexOf("/"))
            : "";
          if (parentPath && nodeLookup.has(parentPath)) {
            nodeLookup.get(parentPath)!.children.push(folderNode);
          } else if (!parentPath) {
            root.push(folderNode);
          }
        }
      }
    }

    // Pass 2: Add all non-placeholder files
    for (const file of files) {
      if (file.path.endsWith("/.gitkeep") || file.path === ".gitkeep") continue;
      const parts = file.path.split("/").filter(Boolean);
      const fileName = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join("/");

      const fileNode: TreeNode = {
        name: fileName,
        path: file.path,
        isFolder: false,
        file,
        children: [],
      };

      if (parentPath && nodeLookup.has(parentPath)) {
        nodeLookup.get(parentPath)!.children.push(fileNode);
      } else {
        root.push(fileNode);
      }
    }

    // Sort recursively
    function sortTreeNodes(nodes: TreeNode[]): TreeNode[] {
      nodes.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        if (a.name === "index.html" || a.name === "main.py") return -1;
        if (b.name === "index.html" || b.name === "main.py") return 1;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach((n) => {
        if (n.isFolder) sortTreeNodes(n.children);
      });
      return nodes;
    }

    return sortTreeNodes(root);
  }, [files]);

  // Drag and drop handler
  const handleDragStart = (e: React.DragEvent, nodePath: string) => {
    e.dataTransfer.setData("text/plain", nodePath);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverFolder !== folderPath) {
      setDragOverFolder(folderPath);
    }
  };

  const handleDragLeave = () => {
    setDragOverFolder(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault();
    setDragOverFolder(null);
    const sourcePath = e.dataTransfer.getData("text/plain");
    if (!sourcePath || sourcePath === targetFolder) return;
    if (targetFolder.startsWith(`${sourcePath}/`)) return; // Prevent dropping parent into child

    if (onMoveItem) {
      await onMoveItem(sourcePath, targetFolder);
    }
  };

  // Render tree node recursively
  const renderNode = (node: TreeNode, depth = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isDragTarget = dragOverFolder === node.path;

    if (node.isFolder) {
      return (
        <div key={node.path} className="flex flex-col">
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div
                role="button"
                tabIndex={0}
                draggable
                onDragStart={(e) => handleDragStart(e, node.path)}
                onDragOver={(e) => handleDragOver(e, node.path)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, node.path)}
                onClick={() => toggleFolder(node.path)}
                className={`group flex items-center justify-between rounded-md py-1 px-1.5 text-xs transition-colors hover:bg-secondary/70 ${
                  isDragTarget ? "bg-primary/20 ring-1 ring-primary" : ""
                }`}
                style={{ paddingLeft: `${Math.max(6, depth * 14 + 6)}px` }}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  {isExpanded ? (
                    <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                  )}
                  {isExpanded ? (
                    <FolderOpen className="size-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <Folder className="size-3.5 text-amber-500 shrink-0" />
                  )}
                  <span className="truncate font-medium text-foreground/90">
                    {node.name}
                  </span>
                </div>

                <div
                  className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-5 text-muted-foreground hover:text-foreground"
                      >
                        <MoreVertical className="size-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 text-xs">
                      <DropdownMenuItem onClick={() => onRequestNewFile(node.path)}>
                        <FilePlus className="mr-2 size-3.5" />
                        New File
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onRequestNewFolder(node.path)}>
                        <FolderPlus className="mr-2 size-3.5" />
                        New Folder
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          const newName = prompt("Rename folder to:", node.name);
                          if (newName && newName !== node.name && onRenameFolder) {
                            const parent = node.path.includes("/")
                              ? node.path.slice(0, node.path.lastIndexOf("/"))
                              : "";
                            const newFullPath = parent ? `${parent}/${newName}` : newName;
                            onRenameFolder(node.path, newFullPath);
                          }
                        }}
                      >
                        <Pencil className="mr-2 size-3.5" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          if (
                            confirm(`Delete folder "${node.name}" and all its contents?`) &&
                            onDeleteFolder
                          ) {
                            onDeleteFolder(node.path);
                          }
                        }}
                      >
                        <Trash2 className="mr-2 size-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </ContextMenuTrigger>

            <ContextMenuContent className="w-40 text-xs">
              <ContextMenuItem onClick={() => onRequestNewFile(node.path)}>
                <FilePlus className="mr-2 size-3.5" />
                New File in Folder
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onRequestNewFolder(node.path)}>
                <FolderPlus className="mr-2 size-3.5" />
                New Subfolder
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => {
                  const newName = prompt("Rename folder to:", node.name);
                  if (newName && newName !== node.name && onRenameFolder) {
                    const parent = node.path.includes("/")
                      ? node.path.slice(0, node.path.lastIndexOf("/"))
                      : "";
                    const newFullPath = parent ? `${parent}/${newName}` : newName;
                    onRenameFolder(node.path, newFullPath);
                  }
                }}
              >
                <Pencil className="mr-2 size-3.5" />
                Rename Folder
              </ContextMenuItem>
              <ContextMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  if (
                    confirm(`Delete folder "${node.name}" and all contents?`) &&
                    onDeleteFolder
                  ) {
                    onDeleteFolder(node.path);
                  }
                }}
              >
                <Trash2 className="mr-2 size-3.5" />
                Delete Folder
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          {isExpanded && node.children.length > 0 && (
            <div className="flex flex-col border-l border-border/40 ml-3 pl-1">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // It's a file
    const file = node.file!;
    const isActive = file.id === activeFileId;

    return (
      <ContextMenu key={file.id}>
        <ContextMenuTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            draggable
            onDragStart={(e) => handleDragStart(e, file.path)}
            onClick={() => onSelectFile(file)}
            className={`group flex items-center justify-between rounded-md py-1 px-1.5 text-xs transition-colors ${
              isActive
                ? "bg-primary/15 font-semibold text-primary shadow-xs"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
            style={{ paddingLeft: `${Math.max(6, depth * 14 + 16)}px` }}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <FileIcon path={file.path} className="size-3.5" />
              <span className="truncate">{node.name}</span>
            </div>

            <div
              className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 text-muted-foreground hover:text-foreground"
                  >
                    <MoreVertical className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36 text-xs">
                  <DropdownMenuItem onClick={() => onRequestRenameFile(file)}>
                    <Pencil className="mr-2 size-3.5" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onRequestDeleteFile(file)}
                  >
                    <Trash2 className="mr-2 size-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-36 text-xs">
          <ContextMenuItem onClick={() => onRequestRenameFile(file)}>
            <Pencil className="mr-2 size-3.5" />
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onRequestDeleteFile(file)}
          >
            <Trash2 className="mr-2 size-3.5" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  const visibleFileCount = files.filter(
    (f) => !f.path.endsWith("/.gitkeep") && f.path !== ".gitkeep"
  ).length;

  return (
    <aside
      aria-label="Project files explorer"
      onDragOver={(e) => handleDragOver(e, "")}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, "")}
      className={`flex h-full w-64 flex-col border-r border-border bg-sidebar/70 backdrop-blur-sm select-none ${
        dragOverFolder === "" ? "bg-primary/5 ring-1 ring-inset ring-primary/40" : ""
      }`}
    >
      {/* Sidebar Header */}
      <div className="flex h-11 items-center justify-between border-b border-border/80 px-3.5">
        <div className="flex items-center gap-2">
          <FolderTree className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Explorer
          </span>
          <span className="rounded-full bg-secondary px-1.5 py-0.2 text-[10px] font-medium tabular-nums text-muted-foreground">
            {visibleFileCount}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRequestNewFile("")}
            title="New File"
            className="size-7 text-muted-foreground hover:text-foreground"
          >
            <FilePlus className="size-3.5" aria-hidden="true" />
            <span className="sr-only">New File</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRequestNewFolder("")}
            title="New Folder"
            className="size-7 text-muted-foreground hover:text-foreground"
          >
            <FolderPlus className="size-3.5" aria-hidden="true" />
            <span className="sr-only">New Folder</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            title="Upload Image Asset (JPG, PNG, WebP, GIF, SVG)"
            className="size-7 text-muted-foreground hover:text-emerald-400"
          >
            <ImagePlus className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Upload Image</span>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Hierarchical File Tree */}
      <div className="flex-1 overflow-y-auto p-1.5">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-3 py-6 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-secondary/80 text-muted-foreground border border-border/80 shadow-2xs mb-3">
              <FolderOpen className="size-5" aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold text-foreground">Project Workspace</p>
            <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
              No files yet. Start with a single file or scaffold a full starter stack:
            </p>

            <div className="mt-4 flex w-full flex-col gap-1.5">
              {onQuickScaffold && (
                <Button
                  size="sm"
                  onClick={() => onQuickScaffold("webapp")}
                  className="gap-1.5 text-xs h-8 w-full font-medium bg-foreground text-background hover:bg-foreground/90 shadow-2xs rounded-lg transition-colors"
                >
                  <Sparkles className="size-3.5" />
                  Scaffold Web App
                </Button>
              )}

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {onQuickScaffold && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onQuickScaffold("html")}
                    className="gap-1 text-[11px] h-7 border-border/80 hover:bg-secondary rounded-md"
                  >
                    + index.html
                  </Button>
                )}
                {onQuickScaffold && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onQuickScaffold("python")}
                    className="gap-1 text-[11px] h-7 border-border/80 hover:bg-secondary rounded-md"
                  >
                    + main.py
                  </Button>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRequestNewFile("")}
                className="gap-1.5 text-xs h-7 w-full text-muted-foreground hover:text-foreground mt-1"
              >
                <FilePlus className="size-3.5" aria-hidden="true" />
                Custom New File
              </Button>
            </div>
          </div>
        ) : (
          <nav className="flex flex-col gap-0.5" aria-label="Project files tree">
            {fileTree.map((node) => renderNode(node, 0))}
          </nav>
        )}

        {/* Assets Section (Photo Upload V2) */}
        <div className="mt-4 pt-3 border-t border-border/60">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsAssetsExpanded((prev) => !prev)}
            className="flex items-center justify-between rounded-md py-1 px-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-secondary/50 cursor-pointer select-none"
          >
            <div className="flex items-center gap-1.5">
              {isAssetsExpanded ? (
                <ChevronDown className="size-3 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="size-3 text-muted-foreground shrink-0" />
              )}
              <ImageIcon className="size-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-semibold text-foreground/80">Assets</span>
              <span className="rounded-full bg-secondary px-1.5 py-0.2 text-[9px] font-medium tabular-nums text-muted-foreground">
                {assets.length}
              </span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              title="Upload Photo Asset"
              className="size-5 text-muted-foreground hover:text-emerald-400"
            >
              <Upload className="size-3" />
            </Button>
          </div>

          {isAssetsExpanded && (
            <div className="mt-1 flex flex-col gap-1 pl-1">
              {assets.length === 0 ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-dashed border-border/80 p-2.5 text-center hover:border-emerald-500/50 hover:bg-emerald-500/5 cursor-pointer transition-colors"
                >
                  <p className="text-[11px] font-medium text-muted-foreground">No images yet</p>
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5">Click to upload JPG, PNG, WebP, SVG</p>
                </div>
              ) : (
                assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="group flex items-center justify-between rounded-md py-1 px-1.5 text-xs hover:bg-secondary/60 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="size-5 rounded overflow-hidden shrink-0 border border-border/80 bg-background/50 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.url}
                          alt={asset.filename}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium text-foreground/90 max-w-[100px]" title={asset.filename}>
                          {asset.filename}
                        </p>
                        <p className="text-[9px] text-muted-foreground tabular-nums">
                          {(asset.sizeBytes / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyPath(asset)}
                        title="Copy relative path (assets/filename)"
                        className="size-5 text-muted-foreground hover:text-foreground"
                      >
                        {copiedAssetId === asset.id ? (
                          <Check className="size-3 text-emerald-400" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </Button>

                      {onDeleteAsset && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteAsset(asset.id)}
                          title="Delete Asset"
                          className="size-5 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
