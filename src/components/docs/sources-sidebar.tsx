"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Plus,
  X,
  ExternalLink,
  Pencil,
  Trash2,
  Globe,
  Book,
  FileText,
  Bookmark,
  Quote,
  Loader2,
  Search,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  SourceItem,
  formatInTextCitation,
  extractCitedSourceIds,
  countCitationsBySource,
} from "@/lib/citations/apa";

type SourcesSidebarProps = {
  documentId: string;
  sources: SourceItem[];
  contentJson: any;
  isOpen: boolean;
  onClose: () => void;
  onInsertCitation: (source: SourceItem) => void;
  onSourcesChange: (sources: SourceItem[]) => void;
  highlightedSourceId?: string | null;
};

export function SourcesSidebar({
  documentId,
  sources,
  contentJson,
  isOpen,
  onClose,
  onInsertCitation,
  onSourcesChange,
  highlightedSourceId,
}: SourcesSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<SourceItem | null>(null);
  const [sourceToDelete, setSourceToDelete] = useState<SourceItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    title: "",
    authors: "",
    sourceType: "website",
    publishedDate: "",
    publisher: "",
    url: "",
    accessedDate: "",
  });

  const citationCounts = countCitationsBySource(contentJson);

  // Filter sources by search query
  const filteredSources = sources.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      (s.authors && s.authors.toLowerCase().includes(q)) ||
      (s.publisher && s.publisher.toLowerCase().includes(q)) ||
      (s.url && s.url.toLowerCase().includes(q))
    );
  });

  // Open add source form
  const handleOpenAddForm = () => {
    setEditingSource(null);
    setFormData({
      title: "",
      authors: "",
      sourceType: "website",
      publishedDate: "",
      publisher: "",
      url: "",
      accessedDate: "",
    });
    setIsFormOpen(true);
  };

  // Open edit source form
  const handleOpenEditForm = (source: SourceItem) => {
    setEditingSource(source);
    setFormData({
      title: source.title,
      authors: source.authors || "",
      sourceType: source.sourceType || "website",
      publishedDate: source.publishedDate || "",
      publisher: source.publisher || "",
      url: source.url || "",
      accessedDate: source.accessedDate || "",
    });
    setIsFormOpen(true);
  };

  // Submit Add or Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Source title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSource) {
        // Update existing source
        const res = await fetch(`/api/docs/${documentId}/sources/${editingSource.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          throw new Error("Failed to update source");
        }

        const data = await res.json();
        const updated = data.source;

        onSourcesChange(
          sources.map((s) => (s.id === editingSource.id ? updated : s))
        );
        toast.success(`Updated source "${updated.title}"`);
      } else {
        // Create new source
        const res = await fetch(`/api/docs/${documentId}/sources`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          throw new Error("Failed to create source");
        }

        const data = await res.json();
        const created = data.source;

        onSourcesChange([created, ...sources]);
        toast.success(`Added source "${created.title}"`);
      }

      setIsFormOpen(false);
    } catch (err: any) {
      console.error("Save source error:", err);
      toast.error(err.message || "Network error saving source");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Source
  const handleConfirmDelete = async () => {
    if (!sourceToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/docs/${documentId}/sources/${sourceToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete source");
      }

      const count = citationCounts[sourceToDelete.id] || 0;
      onSourcesChange(sources.filter((s) => s.id !== sourceToDelete.id));

      if (count > 0) {
        toast.warning(
          `Deleted source "${sourceToDelete.title}". ${count} in-text citation(s) are now flagged as broken.`,
          { duration: 4000 }
        );
      } else {
        toast.success(`Deleted source "${sourceToDelete.title}"`);
      }

      setSourceToDelete(null);
    } catch (err: any) {
      console.error("Delete source error:", err);
      toast.error(err.message || "Network error deleting source");
    } finally {
      setIsDeleting(false);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "book":
        return <Book className="size-3.5 text-blue-400" />;
      case "journal":
        return <FileText className="size-3.5 text-emerald-400" />;
      case "website":
        return <Globe className="size-3.5 text-indigo-400" />;
      default:
        return <Bookmark className="size-3.5 text-amber-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <aside
        id="document-sources-sidebar"
        className="w-80 md:w-96 shrink-0 border-l border-border/80 bg-card/95 backdrop-blur-md flex flex-col h-[calc(100vh-56px)] sticky top-14 z-20 shadow-lg animate-in slide-in-from-right-4 duration-200"
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-foreground" />
            <h2 className="text-sm font-bold text-foreground">Document Sources</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-secondary text-muted-foreground border border-border/60">
              {sources.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              onClick={handleOpenAddForm}
              className="h-7 px-2.5 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 gap-1 cursor-pointer"
            >
              <Plus className="size-3" />
              <span>Add</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="size-7 text-muted-foreground hover:text-foreground rounded-lg"
              title="Close Sources panel"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        {sources.length > 0 && (
          <div className="p-3 border-b border-border/60 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search sources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 pl-8 pr-3 text-xs bg-secondary/50 border-border/70 rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Sources List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredSources.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <BookOpen className="size-8 text-muted-foreground mx-auto opacity-40" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  {searchQuery ? "No matching sources" : "No sources added yet"}
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {searchQuery
                    ? `No sources matched "${searchQuery}". Clear your search.`
                    : "Add websites, books, and journals to cite in this document."}
                </p>
              </div>
              {!searchQuery && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAddForm}
                  className="text-xs h-7 border-border/80 cursor-pointer"
                >
                  <Plus className="size-3 mr-1" />
                  Add First Source
                </Button>
              )}
            </div>
          ) : (
            filteredSources.map((source) => {
              const count = citationCounts[source.id] || 0;
              const inTextPill = formatInTextCitation(source);
              const isHighlighted = highlightedSourceId === source.id;

              return (
                <div
                  key={source.id}
                  className={`p-3 rounded-xl border transition-all text-xs space-y-2 group ${
                    isHighlighted
                      ? "border-indigo-500 bg-indigo-500/10 shadow-sm"
                      : "border-border/80 bg-card hover:border-foreground/25"
                  }`}
                >
                  {/* Top row: Type indicator + Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {getSourceIcon(source.sourceType)}
                      <span className="font-mono text-[10px] uppercase font-semibold text-muted-foreground">
                        {source.sourceType}
                      </span>
                      {source.publishedDate && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {source.publishedDate}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditForm(source)}
                        className="size-6 text-muted-foreground hover:text-foreground rounded"
                        title="Edit source"
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setSourceToDelete(source)}
                        className="size-6 text-muted-foreground hover:text-destructive rounded"
                        title="Delete source"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Title & Authors */}
                  <div>
                    <h3 className="font-bold text-foreground leading-snug break-words">
                      {source.title}
                    </h3>
                    {source.authors && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {source.authors}
                      </p>
                    )}
                    {source.publisher && (
                      <p className="text-[10px] text-muted-foreground/80 mt-0.5 italic">
                        {source.publisher}
                      </p>
                    )}
                  </div>

                  {/* URL if available */}
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:underline truncate max-w-full"
                    >
                      <ExternalLink className="size-2.5 shrink-0" />
                      <span className="truncate">{source.url}</span>
                    </a>
                  )}

                  {/* Bottom: Citation status + CITE BUTTON */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {count > 0 ? (
                        <span className="text-emerald-500 font-semibold">Cited {count}×</span>
                      ) : (
                        <span>Uncited</span>
                      )}
                    </span>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onInsertCitation(source)}
                      className="h-6 px-2.5 text-[11px] font-semibold bg-foreground text-background hover:bg-foreground/90 gap-1 rounded-lg cursor-pointer"
                      title={`Insert APA citation ${inTextPill} at cursor`}
                    >
                      <Quote className="size-2.5" />
                      <span>Cite</span>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Add / Edit Source Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md text-xs sm:text-sm">
          <DialogHeader>
            <DialogTitle>
              {editingSource ? "Edit Source" : "Add Source to Document"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Fill in the source metadata. We will format in-text citations and the bibliography in APA 7th edition automatically.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-3.5 py-2">
            {/* Source Type */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Source Type</label>
              <select
                value={formData.sourceType}
                onChange={(e) => setFormData({ ...formData, sourceType: e.target.value })}
                className="w-full h-8 px-2.5 rounded-lg border border-border/80 bg-background text-xs text-foreground focus:outline-hidden"
              >
                <option value="website">Website / Web Page</option>
                <option value="book">Book / Publication</option>
                <option value="journal">Academic Journal Article</option>
                <option value="other">Other / Report / Manual</option>
              </select>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                required
                placeholder="e.g. Attention Is All You Need"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            {/* Authors */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Author(s)</label>
              <Input
                placeholder="e.g. Vaswani, A., Shazeer, N., or John Smith"
                value={formData.authors}
                onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
                className="h-8 text-xs"
              />
              <span className="text-[10px] text-muted-foreground block">
                Single author, multiple authors separated by commas/&, or organization name.
              </span>
            </div>

            {/* Published Date / Year */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Publication Year / Date</label>
                <Input
                  placeholder="e.g. 2023 or 2023-05-12"
                  value={formData.publishedDate}
                  onChange={(e) => setFormData({ ...formData, publishedDate: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Publisher / Organization</label>
                <Input
                  placeholder="e.g. NeurIPS or Nature"
                  value={formData.publisher}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* URL */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">URL / DOI</label>
              <Input
                type="url"
                placeholder="https://..."
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFormOpen(false)}
                disabled={isSubmitting}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-8 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 gap-1.5"
              >
                {isSubmitting && <Loader2 className="size-3 animate-spin" />}
                <span>{editingSource ? "Save Changes" : "Add Source"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(sourceToDelete)}
        onOpenChange={(open) => !open && setSourceToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              <span>Delete Source</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs space-y-2">
              <span>
                Are you sure you want to delete <strong>"{sourceToDelete?.title}"</strong>?
              </span>
              {sourceToDelete && (citationCounts[sourceToDelete.id] || 0) > 0 && (
                <span className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500 font-medium block">
                  ⚠️ This source is currently cited in your document {citationCounts[sourceToDelete.id]} time(s).
                  Deleting it will cause those in-text citations to display a broken-citation warning.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="h-8 text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Source"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
