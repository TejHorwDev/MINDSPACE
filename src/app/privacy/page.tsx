import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, UserX, Lock, KeyRound, ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getAuthSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Privacy Policy & Data Rights · MINDSPACE",
  description:
    "Learn about our privacy practices, sandboxed environments, data isolation, and self-service account deletion.",
};

export default async function PrivacyPage() {
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
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-xs font-medium text-foreground">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            <span>MINDSPACE Privacy & Security Standard</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Privacy Policy & Data Ownership
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Last updated: October 2026. MINDSPACE was built by students, for students. We believe your code,
            prompts, API keys, and workspace data belong exclusively to you. We do not sell your personal data or train AI models on your private code.
          </p>
        </div>

        {/* Section Cards */}
        <div className="space-y-8">
          {/* 1. Self-Service Account Deletion */}
          <section className="rounded-xl border border-destructive/25 bg-destructive/[0.02] p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                <UserX className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  1. Self-Service Account & Data Deletion
                </h2>
                <span className="text-xs text-destructive font-medium">Permanent & Immediate</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You retain total control over your account and personal data. You can permanently delete your account and all associated
              data at any time directly from your{" "}
              <Link href="/settings" className="text-foreground underline font-medium hover:text-primary">
                Settings page
              </Link>
              . Deletion requires re-entering your account password or confirmation phrase to prevent accidental loss.
            </p>
            <div className="rounded-lg border border-border/60 bg-background/50 p-4 text-xs space-y-2">
              <span className="font-medium text-foreground">When you trigger account deletion:</span>
              <ul className="list-disc list-inside space-y-1.5 text-muted-foreground leading-relaxed">
                <li>All your projects, code files, and blueprints are permanently purged from the database.</li>
                <li>All published preview sites under <code>/p/[slug]</code> and their static assets are wiped from disk.</li>
                <li>All AI chat history, prompt logs, and credit transaction records are deleted.</li>
                <li>All stored BYOK API keys and MCP server configurations are wiped immediately.</li>
                <li>You are immediately signed out across all active sessions.</li>
              </ul>
            </div>
          </section>

          {/* 2. Zero Secrets Exposure & BYOK Security */}
          <section className="rounded-xl border border-border/80 bg-card p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-foreground/5 border border-border/80 flex items-center justify-center text-foreground">
                <Lock className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  2. Zero Secrets Exposure & Encryption
                </h2>
                <span className="text-xs text-muted-foreground font-medium">AES-256-GCM Vault</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you configure personal AI provider keys (Gemini, Groq, OpenAI, NVIDIA NIM) or private MCP server auth tokens,
              they are encrypted at rest using an AES-256-GCM authenticated cipher before storage.
              Decryption keys never leave the server-side environment.
            </p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1.5 pt-1 leading-relaxed">
              <li>Raw API keys and tokens are never returned to the browser; only safe masks (e.g. <code>sk-••••1234</code>) are displayed.</li>
              <li>Terminal sessions run in isolated sandboxes with scrubbed environments: no database credentials, no AI keys, and no host secrets are exposed.</li>
              <li>Network isolation prevents sandbox container processes from accessing internal database or infrastructure ports.</li>
            </ul>
          </section>

          {/* 3. AI Pair-Programmer & MCP Data Handling */}
          <section className="rounded-xl border border-border/80 bg-card p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-foreground/5 border border-border/80 flex items-center justify-center text-foreground">
                <KeyRound className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  3. AI & Model Context Protocol (MCP) Isolation
                </h2>
                <span className="text-xs text-muted-foreground font-medium">Strictly Scoped Tools</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your personal MCP tool connections and AI keys are strictly scoped to your authenticated account.
              No other student or project has visibility or execution access to your custom endpoints.
              All external tool calls are executed server-side with strict timeouts and response bounds to prevent unconstrained execution.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
