"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Check,
  Code2,
  Copy,
  Download,
  Eye,
  FileCode2,
  FilePlus,
  FolderTree,
  Globe,
  Layers,
  LayoutTemplate,
  Loader2,
  Monitor,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  RotateCcw,
  Search,
  Smartphone,
  Sparkles,
  Star,
  Tablet,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bundleProjectFiles } from "@/lib/preview-bundler";
import { TEMPLATE_PRESETS, CODE_SNIPPETS, type TemplatePreset } from "@/lib/templates/presets";
import type { UnifiedTemplate } from "@/lib/templates/service";

type AdminTemplatesSectionProps = {
  initialTemplates: UnifiedTemplate[];
};

const CATEGORIES = [
  { value: "portfolio", label: "Portfolios & Bios", icon: User },
  { value: "landing", label: "SaaS & Landing", icon: Rocket },
  { value: "multi-page", label: "Multi-Page Studios", icon: Layers },
  { value: "club", label: "Clubs & Events", icon: Sparkles },
  { value: "creative", label: "Creative & Media", icon: Palette },
  { value: "business", label: "Business & Showcase", icon: Globe },
];

const ICON_OPTIONS = [
  { value: "Sparkles", label: "Sparkles ✨" },
  { value: "Rocket", label: "Rocket 🚀" },
  { value: "Code2", label: "Code 💻" },
  { value: "Layers", label: "Layers 📑" },
  { value: "User", label: "User 👤" },
  { value: "LayoutTemplate", label: "Layout 📐" },
  { value: "Palette", label: "Palette 🎨" },
  { value: "Globe", label: "Globe 🌐" },
];

