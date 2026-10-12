"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";

export type AdminProject = {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
};

export function ProjectsTable({ projects }: { projects: AdminProject[] }) {
  const [target, setTarget] = useState<AdminProject | null>(null);

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-secondary">
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-16">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No projects yet.
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      {project.name}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {project.ownerName}
                      </span>
                      <span className="block text-xs text-muted-foreground/80">
                        {project.ownerEmail}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(project.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${project.name}`}
                        onClick={() => setTarget(project)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={!!target}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        endpoint={target ? `/api/admin/projects/${target.id}` : ""}
        title="Delete this project?"
        description={
          target
            ? `“${target.name}” by ${target.ownerEmail} will be permanently removed. This action cannot be undone.`
            : ""
        }
        successTitle="Project deleted"
      />
    </>
  );
}
