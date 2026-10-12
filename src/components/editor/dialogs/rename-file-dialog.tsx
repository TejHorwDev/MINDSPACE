"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { EditorFile } from "../types";

type RenameFileDialogProps = {
  file: EditorFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  existingPaths: string[];
  onRenamed: (file: EditorFile) => void;
};

export function RenameFileDialog({
  file,
  open,
  onOpenChange,
  projectId,
  existingPaths,
  onRenamed,
}: RenameFileDialogProps) {
  const { toast } = useToast();
  const [filePath, setFilePath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      setFilePath(file.path);
      setError(null);
    }
  }, [file]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!loading) {
      if (!nextOpen) {
        setError(null);
      }
      onOpenChange(nextOpen);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!file) return;

    const cleanPath = filePath.replace(/^\/+/, "").trim();

    if (!cleanPath) {
      setError("Please enter a file name.");
      return;
    }

    if (cleanPath === file.path) {
      handleOpenChange(false);
      return;
    }

    if (existingPaths.includes(cleanPath)) {
      setError(`A file named "${cleanPath}" already exists.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: cleanPath }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to rename file.");
      }

      onRenamed(data.file);
      toast({
        title: "File renamed",
        description: `File renamed to “${cleanPath}”.`,
      });
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Pencil className="size-4 text-primary" aria-hidden="true" />
              Rename File
            </DialogTitle>
            <DialogDescription>
              Enter a new name or path for “{file?.path}”.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-input">File Name</Label>
              <Input
                id="rename-input"
                autoFocus
                value={filePath}
                onChange={(e) => {
                  setFilePath(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !filePath.trim() || filePath.trim() === file?.path}
            >
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
