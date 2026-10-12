"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, Sparkles, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURED_TEMPLATES = [
  {
    id: "portfolio",
    title: "Minimal Developer Portfolio",
    category: "Portfolio",
    description: "High-contrast dark showcase featuring bio, active projects grid, experience timeline, and social links.",
    tags: ["HTML5", "Tailwind CSS", "Dark Mode", "Responsive"],
    previewUrl: "/project/new/templates",
    accent: "from-zinc-800/40 to-zinc-900/30",
  },
  {
    id: "agency",
    title: "Agency & Studio Multi-Page",
    category: "Multi-Page",
    description: "Complete 4-page studio website with smooth navigation, case studies, client testimonials, and inquiry form.",
    tags: ["Multi-Page", "Modern Grid", "Forms", "Clean Ink"],
    previewUrl: "/project/new/templates",
    accent: "from-zinc-800/30 to-neutral-900/20",
  },
  {
    id: "club-event",
    title: "Campus Hackathon & Club Event",
    category: "Events",
    description: "Vibrant high-energy event page with live countdown timer, speaker grid, prize tracks, and registration CTA.",
    tags: ["Countdown", "Event Grid", "Speakers", "Registration"],
    previewUrl: "/project/new/templates",
    accent: "from-zinc-800/35 to-zinc-900/35",
  },
];

export function TemplatePreviewStrip() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden border-t border-border/60">
      <div className="mx-auto max-w-[1800px] px-4 sm:px-8 lg:px-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 pb-12 border-b border-border/60">
          <div>
            <p className="text-xs font-mono font-bold tracking-widest text-indigo-500 uppercase">
              Curated Blueprint Vault
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Start with a masterpiece. Customize every pixel.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              Don&apos;t start from a blank screen unless you want to. Choose from production-ready starter templates engineered with modern web best practices.
            </p>
          </div>

          <Button asChild variant="outline" className="shrink-0 h-11 px-5 border-border/80">
            <Link href="/project/new/templates">
              <Layers className="mr-2 size-4" />
              View All Templates
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>

        {/* 3-Card Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURED_TEMPLATES.map((tmpl, idx) => (
            <motion.div
              key={tmpl.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="group relative flex flex-col rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs hover:border-foreground/40 hover:shadow-2xl transition-all duration-300"
            >
              {/* Card Window Mockup Header */}
              <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-4 py-2.5">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="size-2.5 rounded-full bg-border" />
                  <span className="size-2.5 rounded-full bg-border" />
                  <span className="size-2.5 rounded-full bg-border" />
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">{tmpl.category}</span>
              </div>

              {/* Card Simulated Preview Canvas */}
              <div className={`relative h-56 w-full bg-gradient-to-br ${tmpl.accent} p-6 flex flex-col justify-between overflow-hidden`}>
                <div className="absolute inset-0 studio-grid-bg opacity-30" />
                
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider bg-background/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-border/60">
                    {tmpl.id}
                  </span>
                  <span className="text-[11px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Live Blueprint
                  </span>
                </div>

                <div className="relative z-10 space-y-2 bg-background/90 p-4 rounded-xl border border-border/70 shadow-sm backdrop-blur-md">
                  <div className="text-sm font-bold text-foreground truncate">{tmpl.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{tmpl.description}</div>
                </div>
              </div>

              {/* Card Content & Details */}
              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground group-hover:text-indigo-500 transition-colors">
                    {tmpl.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {tmpl.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {tmpl.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-mono font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/60">
                  <Button asChild className="w-full h-10 font-medium bg-foreground text-background hover:bg-foreground/90">
                    <Link href="/project/new/templates">
                      Use Template
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
