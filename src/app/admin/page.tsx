import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { AdminDashboardView } from "@/components/admin/admin-dashboard-view";
import { getAllTemplates } from "@/lib/templates/service";

export const metadata: Metadata = {
  title: "Admin Console · MINDSPACE",
  description: "Executive control center for creators, blueprints, projects, and users.",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Role is checked fresh from the database — no stale token trust.
  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (me?.role !== "admin" && me?.role !== "moderator") {
    redirect("/dashboard");
  }

  const [users, projects, templates, developerCount, channels, plans, providers, searchProviders] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { projects: true } },
      },
    }),
    db.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { name: true, email: true } } },
    }),
    getAllTemplates(),
    db.developer.count(),
    db.contactChannel.findMany({
      orderBy: { displayOrder: "asc" },
    }),
    db.creditPlan.findMany({
      orderBy: { displayOrder: "asc" },
    }),
    db.aiProvider.findMany({
      orderBy: { priority: "asc" },
    }),
    db.searchProvider.findMany({
      orderBy: { priority: "asc" },
    }),
  ]);

  const serializedUsers = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    projectCount: user._count.projects,
  }));

  const serializedProjects = projects.map((project) => ({
    id: project.id,
    name: project.name,
    ownerName: project.owner.name ?? project.owner.email,
    ownerEmail: project.owner.email,
    createdAt: project.createdAt.toISOString(),
  }));

  return (
    <>
      <SiteHeader
        authed
        isAdmin
        name={session.user.name}
        email={session.user.email}
      />

      <main className="w-full flex-1 flex flex-col">
        <AdminDashboardView
          currentUserId={session.user.id}
          adminName={session.user.name}
          adminEmail={session.user.email}
          userRole={me?.role || "student"}
          users={serializedUsers}
          projects={serializedProjects}
          templates={templates}
          developerCount={developerCount}
          channels={channels}
          plans={plans}
          providers={providers}
          searchProviders={searchProviders}
        />
      </main>

      <SiteFooter />
    </>
  );
}
