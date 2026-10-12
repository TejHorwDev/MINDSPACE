"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { EditorTopBar } from "./editor-top-bar";
import { FileExplorer } from "./file-explorer";
import { LivePreview, type VisualEditEvent } from "./live-preview";
import {
  applyVisualTextEdit,
  applyVisualInlineStyleEdit,
  applyVisualImageChange,
  applyVisualReorder,
} from "@/lib/visual-edit-engine";
import { normalizePath } from "@/lib/preview-bundler";
import dynamic from "next/dynamic";
import { MonacoCodeEditor } from "./monaco-code-editor";
import { ExecutionConsole } from "./execution-console";
import { NewFileDialog } from "./dialogs/new-file-dialog";
import { NewFolderDialog } from "./dialogs/new-folder-dialog";
import { RenameFileDialog } from "./dialogs/rename-file-dialog";
import { DeleteFileDialog } from "./dialogs/delete-file-dialog";
import type { FileSnapshot } from "./dialogs/version-history-dialog";
import type { EditorFile, ProjectMeta, SaveStatus, AccountPlanInfo } from "./types";

// Heavy components dynamically imported on-demand to minimize initial page bundle
const TerminalPanel = dynamic(
  () => import("./terminal-panel").then((mod) => mod.TerminalPanel),
  { ssr: false }
);

const AiChatPanel = dynamic(
  () => import("./ai-chat-panel").then((mod) => mod.AiChatPanel),
  { ssr: false }
);

const VersionHistoryDialog = dynamic(
  () =>
    import("./dialogs/version-history-dialog").then(
      (mod) => mod.VersionHistoryDialog
    ),
  { ssr: false }
);
import type { CodeRunResult } from "@/lib/piston";
import type { SafeUserSettings } from "@/lib/user-settings";

type ProjectEditorProps = {
  project: ProjectMeta;
  initialFiles: EditorFile[];
  initialActiveFilePath?: string;
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  accountPlan?: AccountPlanInfo | null;
  initialCredits?: number | null;
};

