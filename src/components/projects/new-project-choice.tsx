"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  FileCode2,
  LayoutTemplate,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function NewProjectChoice() {
  const router = useRouter();
  const [blankMode, setBlankMode] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateBlank = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = projectName.trim();
    if (!trimmed) {
      setError("Please enter a name for your project.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, templateId: "blank" }),
      });
      const data = await res.json();
      if (!res.ok || !data.project) {
        throw new Error(data.error || "Failed to create project.");
      }
      router.push(`/project/${data.project.id}/build`);
    } catch (err: any) {
      setError(err.message || "Failed to create project. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!blankMode ? (
          /* Step 1: Two Primary Options - Start Blank vs Choose a Template */
          <motion.div
            key="choice-cards"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                How do you want to start?
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Choose to start from scratch with a blank project, or pick from our curated library of responsive templates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 max-w-4xl mx-auto">
              {/* Option 1: Start Blank */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setBlankMode(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setBlankMode(true);
                  }
                }}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-7 sm:p-8 text-left transition-all duration-200 hover:border-foreground/40 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/30 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div>
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-foreground transition-transform duration-200 group-hover:scale-105 border border-border/80 mb-6">
                    <FileCode2 className="size-7 text-foreground" />
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-secondary text-muted-foreground border border-border/60 mb-3.5">
                    <Sparkles className="size-3 text-foreground" />
                    Clean Slate
                  </div>

                  <h3 className="text-xl font-bold text-foreground transition-colors">
                    Start Blank
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Build completely from scratch. No starter styles or preset markup — shape your HTML, CSS, and JavaScript your way with an empty canvas.
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>Create empty project</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>

              {/* Option 2: Explore Templates */}
              <Link
                href="/project/new/templates"
                className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-7 sm:p-8 text-left transition-all duration-200 hover:border-foreground/40 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div>
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-foreground transition-transform duration-200 group-hover:scale-105 border border-border/80 mb-6">
                    <LayoutTemplate className="size-7 text-foreground" />
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-secondary text-foreground border border-border/60 mb-3.5">
                    <Sparkles className="size-3 text-foreground" />
                    Curated Templates Catalog
                  </div>

                  <h3 className="text-xl font-bold text-foreground transition-colors">
                    Choose a Template
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Explore our full template library. Preview responsive portfolios, SaaS landing pages, multi-page websites, and hackathon clubs with real code.
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>Browse templates catalog</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </div>
          </motion.div>
        ) : (
          /* Step 2: Name your blank project */
          <motion.div
            key="blank-naming"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="rounded-xl border border-border bg-card shadow-sm max-w-lg mx-auto">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary">
                    <FileCode2 className="size-4" />
                  </div>
                  <CardTitle className="text-xl font-semibold">Name your blank project</CardTitle>
                </div>
                <CardDescription>
                  Your project will be created with an empty workspace so you can begin writing code.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleCreateBlank} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="blank-project-name">Project name</Label>
                    <Input
                      id="blank-project-name"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g. My Next Project"
                      autoFocus
                      disabled={submitting}
                      required
                      maxLength={100}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setBlankMode(false)}
                      disabled={submitting}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="size-3.5 mr-1.5" />
                      Back to options
                    </Button>

                    <Button type="submit" disabled={submitting} className="min-w-32 text-xs bg-foreground text-background hover:bg-foreground/90 font-semibold">
                      {submitting ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin mr-1.5" />
                          Creating…
                        </>
                      ) : (
                        <>
                          Create project
                          <ArrowRight className="size-3.5 ml-1.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