export function AdminTemplatesSection({ initialTemplates }: AdminTemplatesSectionProps) {
  const [templates, setTemplates] = useState<UnifiedTemplate[]>(initialTemplates);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Studio dialog state (Create & Edit)
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioMode, setStudioMode] = useState<"create" | "edit">("create");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Studio form fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("portfolio");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [icon, setIcon] = useState("Sparkles");
  const [isFeatured, setIsFeatured] = useState(false);
  const [files, setFiles] = useState<{ path: string; content: string }[]>([
    {
      path: "index.html",
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Website</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>Hello World</h1>
  <script src="script.js"></script>
</body>
</html>`,
    },
    {
      path: "styles.css",
      content: `body {
  font-family: system-ui, sans-serif;
  background: #090d16;
  color: #fff;
  padding: 40px;
}`,
    },
  ]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [studioView, setStudioView] = useState<"code" | "preview">("code");
  const [saving, setSaving] = useState(false);
  const [studioError, setStudioError] = useState<string | null>(null);

  // Delete modal state
  const [templateToDelete, setTemplateToDelete] = useState<UnifiedTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Preview modal state
  const [previewTemplate, setPreviewTemplate] = useState<UnifiedTemplate | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewFileTab, setPreviewFileTab] = useState<string>("index.html");
  const [previewMode, setPreviewMode] = useState<"sim" | "code">("sim");

  // Restore defaults dialog
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Import JSON dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Auto-dismiss status messages after 5 seconds
  useEffect(() => {
    if (!statusMsg) return;
    const timer = setTimeout(() => setStatusMsg(null), 5000);
    return () => clearTimeout(timer);
  }, [statusMsg]);

  // Telemetry counts
  const telemetry = useMemo(() => {
    const total = templates.length;
    const featured = templates.filter((t) => t.isFeatured).length;
    const custom = templates.filter((t) => t.isCustom).length;
    const system = total - custom;
    return { total, featured, custom, system };
  }, [templates]);

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (categoryFilter !== "all" && t.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      if (featuredOnly && !t.isFeatured) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesSlug = t.slug.toLowerCase().includes(q);
        const matchesDesc = t.description.toLowerCase().includes(q);
        const matchesTags = t.tags.some((tag) => tag.toLowerCase().includes(q));
        const matchesCat = t.category.toLowerCase().includes(q);
        if (!matchesName && !matchesSlug && !matchesDesc && !matchesTags && !matchesCat) {
          return false;
        }
      }
      return true;
    });
  }, [templates, categoryFilter, featuredOnly, search]);

  // Live bundle for studio preview
  const studioBundledHtml = useMemo(() => {
    if (files.length === 0) return "";
    const editorFiles = files.map((f) => ({
      id: f.path,
      projectId: "studio-preview",
      name: f.path.split("/").pop() || f.path,
      path: f.path,
      content: f.content,
      isEntry: f.path === "index.html",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    return bundleProjectFiles("index.html", editorFiles, {});
  }, [files]);

  // Live bundle for preview dialog
  const previewBundledHtml = useMemo(() => {
    if (!previewTemplate || previewTemplate.files.length === 0) return "";
    const editorFiles = previewTemplate.files.map((f) => ({
      id: f.path,
      projectId: "live-preview",
      name: f.path.split("/").pop() || f.path,
      path: f.path,
      content: f.content,
      isEntry: f.path === "index.html",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    return bundleProjectFiles("index.html", editorFiles, {});
  }, [previewTemplate]);

  // Open Create Studio
  const handleOpenCreate = () => {
    setStudioMode("create");
    setEditingTemplateId(null);
    setName("");
    setSlug("");
    setCategory("portfolio");
    setDescription("");
    setTags("");
    setIcon("Sparkles");
    setIsFeatured(false);
    setFiles([
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Website</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="hero">
    <h1>Welcome to Your New Website</h1>
    <p>Build something clean, fast, and memorable.</p>
  </main>
  <script src="script.js"></script>
</body>
</html>`,
      },
      {
        path: "styles.css",
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #090d16;
  color: #f1f5f9;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.hero { text-align: center; max-width: 600px; }
h1 { font-size: 2.4rem; margin-bottom: 12px; }
p { color: #94a3b8; font-size: 1.1rem; }`,
      },
      {
        path: "script.js",
        content: `console.log("Template loaded ready!");`,
      },
    ]);
    setActiveFileIndex(0);
    setStudioView("code");
    setStudioError(null);
    setStudioOpen(true);
  };

  // Open Edit Studio
  const handleOpenEdit = (t: UnifiedTemplate) => {
    setStudioMode("edit");
    setEditingTemplateId(t.id);
    setName(t.name);
    setSlug(t.slug);
    setCategory(t.category);
    setDescription(t.description);
    setTags(t.tags.join(", "));
    setIcon(t.icon || "Sparkles");
    setIsFeatured(t.isFeatured);
    setFiles(
      t.files && t.files.length > 0
        ? t.files.map((f) => ({ path: f.path, content: f.content }))
        : [{ path: "index.html", content: `<h1>${t.name}</h1>` }]
    );
    setActiveFileIndex(0);
    setStudioView("code");
    setStudioError(null);
    setStudioOpen(true);
  };

  // Apply Blueprint Preset
  const handleApplyPreset = (preset: TemplatePreset) => {
    setName(preset.name);
    setSlug(preset.slug);
    setCategory(preset.category);
    setDescription(preset.description);
    setTags(preset.tags);
    setIcon(preset.icon);
    setIsFeatured(preset.isFeatured);
    setFiles(preset.files.map((f) => ({ path: f.path, content: f.content })));
    setActiveFileIndex(0);
    setStudioError(null);
  };

  // File Operations in Studio
  const handleAddFile = () => {
    const filename = prompt("Enter new file path (e.g. about.html or utils.js):");
    if (!filename || !filename.trim()) return;
    const cleanPath = filename.trim().replace(/^(\.\/|\/)+/, "");
    if (files.some((f) => f.path === cleanPath)) {
      alert("A file with this path already exists in this template.");
      return;
    }
    const isCss = cleanPath.endsWith(".css");
    const isJs = cleanPath.endsWith(".js");
    const defaultContent = isCss
      ? `/* Styles for ${cleanPath} */\n`
      : isJs
      ? `// Script for ${cleanPath}\n`
      : `<!DOCTYPE html>\n<html>\n<head>\n  <title>${cleanPath}</title>\n</head>\n<body>\n  <h1>${cleanPath}</h1>\n</body>\n</html>`;
    setFiles((prev) => [...prev, { path: cleanPath, content: defaultContent }]);
    setActiveFileIndex(files.length);
  };

  const handleRemoveFile = (index: number) => {
    if (files.length <= 1) {
      alert("Template must contain at least one starter file.");
      return;
    }
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (activeFileIndex >= files.length - 1) {
      setActiveFileIndex(Math.max(0, files.length - 2));
    }
  };

  const handleInsertSnippet = (snippet: string) => {
    if (activeFileIndex < 0 || activeFileIndex >= files.length) return;
    setFiles((prev) => {
      const next = [...prev];
      next[activeFileIndex] = {
        ...next[activeFileIndex],
        content: next[activeFileIndex].content + "\n\n" + snippet,
      };
      return next;
    });
  };

  // Save / Update Template
  const handleSaveStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudioError(null);

    const trimmedName = name.trim();
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");

    if (!trimmedName || !cleanSlug) {
      setStudioError("Please fill out name and slug.");
      return;
    }

    if (files.length === 0) {
      setStudioError("Template must contain at least one file.");
      return;
    }

    setSaving(true);
    try {
      if (studioMode === "create") {
        const res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            slug: cleanSlug,
            category,
            description: description.trim() || `Starter template for ${trimmedName}.`,
            tags: tags.trim(),
            icon,
            isFeatured,
            files,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to create template.");
        }

        setTemplates((prev) => [data.template, ...prev]);
        setStatusMsg({ type: "success", text: `Template "${data.template.name}" created successfully!` });
        setStudioOpen(false);
      } else {
        // Edit existing
        const res = await fetch(`/api/templates/${editingTemplateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            slug: cleanSlug,
            category,
            description: description.trim(),
            tags: tags.trim(),
            icon,
            isFeatured,
            files,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update template.");
        }

        setTemplates((prev) =>
          prev.map((t) => (t.id === editingTemplateId || t.slug === cleanSlug ? data.template : t))
        );
        setStatusMsg({ type: "success", text: `Template "${data.template.name}" updated successfully!` });
        setStudioOpen(false);
      }
    } catch (err: any) {
      setStudioError(err.message || "Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Featured directly in table
  const handleToggleFeatured = async (t: UnifiedTemplate) => {
    const nextFeatured = !t.isFeatured;
    // Optimistic update
    setTemplates((prev) =>
      prev.map((item) => (item.id === t.id ? { ...item, isFeatured: nextFeatured } : item))
    );

    try {
      const res = await fetch(`/api/templates/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: nextFeatured }),
      });
      if (!res.ok) {
        throw new Error("Failed to update featured status.");
      }
      setStatusMsg({
        type: "success",
        text: `Template "${t.name}" is now ${nextFeatured ? "featured ⭐" : "unfeatured"}.`,
      });
    } catch (err: any) {
      // Revert optimistic update
      setTemplates((prev) =>
        prev.map((item) => (item.id === t.id ? { ...item, isFeatured: t.isFeatured } : item))
      );
      setStatusMsg({ type: "error", text: err.message || "Failed to update featured status." });
    }
  };

  // Duplicate / Clone Template
  const handleDuplicate = async (t: UnifiedTemplate) => {
    try {
      const res = await fetch(`/api/templates/${t.id}/duplicate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to duplicate template.");
      }

      setTemplates((prev) => [data.template, ...prev]);
      setStatusMsg({
        type: "success",
        text: `Duplicated "${t.name}" as "${data.template.name}"!`,
      });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to duplicate template." });
    }
  };

  // Delete Template (works for ANY template)
  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/templates/${templateToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete template.");
      }

      setTemplates((prev) =>
        prev.filter((t) => t.id !== templateToDelete.id && t.slug !== templateToDelete.slug)
      );
      setStatusMsg({
        type: "success",
        text: `Template "${templateToDelete.name}" deleted successfully.`,
      });
      setTemplateToDelete(null);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to delete template." });
    } finally {
      setIsDeleting(false);
    }
  };

  // Restore Default Templates
  const handleRestoreDefaults = async () => {
    setRestoring(true);
    try {
      const res = await fetch("/api/templates/restore-defaults", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to restore defaults.");
      }

      if (data.templates) {
        setTemplates(data.templates);
      }
      setStatusMsg({
        type: "success",
        text: data.message || "Default templates restored successfully.",
      });
      setRestoreDialogOpen(false);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to restore defaults." });
    } finally {
      setRestoring(false);
    }
  };

  // Export Template as JSON
  const handleExportTemplate = (t: UnifiedTemplate) => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(
        JSON.stringify(
          {
            name: t.name,
            slug: t.slug,
            category: t.category,
            description: t.description,
            tags: t.tags,
            icon: t.icon,
            isFeatured: t.isFeatured,
            files: t.files,
          },
          null,
          2
        )
      );
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${t.slug}-template.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON Template
  const handleImportJson = async () => {
    setImportError(null);
    if (!importJsonText.trim()) {
      setImportError("Please paste valid template JSON.");
      return;
    }

    setImporting(true);
    try {
      const parsed = JSON.parse(importJsonText);
      if (!parsed.name || !parsed.slug || !parsed.files || !Array.isArray(parsed.files)) {
        throw new Error("Invalid template JSON structure. Must contain name, slug, and files array.");
      }

      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsed.name,
          slug: parsed.slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
          category: parsed.category || "portfolio",
          description: parsed.description || "Imported custom template.",
          tags: Array.isArray(parsed.tags) ? parsed.tags.join(", ") : parsed.tags || "",
          icon: parsed.icon || "Sparkles",
          isFeatured: Boolean(parsed.isFeatured),
          files: parsed.files,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import template.");
      }

      setTemplates((prev) => [data.template, ...prev]);
      setStatusMsg({ type: "success", text: `Template "${data.template.name}" imported successfully!` });
      setImportDialogOpen(false);
      setImportJsonText("");
    } catch (err: any) {
      setImportError(err.message || "Failed to parse or save imported JSON.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="mt-8 pb-12" aria-labelledby="admin-templates-heading">
      {/* Top Banner & Telemetry Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="admin-templates-heading" className="text-xl font-bold tracking-tight text-foreground">
              Template Studio & Blueprints
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              {telemetry.total} Active
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Create, customize, duplicate, and delete starter website templates available to all creators.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRestoreDialogOpen(true)}
            className="h-8 gap-1.5 text-xs border-border/80 text-muted-foreground hover:text-foreground"
            title="Restore missing system defaults"
          >
            <RotateCcw className="size-3.5" />
            <span>Restore Defaults</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setImportError(null);
              setImportJsonText("");
              setImportDialogOpen(true);
            }}
            className="h-8 gap-1.5 text-xs border-border/80 text-muted-foreground hover:text-foreground"
          >
            <Upload className="size-3.5" />
            <span>Import JSON</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-8 gap-1.5 text-xs bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>Add Template</span>
          </Button>
        </div>
      </div>

      {/* Telemetry Chips Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Catalog</div>
            <div className="text-xl font-bold text-foreground mt-0.5">{telemetry.total}</div>
          </div>
          <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <LayoutTemplate className="size-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Featured</div>
            <div className="text-xl font-bold text-amber-400 mt-0.5">{telemetry.featured}</div>
          </div>
          <div className="size-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Star className="size-4 fill-amber-400" />
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Custom Created</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{telemetry.custom}</div>
          </div>
          <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Sparkles className="size-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">System Defaults</div>
            <div className="text-xl font-bold text-sky-400 mt-0.5">{telemetry.system}</div>
          </div>
          <div className="size-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <Code2 className="size-4" />
          </div>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMsg && (
        <div
          className={`mb-4 px-4 py-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
            statusMsg.type === "success"
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
              : "bg-destructive/10 text-destructive border-destructive/25"
          }`}
        >
          <span>{statusMsg.text}</span>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-muted-foreground hover:text-foreground p-0.5"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates by name, slug, tag..."
            className="h-8.5 pl-8 text-xs bg-background"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8.5 text-xs w-[150px] bg-background">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value} className="text-xs">
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant={featuredOnly ? "secondary" : "outline"}
            onClick={() => setFeaturedOnly(!featuredOnly)}
            className={`h-8.5 text-xs gap-1.5 ${
              featuredOnly ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "text-muted-foreground"
            }`}
          >
            <Star className={`size-3.5 ${featuredOnly ? "fill-amber-400" : ""}`} />
            <span>Featured Only</span>
          </Button>
        </div>
      </div>

      {/* Templates Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/30">
              <TableHead className="w-[40px] text-center">★</TableHead>
              <TableHead className="min-w-[220px]">Template Details</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Files</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead className="text-right min-w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-xs">
                  No templates match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredTemplates.map((template) => (
                <TableRow key={template.slug} className="group hover:bg-muted/20 transition-colors">
                  {/* Featured Toggle */}
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(template)}
                      title={template.isFeatured ? "Featured (click to unfeature)" : "Click to feature"}
                      className="p-1 text-muted-foreground hover:text-amber-400 transition-colors"
                    >
                      <Star
                        className={`size-3.5 ${
                          template.isFeatured ? "fill-amber-400 text-amber-400" : "hover:text-amber-400"
                        }`}
                      />
                    </button>
                  </TableCell>

                  {/* Template Details */}
                  <TableCell className="font-medium">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground text-xs">{template.name}</span>
                        {template.isFeatured && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Featured
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>/{template.slug}</span>
                        {template.tags && template.tags.length > 0 && (
                          <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">
                            · {template.tags.slice(0, 3).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Category */}
                  <TableCell>
                    <span className="capitalize text-xs font-mono bg-secondary px-2.5 py-0.5 rounded-full border border-border/60">
                      {template.category}
                    </span>
                  </TableCell>

                  {/* Files Count */}
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewTemplate(template);
                        setPreviewMode("code");
                        setPreviewFileTab(template.files[0]?.path || "index.html");
                      }}
                      className="text-xs tabular-nums text-muted-foreground hover:text-foreground underline decoration-dotted underline-offset-4"
                      title="Inspect files"
                    >
                      {template.fileCount} {template.fileCount === 1 ? "file" : "files"}
                    </button>
                  </TableCell>

                  {/* Origin */}
                  <TableCell>
                    {template.isCustom ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        Custom
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground">
                        Built-in
                      </span>
                    )}
                  </TableCell>

                  {/* Actions (Full CRUD & Preview) */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Live Preview */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setPreviewTemplate(template);
                          setPreviewMode("sim");
                          setPreviewDevice("desktop");
                        }}
                        className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        title="Live preview"
                      >
                        <Eye className="size-3.5" />
                        <span className="sr-only">Preview</span>
                      </Button>

                      {/* Edit Template */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(template)}
                        className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        title="Edit template & files"
                      >
                        <Pencil className="size-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>

                      {/* Duplicate Template */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicate(template)}
                        className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        title="Duplicate as new template"
                      >
                        <Copy className="size-3.5" />
                        <span className="sr-only">Duplicate</span>
                      </Button>

                      {/* Export Template */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleExportTemplate(template)}
                        className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted/60 hidden sm:inline-flex"
                        title="Export as JSON"
                      >
                        <Download className="size-3.5" />
                        <span className="sr-only">Export</span>
                      </Button>

                      {/* Delete Template (UNLOCKED FOR ALL TEMPLATES) */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTemplateToDelete(template)}
                        className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete template"
                      >
                        <Trash2 className="size-3.5" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-destructive flex items-center gap-2">
              <Trash2 className="size-4" />
              Delete Template
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete{" "}
              <strong className="text-foreground">{templateToDelete?.name}</strong> (
              <span className="font-mono">{templateToDelete?.slug}</span>)?
            </DialogDescription>
          </DialogHeader>

          {!templateToDelete?.isCustom && (
            <div className="text-xs text-muted-foreground bg-muted/50 border border-border/80 p-3 rounded-lg">
              ℹ️ <strong>Note:</strong> This was originally a default system template. Once deleted, it will no
              longer appear for students during project creation. You can restore it anytime using the{" "}
              <strong>Restore Defaults</strong> button in the top action bar.
            </div>
          )}

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTemplateToDelete(null)}
              disabled={isDeleting}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="text-xs h-8 min-w-24 gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Deleting…</span>
                </>
              ) : (
                <span>Delete Template</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Defaults Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <RotateCcw className="size-4 text-primary" />
              Restore Default Templates
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This will re-add any original built-in templates (e.g. Simple Portfolio, SaaS Landing, Multi-Page Site)
              that were previously deleted.
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/60">
            ✓ Your custom-created templates will remain completely intact.
          </p>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRestoreDialogOpen(false)}
              disabled={restoring}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleRestoreDefaults}
              disabled={restoring}
              className="text-xs h-8 min-w-28 gap-1.5 bg-foreground text-background hover:bg-foreground/90 font-semibold"
            >
              {restoring ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Restoring…</span>
                </>
              ) : (
                <span>Confirm Restore</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import JSON Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Upload className="size-4 text-primary" />
              Import Template from JSON
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Paste a previously exported template JSON definition to quickly import it into your catalog.
            </DialogDescription>
          </DialogHeader>

          {importError && (
            <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-md">
              {importError}
            </div>
          )}

          <div className="space-y-2 pt-1">
            <Label htmlFor="import-json" className="text-xs">JSON Definition</Label>
            <Textarea
              id="import-json"
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder={`{\n  "name": "My New Template",\n  "slug": "my-new-template",\n  "category": "landing",\n  "files": [\n    { "path": "index.html", "content": "..." }\n  ]\n}`}
              rows={10}
              className="font-mono text-xs bg-background resize-y"
            />
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setImportDialogOpen(false)}
              disabled={importing}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleImportJson}
              disabled={importing}
              className="text-xs h-8 min-w-24 gap-1.5 bg-foreground text-background hover:bg-foreground/90 font-semibold"
            >
              {importing ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Importing…</span>
                </>
              ) : (
                <span>Import Template</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live Preview & File Inspector Modal */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-5xl h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl border-border/80 bg-card shadow-2xl">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/70 bg-muted/40 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-foreground">{previewTemplate?.name}</span>
              <span className="text-xs font-mono text-muted-foreground">/{previewTemplate?.slug}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Mode switch */}
              <div className="flex items-center rounded-lg border border-border/80 bg-background/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewMode("sim")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    previewMode === "sim" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Simulator
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("code")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    previewMode === "code" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Files ({previewTemplate?.fileCount})
                </button>
              </div>

              {previewMode === "sim" && (
                <div className="flex items-center rounded-lg border border-border/80 bg-background/80 p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`p-1 rounded text-muted-foreground hover:text-foreground ${
                      previewDevice === "desktop" ? "bg-muted text-foreground" : ""
                    }`}
                    title="Desktop (100%)"
                  >
                    <Monitor className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("tablet")}
                    className={`p-1 rounded text-muted-foreground hover:text-foreground ${
                      previewDevice === "tablet" ? "bg-muted text-foreground" : ""
                    }`}
                    title="Tablet (768px)"
                  >
                    <Tablet className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`p-1 rounded text-muted-foreground hover:text-foreground ${
                      previewDevice === "mobile" ? "bg-muted text-foreground" : ""
                    }`}
                    title="Mobile (375px)"
                  >
                    <Smartphone className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 bg-muted/20 overflow-hidden relative flex flex-col">
            {previewMode === "sim" ? (
              <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                <div
                  className={`h-full transition-all duration-300 bg-background rounded-xl overflow-hidden border border-border/80 shadow-md ${
                    previewDevice === "mobile"
                      ? "w-[375px]"
                      : previewDevice === "tablet"
                      ? "w-[768px]"
                      : "w-full"
                  }`}
                >
                  <iframe
                    title="Template Preview"
                    srcDoc={previewBundledHtml}
                    sandbox="allow-scripts allow-modals"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
                {/* File list sidebar */}
                <div className="w-full md:w-56 border-r border-border/70 bg-card p-3 overflow-y-auto space-y-1">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    Starter Files
                  </div>
                  {previewTemplate?.files.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => setPreviewFileTab(file.path)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-2 ${
                        previewFileTab === file.path
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      }`}
                    >
                      <FileCode2 className="size-3.5 shrink-0" />
                      <span className="truncate">{file.path}</span>
                    </button>
                  ))}
                </div>

                {/* File code viewer */}
                <div className="flex-1 bg-background p-4 overflow-auto font-mono text-xs">
                  {(() => {
                    const current = previewTemplate?.files.find((f) => f.path === previewFileTab);
                    return (
                      <pre className="text-muted-foreground whitespace-pre-wrap leading-relaxed select-all">
                        {current?.content || "// Empty file"}
                      </pre>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Studio (Create & Edit Dialog) */}
      <Dialog open={studioOpen} onOpenChange={setStudioOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border-border/80 bg-card shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b border-border/70 bg-muted/40 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <LayoutTemplate className="size-4.5 text-primary" />
                  {studioMode === "create" ? "Template Studio: Create New Blueprint" : "Template Studio: Edit Blueprint"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {studioMode === "create"
                    ? "Pick a starter blueprint or customize your metadata and code files."
                    : `Editing ${name || "template"} (/${slug || ""}). Updates apply immediately.`}
                </DialogDescription>
              </div>

              {/* View Switch: Code vs Split Preview */}
              <div className="flex items-center rounded-lg border border-border/80 bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => setStudioView("code")}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    studioView === "code" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Code Editor
                </button>
                <button
                  type="button"
                  onClick={() => setStudioView("preview")}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    studioView === "preview" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Live Preview
                </button>
              </div>
            </div>
          </DialogHeader>

          {studioError && (
            <div className="mx-6 mt-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-lg">
              {studioError}
            </div>
          )}

          <form onSubmit={handleSaveStudio} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Starter Presets Picker (Only in Create Mode) */}
            {studioMode === "create" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">
                    1. Choose a Starter Blueprint (Optional)
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Clicking a card pre-fills full working code</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {TEMPLATE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`text-left p-2.5 rounded-xl border text-xs transition-all duration-150 ${
                        slug === preset.slug
                          ? "border-primary bg-primary/10 shadow-xs"
                          : "border-border/70 bg-card hover:bg-muted/40 hover:border-border"
                      }`}
                    >
                      <div className="font-semibold text-foreground truncate">{preset.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 capitalize">{preset.category}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Template Metadata */}
            <div className="space-y-4 pt-1">
              <Label className="text-xs font-semibold text-foreground">
                {studioMode === "create" ? "2. Template Configuration" : "Template Configuration"}
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="t-name" className="text-xs">Template Display Name</Label>
                  <Input
                    id="t-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (studioMode === "create" && (!slug || slug === name.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))) {
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"));
                      }
                    }}
                    placeholder="e.g. Modern SaaS Landing"
                    required
                    className="h-8.5 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="t-slug" className="text-xs">URL Slug (Unique)</Label>
                  <Input
                    id="t-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. modern-saas-landing"
                    required
                    className="h-8.5 text-xs font-mono bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="t-category" className="text-xs">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="t-category" className="h-8.5 text-xs bg-background">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value} className="text-xs">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="t-icon" className="text-xs">Icon</Label>
                  <Select value={icon} onValueChange={setIcon}>
                    <SelectTrigger id="t-icon" className="h-8.5 text-xs bg-background">
                      <SelectValue placeholder="Icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((item) => (
                        <SelectItem key={item.value} value={item.value} className="text-xs">
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="t-tags" className="text-xs">Tags (comma-separated)</Label>
                  <Input
                    id="t-tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. saas, landing, modern"
                    className="h-8.5 text-xs bg-background"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="t-desc" className="text-xs">Description</Label>
                <Textarea
                  id="t-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of what this starter blueprint provides..."
                  rows={2}
                  className="text-xs resize-none bg-background"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="t-featured"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="size-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <Label htmlFor="t-featured" className="text-xs cursor-pointer select-none">
                  Highlight as Featured Template on project creation page
                </Label>
              </div>
            </div>

            {/* Template Files & Editor */}
            <div className="space-y-3 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderTree className="size-4 text-primary" />
                  <Label className="text-xs font-semibold text-foreground">
                    Starter Files ({files.length})
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  {/* Quick Snippet Inserters */}
                  <Select onValueChange={handleInsertSnippet}>
                    <SelectTrigger className="h-7 text-[11px] w-[140px] bg-background">
                      <SelectValue placeholder="+ Insert Snippet" />
                    </SelectTrigger>
                    <SelectContent>
                      {CODE_SNIPPETS.map((snip) => (
                        <SelectItem key={snip.name} value={snip.snippet} className="text-xs">
                          {snip.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddFile}
                    className="h-7 text-xs gap-1"
                  >
                    <FilePlus className="size-3" />
                    <span>Add File</span>
                  </Button>
                </div>
              </div>

              {/* View Switch Display */}
              {studioView === "preview" ? (
                <div className="h-80 border border-border/80 rounded-xl overflow-hidden bg-background shadow-xs">
                  <iframe
                    title="Studio Live Sandbox"
                    srcDoc={studioBundledHtml}
                    sandbox="allow-scripts allow-modals"
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-xs">
                  {/* File Tabs Header */}
                  <div className="flex items-center gap-1 px-3 py-2 border-b border-border/70 bg-muted/40 overflow-x-auto">
                    {files.map((file, idx) => (
                      <div
                        key={file.path}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                          activeFileIndex === idx
                            ? "bg-background text-foreground shadow-xs border border-border/70 font-semibold"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveFileIndex(idx)}
                          className="truncate max-w-[140px]"
                        >
                          {file.path}
                        </button>
                        {files.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="text-muted-foreground hover:text-destructive p-0.5 rounded"
                            title="Remove file"
                          >
                            <X className="size-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Active File Editor */}
                  {files[activeFileIndex] && (
                    <div className="p-3 bg-background">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-[11px] font-mono text-muted-foreground">Path:</Label>
                          <Input
                            value={files[activeFileIndex].path}
                            onChange={(e) => {
                              const newPath = e.target.value;
                              setFiles((prev) => {
                                const next = [...prev];
                                next[activeFileIndex] = { ...next[activeFileIndex], path: newPath };
                                return next;
                              });
                            }}
                            className="h-6.5 text-xs font-mono w-48 bg-muted/40"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {files[activeFileIndex].content.length} chars
                        </span>
                      </div>

                      <Textarea
                        value={files[activeFileIndex].content}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFiles((prev) => {
                            const next = [...prev];
                            next[activeFileIndex] = { ...next[activeFileIndex], content: val };
                            return next;
                          });
                        }}
                        placeholder="File code content..."
                        rows={12}
                        className="font-mono text-xs bg-muted/20 border-border/60 resize-y leading-relaxed"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t border-border/60 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStudioOpen(false)}
                disabled={saving}
                className="h-8 text-xs text-muted-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="h-8 text-xs min-w-32 gap-1.5 bg-foreground text-background hover:bg-foreground/90 font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving Blueprint…</span>
                  </>
                ) : (
                  <span>{studioMode === "create" ? "Create Template" : "Save Changes"}</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
