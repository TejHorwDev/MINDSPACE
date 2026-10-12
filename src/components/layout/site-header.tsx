"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader({
  authed,
  isAdmin = false,
  name,
  email,
  fluid = false,
}: {
  authed: boolean;
  isAdmin?: boolean;
  name?: string | null;
  email?: string | null;
  fluid?: boolean;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isDashboard =
    pathname === "/dashboard" ||
    (pathname.startsWith("/project") && !pathname.startsWith("/project/new/templates")) ||
    pathname.startsWith("/docs");
  const isTemplates = pathname === "/templates" || pathname.startsWith("/project/new/templates");
  const isDevelopers = pathname.startsWith("/developers");
  const isAdminPage = pathname.startsWith("/admin");

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300",
        scrolled
          ? "border-border bg-background/85 shadow-[0_1px_12px_rgb(0,0,0,0.04)] backdrop-blur-xl backdrop-saturate-150"
          : "border-border/60 bg-background/60 backdrop-blur-md"
      )}
    >
      <div
        className={cn(
          "relative mx-auto flex h-14 w-full items-center justify-between px-4 sm:px-8 lg:px-12",
          fluid ? "max-w-none" : "max-w-[1800px]"
        )}
      >
        {/* Left Side: Brand Logo ONLY */}
        <div className="flex items-center shrink-0 z-20">
          <Logo href="/" />
        </div>

        {/* Center: True Mathematical Dead-Center Navigation */}
        <nav
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden sm:flex items-center gap-6 lg:gap-8 z-10 pointer-events-auto"
          aria-label="Primary"
        >
          {authed && (
            <Link
              href="/dashboard"
              className={cn(
                "text-xs sm:text-sm transition-colors py-1",
                isDashboard
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Dashboard
            </Link>
          )}

          <Link
            href="/templates"
            className={cn(
              "text-xs sm:text-sm transition-colors py-1",
              isTemplates
                ? "text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Templates
          </Link>

          <Link
            href="/developers"
            className={cn(
              "text-xs sm:text-sm transition-colors py-1",
              isDevelopers
                ? "text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Developers
          </Link>

          {authed && (
            <Link
              href="/upgrade"
              className={cn(
                "text-xs sm:text-sm transition-colors py-1",
                pathname === "/upgrade"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Upgrade
            </Link>
          )}

          {authed && (
            <Link
              href="/credits"
              className={cn(
                "text-xs sm:text-sm transition-colors py-1",
                pathname === "/credits"
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Credits
            </Link>
          )}

          {authed && isAdmin && (
            <Link
              href="/admin"
              aria-label="Open the admin panel"
              className={cn(
                "inline-flex items-center gap-1.5 text-xs sm:text-sm transition-colors py-1",
                isAdminPage
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              <span>Admin</span>
            </Link>
          )}
        </nav>

        {/* Right Side: Credits Quick Chip, Theme Toggle & User Auth */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 z-20">
          {authed && (
            <Link
              href="/credits"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-border/80 bg-secondary/40 hover:bg-secondary hover:border-foreground/20 transition-all"
              title="Manage AI credits and account tier"
            >
              <span className="text-amber-500 font-bold">$</span>
              <span>Credits & Tier</span>
            </Link>
          )}
          <ThemeToggle />
          {authed ? (
            <UserMenu name={name} email={email} />
          ) : (
            <nav
              className="flex items-center gap-1.5 sm:gap-2"
              aria-label="Authentication"
            >
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground text-xs sm:text-sm"
              >
                <Link href="/login">Log in</Link>
              </Button>
              <Button
                asChild
                variant="default"
                size="sm"
                className="text-xs sm:text-sm bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-xs"
              >
                <Link href="/signup">Get started</Link>
              </Button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
