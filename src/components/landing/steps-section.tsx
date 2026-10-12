"use client";

import { FolderPlus, KeyRound, Layers, Sparkles, Wand2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/landing/reveal";

const steps = [
  {
    icon: KeyRound,
    step: "01",
    title: "Claim your workspace",
    description:
      "Sign up in seconds. Your projects are stored privately with zero tracking or clutter.",
    badge: "Instant Access",
  },
  {
    icon: FolderPlus,
    step: "02",
    title: "Design or choose a blueprint",
    description:
      "Start from scratch with HTML5 & Tailwind or pick a pre-built blueprint. Edit code and preview simultaneously.",
    badge: "Visual & Code",
  },
  {
    icon: Layers,
    step: "03",
    title: "Publish & deploy instantly",
    description:
      "Push live to the global Edge with a permanent custom slug or download the full production ZIP file.",
    badge: "1-Click Edge",
  },
];

export function StepsSection() {
  return (
    <section
      aria-label="How MINDSPACE works"
      className="mx-auto w-full max-w-[1800px] px-4 py-24 sm:px-8 lg:px-12 border-t border-border/60"
    >
      <div className="mx-auto max-w-3xl text-center mb-16">
        <p className="text-xs font-mono font-bold tracking-widest text-indigo-500 uppercase">
          Simple Workflow
        </p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          From spark of inspiration to live web URL.
        </h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Three simple, streamlined steps to launch your digital creations into the world.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {steps.map((step, index) => (
          <Reveal key={step.title} delay={index * 0.1} className="h-full">
            <Card className="group h-full rounded-3xl border border-border/80 bg-card shadow-xs transition-all duration-300 hover:border-foreground/40 hover:shadow-xl">
              <CardContent className="flex h-full flex-col justify-between p-8">
                <div>
                  <div className="flex items-center justify-between pb-6">
                    <span
                      className="inline-flex size-12 items-center justify-center rounded-2xl bg-secondary text-foreground transition-transform duration-300 ease-out group-hover:scale-110 shadow-2xs border border-border/60"
                      aria-hidden="true"
                    >
                      <step.icon className="size-5 text-indigo-500" />
                    </span>
                    <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border/60">
                      STEP {step.step}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-foreground">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">{step.badge}</span>
                  <span className="text-emerald-500 font-mono font-semibold">Ready</span>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
