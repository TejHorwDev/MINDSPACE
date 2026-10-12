import type { Metadata } from "next";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Motion } from "@/components/landing/motion";
import { DevelopersDirectory } from "@/components/developers/developers-directory";

export const metadata: Metadata = {
  title: "Developers & Engineering Ecosystem · MINDSPACE",
  description:
    "Meet the design engineers and contributors building the MINDSPACE engine, and inspect the high-performance architecture powering modern web creation.",
};

export const dynamic = "force-dynamic";

export default async function DevelopersPage() {
  const session = await getAuthSession();
  const authed = !!session?.user;

  const rawDevelopers = await db.developer.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      role: true,
      bio: true,
      photoUrl: true,
      socialLinks: true,
      order: true,
    },
  });

  const developers = rawDevelopers.map((d) => ({
    id: d.id,
    name: d.name,
    slug: d.slug,
    role: d.role,
    bio: d.bio,
    photoUrl: d.photoUrl,
    socialLinks: (d.socialLinks as Record<string, string>) || null,
    order: d.order,
  }));

  return (
    <>
      <SiteHeader
        authed={authed}
        isAdmin={session?.user?.role === "admin"}
        name={session?.user?.name}
        email={session?.user?.email}
      />

      <Motion>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <DevelopersDirectory developers={developers} />
        </main>
      </Motion>

      <SiteFooter />
    </>
  );
}
