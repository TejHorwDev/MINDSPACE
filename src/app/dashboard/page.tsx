import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserAccountPlan, checkCanCreateProject, checkStorageQuota } from "@/lib/account-plans";
import { getUserCreditBalance } from "@/lib/credits";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import {
  DashboardView,
  type DashboardProjectItem,
  type DashboardUnifiedItem,
} from "@/components/dashboard/dashboard-view";

export const metadata: Metadata = {
  title: "Dashboard · MINDSPACE Studio",
  description: "Manage your websites, documents, account plans and quotas in one unified workspace.",
};

export const dynamic = "force-dynamic";

function extractWordCount(contentJson: any): number {
  if (!contentJson) return 0;
  try {
    let text = "";
    const traverse = (node: any) => {
      if (!node) return;
      if (node.text) text += " " + node.text;
      if (Array.isArray(node.content)) {
        node.content.forEach(traverse);
      }
    };
    traverse(contentJson);
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  } catch {
    return 0;
  }
}

export default async function DashboardPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const userId = session.user.id;

  const [rawProjects, rawDocs, rawPresentations, currentPlan, creditBalance, projectQuota, storageQuota, me] =
    await Promise.all([
      db.project.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          isPublished: true,
          publicSlug: true,
          templateUsed: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { files: true },
          },
        },
      }),
      db.document.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          contentJson: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.presentation.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { slides: true },
          },
        },
      }),
      getUserAccountPlan(userId),
      getUserCreditBalance(userId),
      checkCanCreateProject(userId),
      checkStorageQuota(userId, 0),
      db.user.findUnique({
        where: { id: userId },
        select: { role: true, name: true, email: true },
      }),
    ]);

  const projects: DashboardProjectItem[] = rawProjects.map((p) => ({
    id: p.id,
    name: p.name,
    isPublished: p.isPublished,
    publicSlug: p.publicSlug,
    templateUsed: p.templateUsed,
    fileCount: p._count?.files || 0,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  const unifiedProjects: DashboardUnifiedItem[] = rawProjects.map((p) => ({
    id: p.id,
    type: "website" as const,
    name: p.name,
    isPublished: p.isPublished,
    publicSlug: p.publicSlug,
    templateUsed: p.templateUsed,
    fileCount: p._count?.files || 0,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  const unifiedDocs: DashboardUnifiedItem[] = rawDocs.map((d) => ({
    id: d.id,
    type: "document" as const,
    name: d.title,
    wordCount: extractWordCount(d.contentJson),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  const unifiedPresentations: DashboardUnifiedItem[] = rawPresentations.map((p) => ({
    id: p.id,
    type: "presentation" as const,
    name: p.title,
    slideCount: p._count?.slides || 0,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  const initialItems: DashboardUnifiedItem[] = [
    ...unifiedProjects,
    ...unifiedDocs,
    ...unifiedPresentations,
  ].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <>
      <SiteHeader
        authed
        isAdmin={me?.role === "admin"}
        name={me?.name || session.user.name}
        email={me?.email || session.user.email}
      />

      <main className="w-full flex-1 px-4 sm:px-8 lg:px-12 py-8 sm:py-10">
        <DashboardView
          userName={me?.name || session.user.name || null}
          userEmail={me?.email || session.user.email || null}
          currentPlan={{
            id: currentPlan?.id || "free-default",
            name: currentPlan?.name || "Free",
            dailyFreeCreditUSD: currentPlan?.dailyFreeCreditUSD ?? 20,
            maxProjects: currentPlan?.maxProjects ?? 5,
            maxStorageMB: currentPlan?.maxStorageMB ?? 250,
            isDefault: currentPlan?.isDefault ?? true,
          }}
          creditBalance={{
            freeCredits: creditBalance.freeCredits,
            purchasedCredits: creditBalance.purchasedCredits,
            totalCredits: creditBalance.totalCredits,
            isPaidUser: creditBalance.isPaidUser,
            creditsResetAt: creditBalance.creditsResetAt.toISOString(),
          }}
          quotas={{
            projects: {
              used: projectQuota.currentCount,
              max: projectQuota.maxProjects,
              allowed: projectQuota.allowed,
            },
            storage: {
              usedMB: Number((storageQuota.usedBytes / (1024 * 1024)).toFixed(2)),
              maxMB: storageQuota.maxStorageMB,
              allowed: storageQuota.allowed,
            },
          }}
          initialProjects={projects}
          initialItems={initialItems}
        />
      </main>

      <SiteFooter />
    </>
  );
}
