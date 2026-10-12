"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Sparkles, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UnifiedTemplate } from "@/lib/templates/service";

type TemplateCreateDialogProps = {
  template: UnifiedTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authed: boolean;
};

export function TemplateCreateDialog({
  template,
  open,
  onOpenChange,
  authed,
}: TemplateCreateDialogProps) {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync default name when template changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && template) {
      setProjectName(template.name);
      setError(null);
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;

    if (!authed) {
      router.push(`/login?callbackUrl=/project/new/templates`);
      return;
    }

    const trimmed = projectName.trim();
    if (!trimmed) {
      setError("Please enter a project name.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          templateId: template.slug,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.project) {
        throw new Error(data.error || "Failed to create project.");
      }

      router.push(`/project/${data.project.id}/build`);
    } catch (err: any) {
      setError(err.message || "Failed to create project. Please try again.");
      setCreating(false);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-border/80 bg-card p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-8 rounded-lg bg-foreground/10 border border-border flex items-center justify-center text-foreground">
              <FolderPlus className="size-4" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Create Project from Blueprint
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            You are cloning{" "}
            <span className="font-semibold text-foreground">{template.name}</span> into your
            private MINDSPACE workspace.
          </DialogDescription>
        </DialogHeader>

        {/* Template Overview Chip */}
        <div className="rounded-xl border border-border/70 bg-muted/40 p-3 flex items-center justify-between text-xs font-mono">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase">Template</span>
            <div className="font-semibold text-foreground text-xs">{template.name}</div>
          </div>
          <div className="text-right space-y-0.5">
            <span className="text-[10px] text-muted-foreground uppercase">Files</span>
            <div className="text-xs text-foreground font-semibold">
              {template.fileCount} {template.fileCount === 1 ? "file" : "files"}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label htmlFor="project-name-input" className="text-xs font-medium text-foreground">
              Project Name
            </Label>
            <Input
              id="project-name-input"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. My Website"
              autoFocus
              className="h-10 rounded-xl border-border/80 text-sm"
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-destructive">{error}</p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating}
              className="h-9 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-xl cursor-pointer shadow-xs"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  Cloning Template...
                </>
              ) : (
                <>
                  Launch in Studio
                  <ArrowRight className="ml-1.5 size-3.5" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
