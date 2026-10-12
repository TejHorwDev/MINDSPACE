import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/layout/site-header";
import { ProjectMapFullScreenView } from "@/components/projects/project-map-full-screen-view";

type ProjectMapPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Project Map | MINDSPACE",
};

export default async function ProjectMapPage({ params }: ProjectMapPageProps) {
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
      isPublished: true,
      publicSlug: true,
      publishedAt: true,
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

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      <SiteHeader
        authed
        isAdmin={session.user.role === "admin"}
        name={session.user.name}
        email={session.user.email}
      />

      <main className="flex-1 w-full flex flex-col min-h-0 overflow-hidden">
        <ProjectMapFullScreenView
          projectId={project.id}
          projectName={project.name}
          initialFiles={project.files}
          initialIsPublished={project.isPublished}
          initialPublicSlug={project.publicSlug}
          initialPublishedAt={project.publishedAt}
        />
      </main>
    </div>
  );
}
