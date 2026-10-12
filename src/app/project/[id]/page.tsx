import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  Code2,
  Files,
  History,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { TEMPLATES } from "@/lib/templates";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ProjectBreadcrumbs } from "@/components/layout/project-breadcrumbs";
import { ProjectActions } from "@/components/projects/project-actions";
import { ProjectPublishSection } from "@/components/projects/project-publish-section";
import { ProjectMapSection } from "@/components/projects/project-map-section";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Project",
};

function activityMessage(action: string, detail?: string | null) {
  switch (action) {
    case "created":
      return "Project created";
    case "renamed":
      return detail ? `Renamed to “${detail}”` : "Project renamed";
    default:
      return action;
  }
}

function activityIcon(action: string) {
  switch (action) {
    case "created":
      return Plus;
    case "renamed":
      return Pencil;
    default:
      return History;
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const project = await db.project.findFirst({
    where: { id, ownerId: session.user.id },
    select: {
      id: true,
      name: true,
      templateUsed: true,
      isPublished: true,
      publicSlug: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { files: true } },
      files: {
        orderBy: { path: "asc" },
        select: {
          id: true,
          path: true,
          content: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const [activity] = await Promise.all([
    db.projectActivity.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, action: true, detail: true, createdAt: true },
    }),
  ]);

  const templateMeta = TEMPLATES.find((t) => t.id === project.templateUsed);
  const templateLabel = templateMeta?.name ?? "Blank project";
  const fileCount = project._count.files;

  const details = [
    {
      icon: Sparkles,
      label: "Template",
      value: templateLabel,
    },
    {
      icon: Files,
      label: "Files",
      value:
        fileCount === 0
          ? "None yet — a clean slate"
          : `${fileCount} starter file${fileCount === 1 ? "" : "s"} ready`,
    },
    {
      icon: CalendarDays,
      label: "Created",
      value: format(project.createdAt, "MMMM d, yyyy 'at' h:mm a"),
    },
    {
      icon: RefreshCw,
      label: "Last updated",
      value: format(project.updatedAt, "MMMM d, yyyy 'at' h:mm a"),
    },
  ];

  return (
    <>
      <SiteHeader
        authed
        isAdmin={session.user.role === "admin"}
        name={session.user.name}
        email={session.user.email}
      />

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 sm:px-8 lg:px-12 py-8 sm:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <ProjectBreadcrumbs projectName={project.name} />
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground -mr-2"
          >
            <Link href="/dashboard">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to dashboard
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              Project
            </p>
            <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {project.name}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild className="gap-2 bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-xs">
              <Link href={`/project/${project.id}/build`}>
                <Code2 className="size-4" aria-hidden="true" />
                Open Editor
              </Link>
            </Button>
            <ProjectActions projectId={project.id} projectName={project.name} />
          </div>
        </div>

        {/* Live Temporary Publish & Download Section */}
        <div className="mt-6">
          <ProjectPublishSection
            projectId={project.id}
            projectName={project.name}
            initialIsPublished={project.isPublished}
            initialPublicSlug={project.publicSlug}
            initialPublishedAt={project.publishedAt}
          />
        </div>

        {/* Visual Project Map Section */}
        <div className="mt-6">
          <ProjectMapSection
            projectId={project.id}
            projectName={project.name}
            initialFiles={project.files}
          />
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project Details Card */}
          <Card className="rounded-2xl border border-border/80 bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground">
                Project details
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border/60 p-6">
              {details.map((detail) => (
                <div
                  key={detail.label}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-secondary text-foreground shadow-2xs"
                      aria-hidden="true"
                    >
                      <detail.icon className="size-4" />
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {detail.label}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {detail.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Activity Log Card */}
          <Card className="rounded-2xl border border-border/80 bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="flex items-center justify-between text-sm font-bold text-foreground">
                <div className="flex items-center gap-2">
                  <History className="size-4 text-foreground" aria-hidden="true" />
                  <span>Activity History</span>
                </div>
                <span className="rounded-full border border-border/60 bg-secondary px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                  {activity.length} {activity.length === 1 ? "event" : "events"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {activity.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground text-center">
                  No activity recorded yet.
                </p>
              ) : (
                <ol className="flex flex-col">
                  {activity.map((entry) => {
                    const Icon = activityIcon(entry.action);
                    return (
                      <li
                        key={entry.id}
                        className="flex items-start gap-3 border-b border-border/60 py-3.5 last:border-0 last:pb-0 first:pt-0"
                      >
                        <span
                          className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-secondary text-foreground shadow-2xs"
                          aria-hidden="true"
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {activityMessage(entry.action, entry.detail)}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {format(entry.createdAt, "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
