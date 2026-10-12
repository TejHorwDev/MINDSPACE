"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors for debugging
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <SiteHeader authed={false} />

      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="flex max-w-md flex-col items-center text-center">
          <span
            className="mb-4 inline-flex size-12 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive"
            aria-hidden="true"
          >
            <AlertCircle className="size-6" />
          </span>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Something went wrong
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We encountered an unexpected glitch loading this page. Your projects
            and files remain safe in your workspace.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => reset()} className="gap-2">
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
