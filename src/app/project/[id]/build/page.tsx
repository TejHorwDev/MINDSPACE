import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserAccountPlan } from "@/lib/account-plans";
import { getUserCreditBalance } from "@/lib/credits";
import { ProjectEditor } from "@/components/editor/project-editor";

type ProjectBuildPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ file?: string }>;
};

export async function generateMetadata({
  params,
}: ProjectBuildPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    select: { name: true },
  });

  return {
    title: project ? `${project.name} · Code Editor` : "Code Editor",
    description: "Write and edit code for your MINDSPACE project.",
  };
}

export default async function ProjectBuildPage({
  params,
  searchParams,
}: ProjectBuildPageProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    const { id } = await params;
    redirect(`/login?callbackUrl=/project/${id}/build`);
  }

  const { id } = await params;
  const search = searchParams ? await searchParams : undefined;
  const initialActiveFilePath = search?.file;

  const [project, accountPlan, credits] = await Promise.all([
    db.project.findFirst({
      where: {
        id,
        ownerId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        templateUsed: true,
        isPublished: true,
        publicSlug: true,
        publishedAt: true,
        files: {
          orderBy: { path: "asc" },
          select: {
            id: true,
            projectId: true,
            path: true,
            content: true,
            updatedAt: true,
          },
        },
      },
    }),
    getUserAccountPlan(session.user.id),
    getUserCreditBalance(session.user.id),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <ProjectEditor
      project={{
        id: project.id,
        name: project.name,
        templateUsed: project.templateUsed,
        isPublished: project.isPublished,
        publicSlug: project.publicSlug,
        publishedAt: project.publishedAt,
      }}
      initialFiles={project.files}
      initialActiveFilePath={initialActiveFilePath}
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
      accountPlan={
        accountPlan
          ? {
              id: accountPlan.id,
              name: accountPlan.name,
              dailyFreeCreditUSD: accountPlan.dailyFreeCreditUSD,
              priceUSD: (accountPlan as any).priceUSD,
            }
          : null
      }
      initialCredits={credits?.totalCredits ?? null}
    />
  );
}
