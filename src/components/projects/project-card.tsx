"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowUpRight,
  Code2,
  ExternalLink,
  FileCode2,
  Globe,
  Layers,
  MoreHorizontal,
  Pencil,
  Trash2,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RenameProjectDialog } from "@/components/projects/rename-project-dialog";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";

export type ProjectSummary = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isPublished?: boolean;
  publicSlug?: string | null;
  templateUsed?: string;
  fileCount?: number;
};

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Card className="group relative rounded-3xl border border-border/80 bg-card shadow-xs hover:border-foreground/40 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
      {/* Whole-card link */}
      <Link
        href={`/project/${project.id}`}
        className="absolute inset-0 z-0 rounded-3xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Open project “${project.name}”`}
      >
        <span className="sr-only">
          Open project {project.name} (created{" "}
          {format(new Date(project.createdAt), "MMMM d, yyyy")})
        </span>
      </Link>

      {/* Top Card Header */}
      <div className="relative z-10 flex items-start justify-between p-6 pb-2">
        <div className="flex items-center gap-2">
          {project.isPublished ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live on Edge
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground border border-border/60">
              Draft
            </span>
          )}

          {project.templateUsed && project.templateUsed !== "blank" && (
            <span className="text-[10px] font-mono uppercase bg-muted text-muted-foreground px-2 py-0.5 rounded">
              {project.templateUsed}
            </span>
          )}
        </div>

        {/* Action Menu */}
        <div className="relative z-20">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger
              aria-label={`Actions for “${project.name}”`}
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <Link href={`/project/${project.id}/build`} className="cursor-pointer">
                  <Code2 className="size-4 mr-2" />
                  Open Studio
                </Link>
              </DropdownMenuItem>

              {project.isPublished && project.publicSlug && (
                <DropdownMenuItem asChild>
                  <a
                    href={`/p/${project.publicSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="cursor-pointer"
                  >
                    <ExternalLink className="size-4 mr-2" />
                    Visit Live Site
                  </a>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onSelect={() => {
                  setMenuOpen(false);
                  setRenameOpen(true);
                }}
                className="cursor-pointer"
              >
                <Pencil className="size-4 mr-2" />
                Rename Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
                className="cursor-pointer"
              >
                <Trash2 className="size-4 mr-2" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Project Details */}
      <CardContent className="pointer-events-none p-6 pt-2">
        <h3 className="line-clamp-1 text-lg font-bold text-foreground group-hover:text-indigo-500 transition-colors">
          {project.name}
        </h3>

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          {typeof project.fileCount === "number" && (
            <div className="flex items-center gap-1.5 font-mono">
              <FileCode2 className="size-3.5 text-muted-foreground" />
              <span>{project.fileCount} {project.fileCount === 1 ? "file" : "files"}</span>
            </div>
          )}

          <div>
            Updated {format(new Date(project.updatedAt), "MMM d")}
          </div>
        </div>
      </CardContent>

      {/* Card Footer */}
      <div className="relative z-10 flex items-center justify-between border-t border-border/60 bg-muted/30 px-6 py-3 text-xs">
        <span className="font-mono text-[11px] text-muted-foreground">
          ID: {project.id.slice(0, 8)}...
        </span>

        <span className="flex items-center gap-1 font-medium text-foreground transition-transform group-hover:translate-x-0.5">
          Open Studio
          <ArrowUpRight className="size-3.5" />
        </span>
      </div>

      <RenameProjectDialog
        projectId={project.id}
        currentName={project.name}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />

      <DeleteProjectDialog
        projectId={project.id}
        projectName={project.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </Card>
  );
}
