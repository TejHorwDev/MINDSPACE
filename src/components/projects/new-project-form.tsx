"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
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
import { TEMPLATES, type TemplateId } from "@/lib/templates";
import { TemplateCard } from "@/components/projects/template-picker";

export function NewProjectForm() {
  const router = useRouter();
  const [step, setStep] = useState<"pick" | "name">("pick");
  const [templateId, setTemplateId] = useState<TemplateId>("blank");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedMeta = TEMPLATES.find((t) => t.id === templateId)!;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a name for your project.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, templateId }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        project?: { id: string };
        error?: string;
      };

      if (!response.ok || !data.project) {
        setError(data.error ?? "Failed to create the project. Please try again.");
        setSubmitting(false);
        return;
      }

      router.push(`/project/${data.project.id}`);
    } catch {
      setError("Failed to create the project. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <Card className="rounded-lg border border-border bg-card shadow-none">
      <AnimatePresence mode="wait" initial={false}>
        {step === "pick" ? (
          <motion.div
            key="pick"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <CardHeader className="pb-5">
              <CardTitle className="text-xl font-semibold">New project</CardTitle>
              <CardDescription>
                Pick a starting point — every template comes with real starter
                code you can make your own.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                role="radiogroup"
                aria-label="Project template"
                className="grid gap-4 sm:grid-cols-2"
              >
                {TEMPLATES.map((meta, index) => (
                  <TemplateCard
                    key={meta.id}
                    meta={meta}
                    index={index}
                    selected={templateId === meta.id}
                    onSelect={(id) => {
                      setTemplateId(id);
                      // Advance straight to naming on deliberate double-click style selection
                      window.setTimeout(() => setStep("name"), 140);
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </motion.div>
        ) : (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold">Name your project</CardTitle>
              <CardDescription>
                Starting with{" "}
                <span className="font-medium text-foreground">{selectedMeta.name}</span>
                {" — "}
                {selectedMeta.fileCount === 0
                  ? "no starter files, a clean slate."
                  : `${selectedMeta.fileCount} starter file${selectedMeta.fileCount === 1 ? "" : "s"} will be added automatically.`}{" "}
                You can rename it anytime.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="size-4" aria-hidden="true" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="project-name">Project name</Label>
                  <Input
                    id="project-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. My portfolio, Physics club site, Art gallery"
                    maxLength={100}
                    autoFocus
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={submitting}
                    onClick={() => setStep("pick")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Change template
                  </Button>
                  <Button type="submit" disabled={submitting} className="min-w-36">
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        Creating…
                      </>
                    ) : (
                      <>
                        Create project
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
