"use client";

import { useState } from "react";
import { FolderPlus, Loader2 } from "lucide-react";
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

type NewFolderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  parentFolder?: string;
  onCreated: (newFile: EditorFile) => void;
};

export function NewFolderDialog({
  open,
  onOpenChange,
  projectId,
  parentFolder = "",
  onCreated,
}: NewFolderDialogProps) {
  const { toast } = useToast();
  const [folderName, setFolderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!loading) {
      if (!nextOpen) {
        setFolderName("");
        setError(null);
      }
      onOpenChange(nextOpen);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanName = folderName.replace(/[/\\?%*:|"<>]/g, "").trim();

    if (!cleanName) {
      setError("Please enter a valid folder name.");
      return;
    }

    const targetFolderPath = parentFolder ? `${parentFolder}/${cleanName}` : cleanName;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          folderPath: targetFolderPath,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create folder.");
      }

      if (data.file) {
        onCreated(data.file);
      }

      toast({
        title: "Folder created",
        description: `“${cleanName}” has been created.`,
      });
      handleOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
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
              <FolderPlus className="size-4 text-primary" aria-hidden="true" />
              New Folder
            </DialogTitle>
            <DialogDescription>
              {parentFolder
                ? `Create a subfolder inside “${parentFolder}”.`
                : "Create a new folder to organize your code files."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name-input">Folder Name</Label>
              <Input
                id="folder-name-input"
                autoFocus
                placeholder="e.g. utils, components, models"
                value={folderName}
                onChange={(e) => {
                  setFolderName(e.target.value);
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
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !folderName.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Creating...
                </>
              ) : (
                "Create Folder"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
