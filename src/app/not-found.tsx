import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <SiteHeader authed={false} />
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="flex max-w-sm flex-col items-center text-center">
          <span
            className="mb-4 inline-flex size-12 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground"
            aria-hidden="true"
          >
            <FileQuestion className="size-5" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Page not found
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The page you are looking for doesn&apos;t exist, or the project may
            have been deleted.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/">Go home</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
