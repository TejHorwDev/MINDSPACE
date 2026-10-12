import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Code2,
  FileCode2,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  Sparkles,
  Twitter,
  User,
} from "lucide-react";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Motion } from "@/components/landing/motion";
import { DeveloperAvatar } from "@/components/developers/developer-avatar";
import { DeveloperProfileHeader } from "@/components/developers/developer-profile-header";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type SocialLinks = {
  github?: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  website?: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const developer = await db.developer.findUnique({ where: { slug } });
  if (!developer) return { title: "Developer Profile · MINDSPACE" };
  return {
    title: `${developer.name} · ${developer.role} · MINDSPACE`,
    description: `${developer.name} (${developer.role}) on MINDSPACE.`,
  };
}

export default async function DeveloperProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [session, developer, otherDevelopers] = await Promise.all([
    getAuthSession(),
    db.developer.findUnique({ where: { slug } }),
    db.developer.findMany({
      where: { slug: { not: slug } },
      take: 4,
      select: {
        id: true,
        name: true,
        slug: true,
        role: true,
        photoUrl: true,
      },
    }),
  ]);

  if (!developer) notFound();

  const authed = !!session?.user;
  const isAdmin = session?.user?.role === "admin";
  const links = (developer.socialLinks ?? {}) as SocialLinks;

  return (
    <>
      <SiteHeader
        authed={authed}
        isAdmin={isAdmin}
        name={session?.user?.name}
        email={session?.user?.email}
      />

      <Motion>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 sm:px-8 lg:px-12 py-8 sm:py-14 space-y-10">
          {/* Back Navigation Bar */}
          <div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-3 gap-2 text-muted-foreground hover:text-foreground rounded-xl"
            >
              <Link href="/developers">
                <ArrowLeft className="size-4" />
                Back to Creator Directory
              </Link>
            </Button>
          </div>

          {/* Interactive Profile Hero with Direct Local Photo Upload */}
          <DeveloperProfileHeader
            developer={{
              id: developer.id,
              name: developer.name,
              slug: developer.slug,
              role: developer.role,
              bio: developer.bio,
              photoUrl: developer.photoUrl,
              socialLinks: links,
            }}
            isAdmin={isAdmin}
          />

          {/* Clean Editorial Dossier */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Biography Card (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="rounded-3xl border border-border/80 bg-card p-8 sm:p-12 shadow-xs space-y-6">
                <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-neutral-400 uppercase">
                  <User className="size-4" />
                  <span>About the Builder</span>
                </div>

                <div className="space-y-4">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Biography
                  </h2>

                  <p className="text-base sm:text-lg leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {developer.bio || "No biography provided yet."}
                  </p>
                </div>

                {/* Primary Social Presence */}
                {Object.keys(links).length > 0 && (
                  <div className="pt-6 border-t border-border/60">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                      Connect & Follow
                    </span>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {links.github && (
                        <a
                          href={links.github}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border/70 bg-secondary/50 hover:bg-secondary text-xs font-medium text-foreground transition-colors"
                        >
                          <Github className="size-4 text-muted-foreground" />
                          <span>GitHub Profile</span>
                          <ArrowUpRight className="size-3 text-muted-foreground" />
                        </a>
                      )}
                      {links.linkedin && (
                        <a
                          href={links.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border/70 bg-secondary/50 hover:bg-secondary text-xs font-medium text-foreground transition-colors"
                        >
                          <Linkedin className="size-4 text-muted-foreground" />
                          <span>LinkedIn</span>
                          <ArrowUpRight className="size-3 text-muted-foreground" />
                        </a>
                      )}
                      {links.twitter && (
                        <a
                          href={links.twitter}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border/70 bg-secondary/50 hover:bg-secondary text-xs font-medium text-foreground transition-colors"
                        >
                          <Twitter className="size-4 text-muted-foreground" />
                          <span>X / Twitter</span>
                          <ArrowUpRight className="size-3 text-muted-foreground" />
                        </a>
                      )}
                      {links.instagram && (
                        <a
                          href={links.instagram}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border/70 bg-secondary/50 hover:bg-secondary text-xs font-medium text-foreground transition-colors"
                        >
                          <Instagram className="size-4 text-muted-foreground" />
                          <span>Instagram</span>
                          <ArrowUpRight className="size-3 text-muted-foreground" />
                        </a>
                      )}
                      {links.website && (
                        <a
                          href={links.website}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border/70 bg-secondary/50 hover:bg-secondary text-xs font-medium text-foreground transition-colors"
                        >
                          <Globe className="size-4 text-muted-foreground" />
                          <span>Personal Website</span>
                          <ArrowUpRight className="size-3 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Quick Context Sidebar (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-neutral-400 uppercase">
                  <Sparkles className="size-4" />
                  <span>Platform Role</span>
                </div>

                <div className="space-y-1">
                  <div className="text-xl font-bold text-foreground">{developer.role}</div>
                  <p className="text-xs text-muted-foreground">
                    Contributing to the MINDSPACE visual web development suite.
                  </p>
                </div>

                <div className="pt-4 border-t border-border/60">
                  <Button asChild className="w-full bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-xl">
                    <Link href="/project/new">
                      Launch Studio Sandbox
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Other Creators (only if exist in DB) */}
              {otherDevelopers.length > 0 && (
                <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      Other Creators
                    </h3>
                    <Link href="/developers" className="text-xs text-neutral-400 hover:text-foreground hover:underline">
                      Directory
                    </Link>
                  </div>

                  <div className="space-y-2.5">
                    {otherDevelopers.map((other) => (
                      <Link
                        key={other.id}
                        href={`/developers/${other.slug}`}
                        className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-secondary/30 hover:border-foreground/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <DeveloperAvatar
                            name={other.name}
                            photoUrl={other.photoUrl}
                            size={36}
                          />
                          <div>
                            <div className="text-xs font-bold text-foreground">{other.name}</div>
                            <div className="text-[11px] text-muted-foreground">{other.role}</div>
                          </div>
                        </div>
                        <ArrowUpRight className="size-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </Motion>

      <SiteFooter />
    </>
  );
}
