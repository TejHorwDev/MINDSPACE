import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAuthSession } from "@/lib/auth";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ProjectBreadcrumbs } from "@/components/layout/project-breadcrumbs";
import { NewProjectChoice } from "@/components/projects/new-project-choice";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "New project",
  description: "Create a new website in MINDSPACE.",
};

export default async function NewProjectPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/project/new");
  }

  const isAdmin = session.user.role === "admin";

  return (
    <>
      <SiteHeader
        authed
        isAdmin={isAdmin}
        name={session.user.name}
        email={session.user.email}
      />

      <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 sm:px-8 lg:px-12 py-8 sm:py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <ProjectBreadcrumbs isNew />
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

        <NewProjectChoice />
      </main>

      <SiteFooter />
    </>
  );
}
