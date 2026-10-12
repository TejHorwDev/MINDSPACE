import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle2, AlertCircle, Scale, Shield } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getAuthSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Terms of Service · MINDSPACE",
  description:
    "Read the MINDSPACE terms of service, acceptable use policies, code ownership, and resource guidelines for students and developers.",
};

export default async function TermsPage() {
  const session = await getAuthSession();
  const authed = !!session?.user;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader
        authed={authed}
        isAdmin={session?.user?.role === "admin"}
        name={session?.user?.name}
        email={session?.user?.email}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-12 sm:py-16 space-y-10">
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Home</span>
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-xs font-medium text-foreground">
            <FileText className="size-3.5 text-primary" />
            <span>MINDSPACE Terms of Service</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Last updated: October 2026. Welcome to MINDSPACE. By creating an account or accessing our cloud IDE, sandboxes, and AI development platform, you agree to these terms.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {/* 1. 100% Student Code Ownership */}
          <section className="rounded-xl border border-border/80 bg-card p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  1. Code & Intellectual Property Ownership
                </h2>
                <span className="text-xs text-muted-foreground font-medium">100% Student-Owned</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You retain sole and exclusive ownership of all source code, markup, blueprints, assets, and project files that you author or import into MINDSPACE. MINDSPACE does not claim any copyright, license, or intellectual property rights over student work.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You grant MINDSPACE only the limited, technical permission required to host, execute, sandbox, and render your code within your workspace and test previews.
            </p>
          </section>

          {/* 2. Acceptable Use Policy */}
          <section className="rounded-xl border border-border/80 bg-card p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-foreground/5 border border-border/80 flex items-center justify-center text-foreground">
                <Shield className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  2. Acceptable Use & Sandboxed Execution
                </h2>
                <span className="text-xs text-muted-foreground font-medium">Safe Community Standards</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              MINDSPACE provides web and terminal sandboxes to facilitate education and rapid development. You agree not to use MINDSPACE compute or published preview services for:
            </p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1.5 leading-relaxed">
              <li>Cryptocurrency mining, botnets, or distributed denial-of-service (DDoS) operations.</li>
              <li>Hosting phishing pages, credential theft campaigns, or malicious payload distribution.</li>
              <li>Attempting to break out of sandboxed containers or accessing peer tenant data.</li>
              <li>Circumventing rate limits, token quotas, or daily free credit allocations.</li>
            </ul>
            <p className="text-xs text-muted-foreground leading-relaxed pt-1">
              Previews reported for abuse are investigated promptly and may be taken down immediately under our community safety guidelines.
            </p>
          </section>

          {/* 3. Account Plans, Credits & Daily Allowances */}
          <section className="rounded-xl border border-border/80 bg-card p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-foreground/5 border border-border/80 flex items-center justify-center text-foreground">
                <Scale className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  3. Account Plans & Credit Allowances
                </h2>
                <span className="text-xs text-muted-foreground font-medium">Clear, Transparent Usage</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every MINDSPACE user is allocated daily free AI credits determined by their plan tier (e.g. Free Tier receives daily allowance reset at midnight UTC).
            </p>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-xs space-y-2">
              <span className="font-medium text-foreground">Credit balance rules:</span>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground leading-relaxed">
                <li>Daily free credits replenish automatically each day up to your plan ceiling and do not roll over.</li>
                <li>Purchased top-up credits never expire and are only deducted after daily free allowances are depleted.</li>
                <li>Bringing your own API key (BYOK) completely bypasses platform credit deductions ($0 charged).</li>
              </ul>
            </div>
          </section>

          {/* 4. Limitation of Liability */}
          <section className="rounded-xl border border-border/80 bg-card p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <AlertCircle className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  4. Disclaimers & Service Availability
                </h2>
                <span className="text-xs text-muted-foreground font-medium">Standard Cloud Disclaimers</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              While MINDSPACE aims for 99.9% uptime and auto-saves code continuously, services are provided &ldquo;as is&rdquo;. We strongly encourage downloading your project archives or exporting snapshots for local version control. MINDSPACE shall not be liable for indirect damages or data loss resulting from network disruptions or third-party AI provider downtime.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
