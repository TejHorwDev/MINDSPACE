import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getAllTemplates } from "@/lib/templates/service";
import { TemplateExplorer } from "@/components/templates/template-explorer";

export const metadata: Metadata = {
  title: "Browse Templates · MINDSPACE",
  description: "Explore professionally designed website templates for students and builders.",
};

export default async function NewProjectTemplatesPage() {
  const session = await getAuthSession();
  const authed = !!session?.user?.id;
  const templates = await getAllTemplates();

  return (
    <>
      <SiteHeader
        authed={authed}
        isAdmin={session?.user?.role === "admin"}
        name={session?.user?.name}
        email={session?.user?.email}
      />

      <main className="w-full flex-1 flex flex-col">
        <TemplateExplorer templates={templates} authed={authed} />
      </main>

      <SiteFooter />
    </>
  );
}