export function ProjectEditor({
  project,
  initialFiles,
  initialActiveFilePath,
  user,
  accountPlan: initialPlan,
  initialCredits,
}: ProjectEditorProps) {
  const [files, setFiles] = useState<EditorFile[]>(initialFiles);

  // In-memory contents per fileId (allows editing without mutating files array until saved)
  const [fileContents, setFileContents] = useState<Record<string, string>>(() => {
    const initialMap: Record<string, string> = {};
    for (const f of initialFiles) {
      initialMap[f.id] = f.content;
    }
    return initialMap;
  });

  // Track which files have unsaved changes
  const [dirtyFileIds, setDirtyFileIds] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  // User Settings & Plan State
  const [userSettings, setUserSettings] = useState<SafeUserSettings | null>(null);
  const [accountPlan, setAccountPlan] = useState<AccountPlanInfo | null>(initialPlan ?? null);
  const [userCredits, setUserCredits] = useState<number | null>(initialCredits ?? null);

  // Preview panel toggle & resize tracking
  const [showPreview, setShowPreview] = useState(true);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Execution Sandbox State (Piston)
  const [showExecutionConsole, setShowExecutionConsole] = useState(false);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [executionResult, setExecutionResult] = useState<CodeRunResult | null>(null);

  // Open tabs list and currently active tab (honors initialActiveFilePath if specified)
  const [openFileIds, setOpenFileIds] = useState<string[]>(() => {
    if (initialFiles.length === 0) return [];
    if (initialActiveFilePath) {
      const match = initialFiles.find(
        (f) =>
          f.path === initialActiveFilePath ||
          f.path.endsWith("/" + initialActiveFilePath) ||
          f.id === initialActiveFilePath
      );
      if (match) return [match.id];
    }
    const indexFile = initialFiles.find((f) => f.path === "index.html" || f.path === "main.py");
    return [indexFile ? indexFile.id : initialFiles[0].id];
  });

  const [activeFileId, setActiveFileId] = useState<string | null>(() => {
    if (initialFiles.length === 0) return null;
    if (initialActiveFilePath) {
      const match = initialFiles.find(
        (f) =>
          f.path === initialActiveFilePath ||
          f.path.endsWith("/" + initialActiveFilePath) ||
          f.id === initialActiveFilePath
      );
      if (match) return match.id;
    }
    const indexFile = initialFiles.find((f) => f.path === "index.html" || f.path === "main.py");
    return indexFile ? indexFile.id : initialFiles[0].id;
  });

  // Dialog states
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileParent, setNewFileParent] = useState("");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderTargetParent, setFolderTargetParent] = useState("");
  const [fileToRename, setFileToRename] = useState<EditorFile | null>(null);
  const [fileToDelete, setFileToDelete] = useState<EditorFile | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<FileSnapshot[]>(() => {
    return initialFiles.map((f) => ({
      id: `init-${f.id}`,
      fileId: f.id,
      filePath: f.path,
      content: f.content,
      timestamp: new Date().toISOString(),
      label: "Initial starter template",
      sizeBytes: new Blob([f.content]).size,
    }));
  });

  // Timer ref for debounce
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const contentsRef = useRef(fileContents);
  contentsRef.current = fileContents;

  // Image Assets & Live Swapping State (Visual Editor V2)
  const [assets, setAssets] = useState<any[]>([]);
  const [lastSwappedImage, setLastSwappedImage] = useState<{
    mindspaceId: string;
    url: string;
    isBackground?: boolean;
  } | null>(null);

  const refreshAssets = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}/assets`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.assets)) {
          setAssets(data.assets);
        }
      }
    } catch (err) {
      console.warn("[Project Editor] Failed to fetch project assets:", err);
    }
  }, [project.id]);

  useEffect(() => {
    refreshAssets();
  }, [refreshAssets]);

  const handleUploadAsset = useCallback(
    async (file: File) => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/projects/${project.id}/assets`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Failed to upload image");
          return;
        }

        toast.success(`Uploaded ${data.asset.filename}`);
        refreshAssets();
      } catch (err: any) {
        toast.error(err.message || "Upload failed");
      }
    },
    [project.id, refreshAssets]
  );

  const handleDeleteAsset = useCallback(
    async (assetId: string) => {
      try {
        const res = await fetch(`/api/projects/${project.id}/assets/${assetId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          toast.success("Asset deleted");
          setAssets((prev) => prev.filter((a) => a.id !== assetId));
        } else {
          toast.error("Failed to delete asset");
        }
      } catch (err) {
        toast.error("Failed to delete asset");
      }
    },
    [project.id]
  );

  // Load User Settings & Credits on mount
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.settings) {
          setUserSettings(data.settings);
        }
      })
      .catch(() => {});

    fetch("/api/credits")
      .then((r) => r.json())
      .then((d) => {
        if (d.totalCredits !== undefined) {
          setUserCredits(d.totalCredits);
        }
      })
      .catch(() => {});
  }, []);

  const activeFile = files.find((f) => f.id === activeFileId) ?? null;
  const activeContent = activeFileId ? fileContents[activeFileId] ?? "" : "";

  // Auto-Save single file to server
  const saveFileContent = useCallback(
    async (fileId: string, content: string) => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/projects/${project.id}/files/${fileId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        if (!res.ok) {
          throw new Error("Failed to save");
        }

        setDirtyFileIds((prev) => {
          const next = new Set(prev);
          next.delete(fileId);
          if (next.size === 0) setSaveStatus("saved");
          return next;
        });

        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, content } : f))
        );

        // Record a snapshot
        const targetFile = files.find((f) => f.id === fileId);
        if (targetFile) {
          setSnapshots((prev) => [
            {
              id: `snap-${Date.now()}-${fileId}`,
              fileId,
              filePath: targetFile.path,
              content,
              timestamp: new Date().toISOString(),
              label: `Saved Revision (${new Date().toLocaleTimeString()})`,
              sizeBytes: new Blob([content]).size,
            },
            ...prev.slice(0, 49),
          ]);
        }
      } catch (err) {
        console.error("Auto-save error:", err);
        setSaveStatus("error");
      }
    },
    [project.id, files]
  );

  const handleRestoreSnapshot = useCallback(
    (snapshot: FileSnapshot) => {
      setFileContents((prev) => ({
        ...prev,
        [snapshot.fileId]: snapshot.content,
      }));
      setDirtyFileIds((prev) => new Set(prev).add(snapshot.fileId));
      saveFileContent(snapshot.fileId, snapshot.content);
    },
    [saveFileContent]
  );

  // Debounced change handler for Monaco
  const handleContentChange = useCallback(
    (newVal: string) => {
      if (!activeFileId) return;

      setFileContents((prev) => ({ ...prev, [activeFileId]: newVal }));
      setDirtyFileIds((prev) => new Set(prev).add(activeFileId));
      setSaveStatus("unsaved");

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        saveFileContent(activeFileId, newVal);
      }, 600);
    },
    [activeFileId, saveFileContent]
  );

  // Direct Visual Inline Editing from Live Preview pane (God Tier V2)
  const handleVisualEdit = useCallback(
    async ({
      filePath,
      mindspaceId,
      text,
      styles,
      reorder,
      imageChange,
      uploadPhoto,
    }: VisualEditEvent) => {
      const normalizedTarget = normalizePath(filePath);
      const targetFile =
        files.find((f) => normalizePath(f.path) === normalizedTarget) ||
        files.find((f) => f.path.endsWith(".html") || f.path.endsWith(".htm"));

      if (!targetFile) {
        console.warn("[MINDSPACE Visual Edit] Target file not found:", filePath);
        return;
      }

      const currentContent =
        contentsRef.current[targetFile.id] ?? targetFile.content ?? "";
      let updatedContent = currentContent;

      if (text !== undefined) {
        updatedContent = applyVisualTextEdit(currentContent, mindspaceId, text);
      }

      if (styles !== undefined) {
        updatedContent = applyVisualInlineStyleEdit(
          currentContent,
          mindspaceId,
          styles
        );
      }


      if (imageChange !== undefined) {
        console.log("[MINDSPACE ProjectEditor] Applying direct image swap to file source:", {
          file: targetFile.path,
          mindspaceId: imageChange.mindspaceId,
          src: imageChange.src,
          isBackground: imageChange.isBackground,
        });
        updatedContent = applyVisualImageChange(
          currentContent,
          imageChange.mindspaceId,
          imageChange.src,
          imageChange.isBackground
        );
      }

      if (uploadPhoto !== undefined) {
        console.log("[MINDSPACE ProjectEditor] Processing photo upload request:", {
          file: targetFile.path,
          filename: uploadPhoto.filename,
          size: uploadPhoto.fileSize,
          mindspaceId: uploadPhoto.mindspaceId,
        });
        try {
          const res = await fetch(`/api/projects/${project.id}/assets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: uploadPhoto.filename,
              dataUrl: uploadPhoto.dataUrl,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            console.error("[MINDSPACE ProjectEditor] Photo upload failed:", data);
            toast.error(data.error || "Failed to upload photo");
            return;
          }

          console.log("[MINDSPACE ProjectEditor] Photo uploaded successfully:", data.asset);
          toast.success(`Photo added to project: ${data.asset.filename}`);
          refreshAssets();

          // 1. Automatically register as a real file in project directory (File Explorer on left)
          if (data.asset.projectFile) {
            setFiles((prev) => {
              const withoutThis = prev.filter(
                (f) => f.path !== data.asset.filename && f.id !== data.asset.projectFile.id
              );
              return [...withoutThis, data.asset.projectFile];
            });
            if (data.asset.dataUrl) {
              setFileContents((prev) => ({
                ...prev,
                [data.asset.projectFile.id]: data.asset.dataUrl,
              }));
              contentsRef.current[data.asset.projectFile.id] = data.asset.dataUrl;
            }
          }

          // 2. Put just the clean filename (e.g. "photo.png") in the HTML markup
          const cleanImageRef = data.asset.filename || "image.png";
          updatedContent = applyVisualImageChange(
            currentContent,
            uploadPhoto.mindspaceId,
            cleanImageRef,
            uploadPhoto.isBackground
          );

          // 3. Confirm back to preview iframe with dataUrl for real-time live preview update
          const previewDisplayUrl = data.asset.dataUrl || data.asset.url;
          console.log("[MINDSPACE ProjectEditor] Setting lastSwappedImage confirmation:", {
            mindspaceId: uploadPhoto.mindspaceId,
            url: previewDisplayUrl,
            markupPath: cleanImageRef,
            isBackground: uploadPhoto.isBackground,
          });
          setLastSwappedImage({
            mindspaceId: uploadPhoto.mindspaceId,
            url: previewDisplayUrl,
            isBackground: uploadPhoto.isBackground,
          });

          // 4. Save immediately to disk so photo upload persists across reload
          saveFileContent(targetFile.id, updatedContent);
        } catch (err: any) {
          console.error("[MINDSPACE ProjectEditor] Photo upload exception:", err);
          toast.error(err.message || "Photo upload failed");
          return;
        }
      }

      if (updatedContent === currentContent) return;

      // Update in-memory file contents immediately (Monaco reflects this live)
      contentsRef.current[targetFile.id] = updatedContent;
      setFileContents((prev) => ({
        ...prev,
        [targetFile.id]: updatedContent,
      }));
      setDirtyFileIds((prev) => new Set(prev).add(targetFile.id));
      setSaveStatus("unsaved");

      // Auto-save debounced for text/style edits (covered by existing Version History safety net)
      if (reorder === undefined && uploadPhoto === undefined) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          saveFileContent(targetFile.id, updatedContent);
        }, 500);
      }
    },
    [files, project.id, refreshAssets, saveFileContent]
  );

  // Manual save flush (Ctrl+S / Cmd+S)
  const flushSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (activeFileId && dirtyFileIds.has(activeFileId)) {
      saveFileContent(activeFileId, contentsRef.current[activeFileId]);
    }
  }, [activeFileId, dirtyFileIds, saveFileContent]);

  // Snapshot latest files including in-memory unsaved edits
  const getLatestFiles = useCallback(() => {
    return files.map((f) => ({
      path: f.path,
      content: contentsRef.current[f.id] ?? f.content ?? "",
    }));
  }, [files]);

  // Tab management
  const handleSelectTab = (fileId: string) => {
    setActiveFileId(fileId);
  };

  const handleCloseTab = (fileIdToClose: string) => {
    setOpenFileIds((prev) => {
      const next = prev.filter((id) => id !== fileIdToClose);
      if (activeFileId === fileIdToClose) {
        const closedIndex = prev.indexOf(fileIdToClose);
        if (next.length === 0) {
          setActiveFileId(null);
        } else if (closedIndex >= next.length) {
          setActiveFileId(next[next.length - 1]);
        } else {
          setActiveFileId(next[closedIndex]);
        }
      }
      return next;
    });
  };

  const handleSelectFileFromExplorer = (file: EditorFile) => {
    if (!openFileIds.includes(file.id)) {
      setOpenFileIds((prev) => [...prev, file.id]);
    }
    setActiveFileId(file.id);
  };

  // Run Code via Piston
  const handleRunCode = async (stdin?: string) => {
    flushSave();
    setIsRunningCode(true);
    setShowExecutionConsole(true);

    try {
      const activePath = activeFile?.path || "";
      const currentFilesPayload = files.map((f) => ({
        path: f.path,
        content: fileContents[f.id] ?? f.content,
      }));

      const res = await fetch(`/api/projects/${project.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeFilePath: activePath,
          stdin: stdin || "",
          files: currentFilesPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Execution failed");
      }

      if (data.isWebPreview) {
        toast.info(data.message);
        setShowPreview(true);
        setIsRunningCode(false);
        return;
      }

      setExecutionResult(data.result);
    } catch (err: any) {
      toast.error(err.message || "Failed to execute code");
      setExecutionResult({
        language: "unknown",
        version: "error",
        status: "error",
        run: {
          stdout: "",
          stderr: err.message || "Execution failed",
          output: err.message || "Execution failed",
          code: 1,
          signal: null,
        },
        executionTimeMs: 0,
        engine: "piston",
        truncated: false,
      });
    } finally {
      setIsRunningCode(false);
    }
  };

  // Move item between folders
  const handleMoveItem = async (sourcePath: string, destFolder: string) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move",
          sourcePath,
          destinationFolder: destFolder,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to move item");

      if (data.updatedFiles) {
        setFiles((prev) => {
          const map = new Map(prev.map((f) => [f.id, f]));
          for (const uf of data.updatedFiles) {
            map.set(uf.id, uf);
          }
          return Array.from(map.values());
        });
        toast.success(`Moved ${sourcePath.split("/").pop()} to ${destFolder || "root"}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to move file");
    }
  };

  // Rename folder
  const handleRenameFolder = async (oldPath: string, newPath: string) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename",
          oldPath,
          newPath,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to rename folder");

      if (data.updatedFiles) {
        setFiles((prev) => {
          const map = new Map(prev.map((f) => [f.id, f]));
          for (const uf of data.updatedFiles) {
            map.set(uf.id, uf);
          }
          return Array.from(map.values());
        });
        toast.success(`Renamed folder to ${newPath}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to rename folder");
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folderPath: string) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          folderPath,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete folder");

      if (data.deletedIds) {
        const deletedSet = new Set(data.deletedIds);
        setFiles((prev) => prev.filter((f) => !deletedSet.has(f.id)));
        setOpenFileIds((prev) => {
          const next = prev.filter((id) => !deletedSet.has(id));
          if (activeFileId && deletedSet.has(activeFileId)) {
            setActiveFileId(next.length > 0 ? next[0] : null);
          }
          return next;
        });
        toast.success(`Deleted folder ${folderPath}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete folder");
    }
  };

  // File creation & renaming handlers
  const handleFileCreated = (newFile: EditorFile) => {
    setFiles((prev) => [...prev, newFile]);
    setFileContents((prev) => ({ ...prev, [newFile.id]: newFile.content }));
    if (!newFile.path.endsWith("/.gitkeep")) {
      setOpenFileIds((prev) => [...prev, newFile.id]);
      setActiveFileId(newFile.id);
    }
  };

  const handleFileRenamed = (updatedFile: EditorFile) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === updatedFile.id ? updatedFile : f))
    );
  };

  const handleFileDeleted = (deletedFileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== deletedFileId));
    setOpenFileIds((prev) => {
      const nextTabs = prev.filter((id) => id !== deletedFileId);
      if (activeFileId === deletedFileId) {
        setActiveFileId(nextTabs.length > 0 ? nextTabs[0] : null);
      }
      return nextTabs;
    });
    setDirtyFileIds((prev) => {
      const next = new Set(prev);
      next.delete(deletedFileId);
      if (next.size === 0) setSaveStatus("saved");
      return next;
    });
    setFileContents((prev) => {
      const next = { ...prev };
      delete next[deletedFileId];
      return next;
    });
  };

  // AI Diff and New File Application
  const handleApplyAiChange = useCallback(
    async (
      path: string,
      newContent: string,
      createdFile?: { id: string; path: string; content: string }
    ) => {
      const targetFile = files.find((f) => f.path === path);
      if (targetFile) {
        setFileContents((prev) => ({ ...prev, [targetFile.id]: newContent }));
        setFiles((prev) =>
          prev.map((f) => (f.id === targetFile.id ? { ...f, content: newContent } : f))
        );
        await saveFileContent(targetFile.id, newContent);
      } else {
        // AI created a brand new file!
        const fileRecord = (createdFile || {
          id: `ai-file-${Date.now()}`,
          projectId: project.id,
          path,
          content: newContent,
          updatedAt: new Date(),
        }) as EditorFile;

        setFiles((prev) => [...prev, fileRecord]);
        setFileContents((prev) => ({ ...prev, [fileRecord.id]: newContent }));
        setOpenFileIds((prev) =>
          prev.includes(fileRecord.id) ? prev : [...prev, fileRecord.id]
        );
        setActiveFileId(fileRecord.id);
        toast.success(`Created & opened new file: ${path}`);
      }
    },
    [files, project.id, saveFileContent]
  );

  // Quick Scaffold (Web App stack, HTML, Python)
  const handleQuickScaffold = useCallback(
    async (preset: "webapp" | "html" | "python") => {
      try {
        if (preset === "webapp") {
          const templates = [
            {
              path: "index.html",
              content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name} · MINDSPACE</title>
  <link rel="stylesheet" href="style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
  <div class="app-container">
    <header class="header">
      <div class="logo">
        <span class="logo-badge">M</span>
        <span class="logo-text">${project.name}</span>
      </div>
      <div class="status-pill">
        <span class="status-dot"></span>
        <span>Live Preview</span>
      </div>
    </header>

    <main class="hero">
      <div class="badge">Built with MINDSPACE</div>
      <h1 class="headline">Build fast.<br><span class="highlight-text">Ship with precision.</span></h1>
      <p class="subheadline">
        A professional developer canvas designed for instant previews, seamless AI assistance, and rapid development.
      </p>

      <div class="actions">
        <button id="counter-btn" class="primary-btn">
          <span>Clicks: </span>
          <span id="click-count">0</span>
        </button>
        <button id="theme-btn" class="secondary-btn">Invert Theme</button>
      </div>

      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3>Instant Preview</h3>
          <p>Real-time bundling without complex build steps.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">✨</div>
          <h3>AI Assisted</h3>
          <p>Diff-driven AI agent ready to craft features on demand.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🚀</div>
          <h3>1-Click Deploy</h3>
          <p>Publish to the live edge with an active shareable link.</p>
        </div>
      </div>
    </main>
  </div>

  <script src="script.js"></script>
</body>
</html>`
            },
            {
              path: "style.css",
              content: `/* Clean High-Contrast Developer Template */
:root {
  --bg-color: #09090b;
  --card-bg: #121215;
  --card-border: rgba(255, 255, 255, 0.08);
  --text-main: #f4f4f5;
  --text-muted: #a1a1aa;
  --primary-btn-bg: #ffffff;
  --primary-btn-text: #09090b;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: var(--bg-color);
  color: var(--text-main);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;
  width: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 2.5rem;
  border-bottom: 1px solid var(--card-border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-badge {
  background: #ffffff;
  color: #09090b;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 14px;
}

.logo-text {
  font-weight: 700;
  letter-spacing: -0.02em;
  font-size: 1.1rem;
}

.status-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.04);
  color: #f4f4f5;
  border: 1px solid var(--card-border);
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: ui-monospace, monospace;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #10b981;
}

.hero {
  text-align: center;
  padding: 4rem 0 2rem;
}

.badge {
  display: inline-block;
  padding: 0.35rem 0.85rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--card-border);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: ui-monospace, monospace;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.headline {
  font-size: clamp(2.5rem, 6vw, 4.2rem);
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.04em;
  margin-bottom: 1.25rem;
}

.highlight-text {
  color: #ffffff;
  background: linear-gradient(180deg, #ffffff 0%, #a1a1aa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subheadline {
  font-size: 1.1rem;
  color: var(--text-muted);
  max-width: 580px;
  margin: 0 auto 2.5rem;
  line-height: 1.6;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 4rem;
}

.primary-btn {
  background: var(--primary-btn-bg);
  color: var(--primary-btn-text);
  border: none;
  padding: 0.8rem 1.75rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: opacity 0.15s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.primary-btn:hover {
  opacity: 0.9;
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-main);
  border: 1px solid var(--card-border);
  padding: 0.8rem 1.75rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(255, 255, 255, 0.2);
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
  text-align: left;
}

.feature-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  padding: 1.75rem;
  border-radius: 16px;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.feature-card:hover {
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--text-main);
}

.feature-card p {
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.5;
}
`
            },
            {
              path: "script.js",
              content: `// Interactive App Controller
let count = 0;
const counterBtn = document.getElementById('counter-btn');
const countDisplay = document.getElementById('click-count');
const themeBtn = document.getElementById('theme-btn');

if (counterBtn && countDisplay) {
  counterBtn.addEventListener('click', () => {
    count++;
    countDisplay.textContent = count;
  });
}

if (themeBtn) {
  let inverted = false;
  themeBtn.addEventListener('click', () => {
    inverted = !inverted;
    document.body.style.filter = inverted ? 'invert(1) hue-rotate(180deg)' : 'none';
    themeBtn.textContent = inverted ? 'Reset Theme' : 'Invert Theme';
  });
}

console.log('MINDSPACE App successfully loaded!');`
            }
          ];

          for (const t of templates) {
            const res = await fetch(`/api/projects/${project.id}/files`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: t.path, content: t.content }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.file) {
                setFiles((prev) => [...prev.filter((f) => f.path !== t.path), data.file]);
                setFileContents((prev) => ({ ...prev, [data.file.id]: t.content }));
                if (t.path === "index.html") {
                  setOpenFileIds((prev) => [...prev.filter((id) => id !== data.file.id), data.file.id]);
                  setActiveFileId(data.file.id);
                }
              }
            }
          }
          toast.success("Scaffolded modern Web App stack!");
        } else if (preset === "html") {
          const starter = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #18181b; border: 1px solid rgba(255,255,255,0.1); padding: 2rem; border-radius: 1rem; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hello from ${project.name}</h1>
    <p>Live preview is active.</p>
  </div>
</body>
</html>`;
          const res = await fetch(`/api/projects/${project.id}/files`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: "index.html", content: starter }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.file) {
              setFiles((prev) => [...prev.filter((f) => f.path !== "index.html"), data.file]);
              setFileContents((prev) => ({ ...prev, [data.file.id]: starter }));
              setOpenFileIds((prev) => [...prev.filter((id) => id !== data.file.id), data.file.id]);
              setActiveFileId(data.file.id);
              toast.success("Created index.html!");
            }
          }
        } else if (preset === "python") {
          const starter = `def main():\n    print("Hello from ${project.name} in MINDSPACE!")\n    for i in range(1, 6):\n        print(f"Step {i} completed.")\n\nif __name__ == "__main__":\n    main()\n`;
          const res = await fetch(`/api/projects/${project.id}/files`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: "main.py", content: starter }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.file) {
              setFiles((prev) => [...prev.filter((f) => f.path !== "main.py"), data.file]);
              setFileContents((prev) => ({ ...prev, [data.file.id]: starter }));
              setOpenFileIds((prev) => [...prev.filter((id) => id !== data.file.id), data.file.id]);
              setActiveFileId(data.file.id);
              toast.success("Created main.py!");
            }
          }
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to scaffold files");
      }
    },
    [project.id, project.name]
  );

  const existingPaths = files.map((f) => f.path);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      {/* Sleek edge-to-edge IDE Header & File Tabs */}
      <EditorTopBar
        project={project}
        files={files}
        openFileIds={openFileIds}
        activeFileId={activeFileId}
        dirtyFileIds={dirtyFileIds}
        saveStatus={saveStatus}
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview((prev) => !prev)}
        showTerminal={showTerminal}
        onToggleTerminal={() => setShowTerminal((prev) => !prev)}
        showAiChat={showAiChat}
        onToggleAiChat={() => setShowAiChat((prev) => !prev)}
        onOpenHistory={() => setHistoryDialogOpen(true)}
        onRunCode={() => handleRunCode()}
        isRunningCode={isRunningCode}
        getLatestFiles={getLatestFiles}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        accountPlan={accountPlan}
        userCredits={userCredits}
        user={user}
      />

      {/* Main Studio Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Hierarchical File Explorer */}
        <FileExplorer
          files={files}
          assets={assets}
          activeFileId={activeFileId}
          onSelectFile={handleSelectFileFromExplorer}
          onRequestNewFile={(folder) => {
            setNewFileParent(folder || "");
            setNewFileOpen(true);
          }}
          onRequestNewFolder={(folder) => {
            setFolderTargetParent(folder || "");
            setNewFolderOpen(true);
          }}
          onRequestRenameFile={setFileToRename}
          onRequestDeleteFile={setFileToDelete}
          onUploadAsset={handleUploadAsset}
          onDeleteAsset={handleDeleteAsset}
          onMoveItem={handleMoveItem}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          onQuickScaffold={handleQuickScaffold}
        />

        {/* Center: Split View (Monaco Editor + Execution Console + Live Preview) */}
        {showPreview ? (
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel defaultSize={52} minSize={30}>
              <main className="flex h-full w-full flex-col overflow-hidden">
                <div className="flex-1 overflow-hidden">
                  <MonacoCodeEditor
                    file={activeFile}
                    value={activeContent}
                    onChange={handleContentChange}
                    onSaveTriggered={flushSave}
                    onRequestNewFile={() => {
                      setNewFileParent("");
                      setNewFileOpen(true);
                    }}
                    onQuickScaffold={handleQuickScaffold}
                    editorTheme={userSettings?.editorTheme}
                    fontSize={userSettings?.fontSize}
                    tabSize={userSettings?.tabSize}
                    wordWrap={userSettings?.wordWrap}
                    minimap={userSettings?.minimap}
                  />
                </div>

                {/* Execution Output Console */}
                <ExecutionConsole
                  isOpen={showExecutionConsole}
                  isRunning={isRunningCode}
                  result={executionResult}
                  activeFilePath={activeFile?.path || ""}
                  onRun={(stdin) => handleRunCode(stdin)}
                  onClose={() => setShowExecutionConsole(false)}
                  onClear={() => setExecutionResult(null)}
                />

                {/* Interactive Terminal Panel */}
                <TerminalPanel
                  projectId={project.id}
                  isOpen={showTerminal}
                  onClose={() => setShowTerminal(false)}
                />
              </main>
            </ResizablePanel>

            <ResizableHandle withHandle onDragging={setIsResizing} />

            <ResizablePanel defaultSize={48} minSize={25}>
              <LivePreview
                files={files}
                fileContents={fileContents}
                activeFileId={activeFileId}
                isResizing={isResizing}
                lastSwappedImage={lastSwappedImage}
                onQuickScaffold={handleQuickScaffold}
                onVisualEdit={handleVisualEdit}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <MonacoCodeEditor
                file={activeFile}
                value={activeContent}
                onChange={handleContentChange}
                onSaveTriggered={flushSave}
                onRequestNewFile={() => {
                  setNewFileParent("");
                  setNewFileOpen(true);
                }}
                onQuickScaffold={handleQuickScaffold}
                editorTheme={userSettings?.editorTheme}
                fontSize={userSettings?.fontSize}
                tabSize={userSettings?.tabSize}
                wordWrap={userSettings?.wordWrap}
                minimap={userSettings?.minimap}
              />
            </div>

            {/* Execution Output Console */}
            <ExecutionConsole
              isOpen={showExecutionConsole}
              isRunning={isRunningCode}
              result={executionResult}
              activeFilePath={activeFile?.path || ""}
              onRun={(stdin) => handleRunCode(stdin)}
              onClose={() => setShowExecutionConsole(false)}
              onClear={() => setExecutionResult(null)}
            />

            {/* Interactive Terminal Panel */}
            <TerminalPanel
              projectId={project.id}
              isOpen={showTerminal}
              onClose={() => setShowTerminal(false)}
            />
          </main>
        )}

        {/* Collapsible AI Help Side Panel */}
        <AiChatPanel
          projectId={project.id}
          files={files}
          activeFileId={activeFileId}
          isOpen={showAiChat}
          onClose={() => setShowAiChat(false)}
          onApplyChange={handleApplyAiChange}
          onBalanceChange={(bal) => setUserCredits(bal)}
          accountPlan={accountPlan}
        />
      </div>

      {/* Dialogs */}
      <NewFileDialog
        open={newFileOpen}
        onOpenChange={setNewFileOpen}
        projectId={project.id}
        parentFolder={newFileParent}
        existingPaths={existingPaths}
        onCreated={handleFileCreated}
      />

      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        projectId={project.id}
        parentFolder={folderTargetParent}
        onCreated={handleFileCreated}
      />

      <RenameFileDialog
        file={fileToRename}
        open={Boolean(fileToRename)}
        onOpenChange={(open) => !open && setFileToRename(null)}
        projectId={project.id}
        existingPaths={existingPaths}
        onRenamed={handleFileRenamed}
      />

      <DeleteFileDialog
        file={fileToDelete}
        open={Boolean(fileToDelete)}
        onOpenChange={(open) => !open && setFileToDelete(null)}
        projectId={project.id}
        onDeleted={handleFileDeleted}
      />

      <VersionHistoryDialog
        isOpen={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        activeFile={activeFile}
        snapshots={snapshots}
        onRestoreSnapshot={handleRestoreSnapshot}
      />
    </div>
  );
}
