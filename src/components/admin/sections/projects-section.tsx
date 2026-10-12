"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  ExternalLink,
  FileCode2,
  FolderGit2,
  Globe,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProjectItem {
  id: string;
  name: string;
  templateUsed: string;
  isPublished: boolean;
  publicSlug: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string | null;
    email: string;
  };
  _count?: {
    files: number;
    chatSessions: number;
    reports: number;
  };
}

interface ProjectDetail extends ProjectItem {
  owner: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    accountPlan?: { name: string } | null;
  };
  files: Array<{
    id: string;
    path: string;
    updatedAt: string;
  }>;
  activity: Array<{
    id: string;
    action: string;
    detail: string | null;
    createdAt: string;
  }>;
  chatSessions: Array<{
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    _count: { messages: number };
  }>;
  reports: Array<{
    id: string;
    reason: string;
    status: string;
    createdAt: string;
  }>;
}

interface ProjectsSectionProps {
  userRole?: string;
}

export function ProjectsSection({ userRole = "admin" }: ProjectsSectionProps) {
  const isModerator = userRole === "moderator";

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [publishFilter, setPublishFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkExecuting, setIsBulkExecuting] = useState(false);

  // Detail Modal
  const [detailProject, setDetailProject] = useState<ProjectDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Delete Individual Project
  const [projectToDelete, setProjectToDelete] = useState<ProjectItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        template: templateFilter,
        publishStatus: publishFilter,
        sortBy,
        sortOrder,
      });
      const res = await fetch(`/api/admin/projects?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, templateFilter, publishFilter, sortBy, sortOrder]);

  const handleOpenDetail = async (projectId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setDetailProject(data.project);
      }
    } catch {
      toast.error("Failed to load project details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExecuteBulk = async (action: "delete" | "unpublish") => {
    if (selectedIds.length === 0) return;
    setIsBulkExecuting(true);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          projectIds: selectedIds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Bulk action completed");
        setSelectedIds([]);
        fetchProjects();
      } else {
        const err = await res.json();
        toast.error(err.error || "Bulk action failed");
      }
    } catch {
      toast.error("Bulk action failed");
    } finally {
      setIsBulkExecuting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`Deleted project “${projectToDelete.name}”`);
        setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
        setProjectToDelete(null);
        if (detailProject?.id === projectToDelete.id) setDetailProject(null);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete project");
      }
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === projects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(projects.map((p) => p.id));
    }
  };

  const toggleSelectProject = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Projects Directory
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Search, filter by template/publish status, inspect project files and chat sessions, or perform bulk actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProjects}
            disabled={loading}
            className="h-9 gap-1.5 text-xs shadow-2xs"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-border/80 bg-card/60 p-3 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search project name or owner..."
            className="h-9 w-full rounded-xl border border-border/70 bg-background/80 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
          />
        </div>

        {/* Publish Status Filter */}
        <select
          value={publishFilter}
          onChange={(e) => setPublishFilter(e.target.value)}
          aria-label="Filter by publish status"
          className="h-9 rounded-xl border border-border/70 bg-background/80 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published Live</option>
          <option value="draft">Draft Only</option>
        </select>

        {/* Template Filter */}
        <select
          value={templateFilter}
          onChange={(e) => setTemplateFilter(e.target.value)}
          aria-label="Filter by template"
          className="h-9 rounded-xl border border-border/70 bg-background/80 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs cursor-pointer"
        >
          <option value="all">All Templates</option>
          <option value="blank">Blank Starter</option>
          <option value="portfolio">Portfolio</option>
          <option value="club-event">Club & Events</option>
          <option value="multi-page">Multi-Page</option>
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="Sort projects by"
          className="h-9 rounded-xl border border-border/70 bg-background/80 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs cursor-pointer"
        >
          <option value="updatedAt">Last Updated</option>
          <option value="createdAt">Date Created</option>
          <option value="name">Project Name</option>
        </select>

        <button
          type="button"
          onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
          className="flex h-9 items-center gap-1 rounded-xl border border-border/70 bg-background/80 px-2.5 text-xs text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer"
          title="Toggle sort direction"
        >
          <ArrowUpDown className="size-3.5" />
          <span className="text-[10px] uppercase font-mono">{sortOrder}</span>
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && !isModerator && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 animate-in fade-in-0 shadow-sm">
          <span className="font-semibold">{selectedIds.length} project(s) selected</span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExecuteBulk("unpublish")}
              disabled={isBulkExecuting}
              className="h-8 text-xs bg-background/80"
            >
              Unpublish Selected
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleExecuteBulk("delete")}
              disabled={isBulkExecuting}
              className="h-8 text-xs gap-1"
            >
              <Trash2 className="size-3" />
              <span>Delete Selected</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="h-8 text-xs text-muted-foreground"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Projects Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/80 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={projects.length > 0 && selectedIds.length === projects.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all projects"
                    className="size-3.5 rounded border-border cursor-pointer accent-emerald-500"
                  />
                </th>
                <th className="p-3">Project</th>
                <th className="p-3">Owner</th>
                <th className="p-3">Template</th>
                <th className="p-3">Status</th>
                <th className="p-3">Files</th>
                <th className="p-3">Chat Sessions</th>
                <th className="p-3">Updated</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="p-3"><Skeleton className="size-4" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-10" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-10" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="p-3 text-right"><Skeleton className="h-7 w-14 ml-auto" /></td>
                  </tr>
                ))
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No projects found matching your criteria.
                  </td>
                </tr>
              ) : (
                projects.map((p) => {
                  const isSelected = selectedIds.includes(p.id);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleOpenDetail(p.id)}
                      className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                        isSelected ? "bg-emerald-500/5" : ""
                      }`}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectProject(p.id)}
                          aria-label={`Select project ${p.name}`}
                          className="size-3.5 rounded border-border cursor-pointer accent-emerald-500"
                        />
                      </td>

                      {/* Name */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <FolderGit2 className="size-4 text-emerald-400 shrink-0" />
                          <span className="font-semibold text-foreground truncate">{p.name}</span>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="p-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {p.owner.name || p.owner.email}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{p.owner.email}</p>
                        </div>
                      </td>

                      {/* Template */}
                      <td className="p-3">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {p.templateUsed}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        {p.isPublished ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Globe className="size-2.5" />
                            <span>Live</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-muted-foreground">
                            Draft
                          </span>
                        )}
                      </td>

                      {/* Files */}
                      <td className="p-3 font-mono text-muted-foreground">{p._count?.files ?? 0}</td>

                      {/* Chat Sessions */}
                      <td className="p-3 font-mono text-muted-foreground">
                        {p._count?.chatSessions ?? 0}
                      </td>

                      {/* Updated */}
                      <td className="p-3 text-muted-foreground text-[11px]">
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetail(p.id)}
                            className="h-7 text-xs px-2"
                          >
                            Details
                          </Button>
                          {!isModerator && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setProjectToDelete(p)}
                              className="size-7 text-muted-foreground hover:text-destructive"
                              title="Delete project"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Project Detail Dialog (Files, Chat Sessions, Publish Info) */}
      <Dialog open={Boolean(detailProject)} onOpenChange={(open) => !open && setDetailProject(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailProject && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-border/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 font-bold text-lg border border-emerald-500/20">
                    <FolderGit2 className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">{detailProject.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Owner: {detailProject.owner.name || detailProject.owner.email} (
                      {detailProject.owner.email}) · Plan:{" "}
                      <strong>{detailProject.owner.accountPlan?.name || "Free"}</strong>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary font-mono text-muted-foreground">
                        Template: {detailProject.templateUsed}
                      </span>
                      {detailProject.isPublished && (
                        <a
                          href={`/p/${detailProject.publicSlug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                        >
                          <span>/p/{detailProject.publicSlug}</span>
                          <ExternalLink className="size-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Sessions (NEW REQUIREMENT IN SECTION 5 & 7) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="size-3.5 text-indigo-400" />
                    <span>Chat Sessions ({detailProject.chatSessions.length})</span>
                  </h4>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Independent project sessions
                  </span>
                </div>

                {detailProject.chatSessions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    No chat sessions initiated for this project yet.
                  </p>
                ) : (
                  <div className="rounded-xl border border-border/70 overflow-hidden divide-y divide-border/60">
                    {detailProject.chatSessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-2.5 flex items-center justify-between text-xs hover:bg-muted/30"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <MessageSquare className="size-3 text-muted-foreground shrink-0" />
                          <span className="font-semibold text-foreground truncate">
                            {session.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0 font-mono">
                          <span>{session._count.messages} messages</span>
                          <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Project Files */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileCode2 className="size-3.5 text-cyan-400" />
                  <span>Project Files ({detailProject.files.length})</span>
                </h4>
                <div className="rounded-xl border border-border/70 overflow-hidden divide-y divide-border/60 max-h-48 overflow-y-auto">
                  {detailProject.files.map((file) => (
                    <div
                      key={file.id}
                      className="p-2 flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-foreground">{file.path}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(file.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Log */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Project Activity
                </h4>
                <div className="rounded-xl border border-border/70 overflow-hidden divide-y divide-border/60 max-h-40 overflow-y-auto">
                  {detailProject.activity.map((act) => (
                    <div
                      key={act.id}
                      className="p-2 flex items-center justify-between text-xs"
                    >
                      <span className="text-foreground capitalize">
                        {act.action}: {act.detail || "Action performed"}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(act.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog open={Boolean(projectToDelete)} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <span>Confirm Delete Project</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete “{projectToDelete?.name}”? All files, chat
              sessions, and revisions will be permanently destroyed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setProjectToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Permanently Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
