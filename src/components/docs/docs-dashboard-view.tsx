"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  ExternalLink,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export interface DocumentItem {
  id: string;
  title: string;
  contentJson?: any;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface DocsDashboardViewProps {
  initialDocuments: DocumentItem[];
  userName: string;
}

export function DocsDashboardView({
  initialDocuments,
  userName,
}: DocsDashboardViewProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Rename state
  const [renameTarget, setRenameTarget] = useState<DocumentItem | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter documents by search
  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // Create new document
  const handleCreateDocument = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Document" }),
      });

      if (!res.ok) {
        throw new Error("Failed to create document.");
      }

      const data = await res.json();
      toast.success("Created new document");
      router.push(`/docs/${data.document.id}`);
    } catch (err: any) {
      console.error("Create document error:", err);
      toast.error(err.message || "Failed to create document");
      setIsCreating(false);
    }
  };

  // Confirm rename
  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;

    const trimmed = newTitle.trim();
    if (!trimmed) {
      toast.error("Please enter a document title");
      return;
    }

    setIsRenaming(true);
    try {
      const res = await fetch(`/api/docs/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });

      if (!res.ok) {
        throw new Error("Failed to rename document.");
      }

      const data = await res.json();
      setDocuments((prev) =>
        prev.map((d) => (d.id === renameTarget.id ? { ...d, title: data.document.title, updatedAt: data.document.updatedAt } : d))
      );
      toast.success("Document renamed");
      setRenameTarget(null);
    } catch (err: any) {
      console.error("Rename error:", err);
      toast.error(err.message || "Failed to rename document");
    } finally {
      setIsRenaming(false);
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/docs/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete document.");
      }

      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      toast.success(`Deleted "${deleteTarget.title}"`);
      setDeleteTarget(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err.message || "Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to extract word count estimate from JSON if available
  const getDocumentWordCount = (contentJson?: any): number => {
    if (!contentJson) return 0;
    try {
      let text = "";
      const traverse = (node: any) => {
        if (!node) return;
        if (node.text) text += " " + node.text;
        if (Array.isArray(node.content)) {
          node.content.forEach(traverse);
        }
      };
      traverse(contentJson);
      const trimmed = text.trim();
      return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
    } catch {
      return 0;
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      {/* Top Banner / Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-8 border-b border-border/60">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary border border-border/80 text-xs text-muted-foreground font-mono mb-2">
            <Sparkles className="size-3 text-foreground" />
            <span>Docs & Presentation Studio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Write reports, essays, assignments, and presentations with rich text formatting.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleCreateDocument}
            disabled={isCreating}
            className="gap-2 bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-xs"
          >
            {isCreating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            <span>New Document</span>
          </Button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search documents by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          <span>{documents.length} document{documents.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        documents.length === 0 ? (
          /* Clean Empty State */
          <Card className="rounded-2xl border border-border/80 bg-card p-12 text-center shadow-xs">
            <div className="mx-auto size-14 rounded-2xl border border-border/80 bg-secondary flex items-center justify-center text-muted-foreground mb-4 shadow-2xs">
              <FileText className="size-7" />
            </div>
            <CardTitle className="text-base font-bold text-foreground">
              No documents yet — a clean slate
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Create your first document to write reports, essays, and structured school assignments.
            </CardDescription>
            <Button
              onClick={handleCreateDocument}
              disabled={isCreating}
              className="mt-6 gap-2 bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-xs"
            >
              {isCreating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              <span>Create Document</span>
            </Button>
          </Card>
        ) : (
          /* No search results */
          <div className="py-12 text-center text-muted-foreground text-xs">
            No documents matching &ldquo;{searchQuery}&rdquo;.
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const wordCount = getDocumentWordCount(doc.contentJson);
            const relativeTime = formatDistanceToNow(new Date(doc.updatedAt), {
              addSuffix: true,
            });

            return (
              <Card
                key={doc.id}
                className="group relative rounded-xl border border-border/80 bg-card p-5 shadow-xs transition-all hover:border-foreground/30 hover:shadow-sm flex flex-col justify-between"
              >
                <div>
                  {/* Top Row: Icon + Menu */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex size-9 items-center justify-center rounded-lg border border-border/80 bg-secondary text-foreground shadow-2xs">
                      <FileText className="size-4.5" />
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <MoreVertical className="size-4" />
                          <span className="sr-only">Document options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem asChild>
                          <Link href={`/docs/${doc.id}`} className="flex items-center gap-2 cursor-pointer">
                            <ExternalLink className="size-3.5" />
                            <span>Open Editor</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setRenameTarget(doc);
                            setNewTitle(doc.title);
                          }}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Pencil className="size-3.5" />
                          <span>Rename</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(doc)}
                          className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Title */}
                  <Link
                    href={`/docs/${doc.id}`}
                    className="block group-hover:text-foreground/90 transition-colors"
                  >
                    <h2 className="text-base font-semibold text-foreground tracking-tight line-clamp-1 mb-1">
                      {doc.title}
                    </h2>
                  </Link>

                  {/* Word Count */}
                  <p className="text-xs text-muted-foreground font-mono">
                    {wordCount} {wordCount === 1 ? "word" : "words"}
                  </p>
                </div>

                {/* Footer */}
                <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Updated {relativeTime}</span>
                  <Link
                    href={`/docs/${doc.id}`}
                    className="font-medium text-foreground hover:underline inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span>Edit</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rename Document Dialog */}
      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-lg">
          <form onSubmit={handleConfirmRename}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                Rename document
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Enter a new title for your document.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4">
              <Input
                type="text"
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Document title..."
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isRenaming}
                onClick={() => setRenameTarget(null)}
                className="text-xs border-border/80"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isRenaming || !newTitle.trim()}
                className="text-xs bg-foreground text-background hover:bg-foreground/90 font-semibold"
              >
                {isRenaming ? "Renaming..." : "Save Title"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Document Confirmation Dialog */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Delete &ldquo;{deleteTarget?.title}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This action cannot be undone. This document and all of its formatted text, tables, and notes will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              disabled={isDeleting}
              className="text-xs border-border/80"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold shadow-xs"
            >
              {isDeleting ? "Deleting..." : "Delete document"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
