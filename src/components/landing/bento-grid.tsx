"use client";

import { motion } from "framer-motion";
import {
  Code,
  Compass,
  Download,
  Flame,
  Globe2,
  Laptop,
  Layers,
  Palette,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

export function BentoGrid() {
  return (
    <section className="relative py-20 sm:py-28 lg:py-32 overflow-hidden border-t border-border/60 bg-muted/20">
      <div className="mx-auto max-w-[1800px] px-4 sm:px-8 lg:px-12">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-mono font-bold tracking-widest text-indigo-500 uppercase">
            Architectural Precision
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Everything you need to craft exceptional websites.
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Engineered specifically for creators, design engineers, and students who demand both visual control and pure code freedom.
          </p>
        </div>

        {/* Bento Grid layout */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Dual Engine (Spans 2 cols on lg) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2 group relative overflow-hidden rounded-3xl border border-border/80 bg-card p-8 shadow-xs hover:border-foreground/40 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                <Code className="size-5" />
              </span>
              <div>
                <span className="text-xs font-mono font-bold text-muted-foreground">ENGINE 01</span>
                <h3 className="text-xl font-bold text-foreground">Visual Canvas & Monaco Code In Sync</h3>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground max-w-xl leading-relaxed">
              No abstraction layer. Edit raw HTML and Tailwind styles in our integrated Monaco editor, or tweak layout properties visually. Both engines update in 60 FPS real-time.
            </p>

            {/* Visual Code Mockup */}
            <div className="mt-6 rounded-2xl border border-border/80 bg-zinc-950 p-4 font-mono text-xs text-zinc-300 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-[11px] text-zinc-500">
                <span>components/hero.html</span>
                <span className="text-emerald-400">Live Syncing</span>
              </div>
              <div className="pt-3 space-y-1">
                <span className="text-indigo-400">&lt;section</span> <span className="text-amber-300">class=</span><span className="text-emerald-300">&quot;grid grid-cols-2 gap-8 items-center&quot;</span><span className="text-indigo-400">&gt;</span><br />
                &nbsp;&nbsp;<span className="text-indigo-400">&lt;div</span> <span className="text-amber-300">class=</span><span className="text-emerald-300">&quot;space-y-4&quot;</span><span className="text-indigo-400">&gt;</span><br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400">&lt;h1</span> <span className="text-amber-300">class=</span><span className="text-emerald-300">&quot;text-4xl font-bold&quot;</span><span className="text-indigo-400">&gt;</span>Modern Web Architecture<span className="text-indigo-400">&lt;/h1&gt;</span><br />
                &nbsp;&nbsp;<span className="text-indigo-400">&lt;/div&gt;</span><br />
                <span className="text-indigo-400">&lt;/section&gt;</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Instant Edge Hosting */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="group relative overflow-hidden rounded-3xl border border-border/80 bg-card p-8 shadow-xs hover:border-foreground/40 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Globe2 className="size-5" />
              </span>
              <div>
                <span className="text-xs font-mono font-bold text-muted-foreground">HOSTING 02</span>
                <h3 className="text-xl font-bold text-foreground">One-Click Global Edge</h3>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Publish with a single tap. Your website receives a dedicated live link on our Edge proxy network with zero DNS hassle or deployment pipelines.
            </p>

            <div className="mt-8 rounded-2xl border border-border bg-secondary/60 p-4">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground">Global CDN Edge</span>
                <span className="text-emerald-500 font-semibold">Active · 280 PoPs</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-mono bg-background p-2.5 rounded-xl border border-border">
                <span className="text-muted-foreground">mindspace.dev/p/aurora</span>
                <span className="text-xs font-bold text-foreground">200 OK</span>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Blueprint Library */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="group relative overflow-hidden rounded-3xl border border-border/80 bg-card p-8 shadow-xs hover:border-foreground/40 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500 border border-violet-500/20">
                <Layers className="size-5" />
              </span>
              <div>
                <span className="text-xs font-mono font-bold text-muted-foreground">TEMPLATES 03</span>
                <h3 className="text-xl font-bold text-foreground">Production Blueprints</h3>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Kick off immediately with developer portfolios, event landing pages, SaaS showcases, and multi-page web applications crafted by top design engineers.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="text-xs font-medium bg-muted px-3 py-1 rounded-full border border-border/60">
                Developer Portfolio
              </span>
              <span className="text-xs font-medium bg-muted px-3 py-1 rounded-full border border-border/60">
                Agency Multi-Page
              </span>
              <span className="text-xs font-medium bg-muted px-3 py-1 rounded-full border border-border/60">
                Hackathon Event
              </span>
              <span className="text-xs font-medium bg-muted px-3 py-1 rounded-full border border-border/60">
                Minimal Documentation
              </span>
            </div>
          </motion.div>

          {/* Card 4: Full Portability & ZIP Export (Spans 2 cols on lg) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-2 group relative overflow-hidden rounded-3xl border border-border/80 bg-card p-8 shadow-xs hover:border-foreground/40 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Download className="size-5" />
              </span>
              <div>
                <span className="text-xs font-mono font-bold text-muted-foreground">OWNERSHIP 04</span>
                <h3 className="text-xl font-bold text-foreground">Zero Lock-In · 1-Click ZIP Export</h3>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground max-w-xl leading-relaxed">
              Every website you create is pure standard HTML, CSS, and JavaScript. Download the complete production source bundle anytime with a single click and host anywhere (GitHub Pages, Vercel, Netlify, Cloudflare).
            </p>

            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div className="rounded-2xl border border-border bg-secondary/40 p-4">
                <div className="text-lg font-bold text-foreground">100%</div>
                <div className="text-xs text-muted-foreground mt-0.5">Vanilla Standards</div>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/40 p-4">
                <div className="text-lg font-bold text-foreground">Direct</div>
                <div className="text-xs text-muted-foreground mt-0.5">ZIP Source Bundle</div>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/40 p-4">
                <div className="text-lg font-bold text-foreground">Any</div>
                <div className="text-xs text-muted-foreground mt-0.5">Host & Provider</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
