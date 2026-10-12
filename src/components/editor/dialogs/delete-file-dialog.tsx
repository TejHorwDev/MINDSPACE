"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { EditorFile } from "../types";

type DeleteFileDialogProps = {
  file: EditorFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onDeleted: (fileId: string) => void;
};

export function DeleteFileDialog({
  file,
  open,
  onOpenChange,
  projectId,
  onDeleted,
}: DeleteFileDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/files/${file.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete file.");
      }

      const deletedName = file.path;
      onDeleted(file.id);
      toast({
        title: "File deleted",
        description: `“${deletedName}” has been deleted.`,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-4" aria-hidden="true" />
            Delete “{file?.path}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this file? This action cannot be
            undone and its contents will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p className="text-xs font-medium text-destructive px-1">{error}</p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={handleDelete}
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Delete File
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
