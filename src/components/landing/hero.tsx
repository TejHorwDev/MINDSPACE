"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Code2,
  Eye,
  Layers,
  Monitor,
  Smartphone,
  Tablet,
  Sparkles,
  Zap,
  Globe,
  Sliders,
  CheckCircle2,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type StudioTab = "canvas" | "code" | "preview";
type DeviceMode = "desktop" | "tablet" | "mobile";

export function Hero({ authed }: { authed?: boolean }) {
  const [activeTab, setActiveTab] = useState<StudioTab>("canvas");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [accentColor, setAccentColor] = useState<string>("indigo");

  return (
    <section className="relative overflow-hidden pt-12 pb-24 sm:pt-16 sm:pb-32 lg:pt-20 lg:pb-36">
      {/* Background ambient lighting — sophisticated, no neon */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden"
      >
        <div className="absolute top-1/4 h-[500px] w-[900px] max-w-full rounded-full bg-indigo-500/[0.06] blur-[140px] dark:bg-indigo-500/[0.12]" />
        <div className="absolute top-1/3 h-[420px] w-[700px] max-w-full rounded-full bg-violet-500/[0.04] blur-[120px] dark:bg-violet-500/[0.08]" />
        <div className="absolute inset-0 studio-dots-bg opacity-40 dark:opacity-20" />
      </div>

      <div className="mx-auto max-w-[1800px] px-4 sm:px-8 lg:px-12">
        {/* Top Header & Value Proposition */}
        <div className="mx-auto max-w-4xl text-center">
          {/* Subtle status badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-secondary/80 px-4 py-1.5 text-xs font-medium text-foreground backdrop-blur-md shadow-2xs"
          >
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">MINDSPACE Studio Engine</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">Visual Canvas & Code In One</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl"
          >
            Code, run & ship projects{" "}
            <span className="bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              in any language.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed"
          >
            From Python, C++, Java, and Node to full web applications. MINDSPACE provides
            students and developers with a high-performance code editor, sandboxed execution engine,
            and AI pair-programming with zero configuration.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5"
          >
            {authed ? (
              <Button
                asChild
                size="lg"
                className="h-12 px-7 text-sm font-semibold shadow-md bg-foreground text-background hover:bg-foreground/90 transition-all hover:scale-[1.02]"
              >
                <Link href="/dashboard">
                  Open Workspace
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                size="lg"
                className="h-12 px-7 text-sm font-semibold shadow-md bg-foreground text-background hover:bg-foreground/90 transition-all hover:scale-[1.02]"
              >
                <Link href="/signup">
                  Start Building Free
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            )}

            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-6 text-sm font-medium border-border/80 bg-card/60 backdrop-blur-md hover:bg-accent transition-all"
            >
              <Link href="/project/new/templates">
                <Layers className="mr-2 size-4 text-muted-foreground" />
                Explore Blueprints
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* THE 3D WEB BUILDER STUDIO CANVAS (Interactive Centerpiece)    */}
        {/* -------------------------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto mt-14 sm:mt-18 w-full max-w-[1600px]"
        >
          {/* Subtle outer ambient glow */}
          <div className="pointer-events-none absolute -inset-1 rounded-[28px] sm:rounded-[36px] bg-gradient-to-b from-foreground/5 via-transparent to-transparent blur-xl" />

          {/* Studio Frame Window */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-[28px] border border-border/80 bg-card/95 shadow-[0_20px_70px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
            {/* Studio Window Header / Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/40 px-4 py-3 sm:px-6">
              {/* Window Controls & Title */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="size-3 rounded-full bg-red-500/80" />
                  <span className="size-3 rounded-full bg-amber-500/80" />
                  <span className="size-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="hidden sm:flex items-center gap-2 pl-2 text-xs font-mono text-muted-foreground border-l border-border/60">
                  <span className="font-semibold text-foreground">studio.mindspace.dev</span>
                  <span>/</span>
                  <span>project_aurora</span>
                </div>
              </div>

              {/* Center Mode Switcher Tabs */}
              <div className="flex items-center rounded-lg border border-border/70 bg-background/80 p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("canvas")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                    activeTab === "canvas"
                      ? "bg-foreground text-background shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Eye className="size-3.5" />
                  Visual Canvas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("code")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                    activeTab === "code"
                      ? "bg-foreground text-background shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Code2 className="size-3.5" />
                  Code Engine
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                    activeTab === "preview"
                      ? "bg-foreground text-background shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Globe className="size-3.5" />
                  Edge Preview
                </button>
              </div>

              {/* Right Viewport Switcher & Actions */}
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center rounded-lg border border-border/60 bg-background/60 p-0.5">
                  <button
                    type="button"
                    onClick={() => setDeviceMode("desktop")}
                    className={`p-1.5 rounded transition-colors ${
                      deviceMode === "desktop"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Desktop view"
                  >
                    <Monitor className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceMode("tablet")}
                    className={`p-1.5 rounded transition-colors ${
                      deviceMode === "tablet"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Tablet view"
                  >
                    <Tablet className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceMode("mobile")}
                    className={`p-1.5 rounded transition-colors ${
                      deviceMode === "mobile"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Mobile view"
                  >
                    <Smartphone className="size-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <Zap className="size-3" />
                  <span>Edge 35ms</span>
                </div>
              </div>
            </div>

            {/* Studio Workspace Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px]">
              {/* Left Column: Layer Hierarchy & Components (3 cols) */}
              <div className="hidden lg:flex lg:col-span-3 flex-col border-r border-border/70 bg-card/60 p-4">
                <div className="flex items-center justify-between pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span>Layers & Hierarchy</span>
                  <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">6 Nodes</span>
                </div>

                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center gap-2 rounded-lg bg-accent/80 px-2.5 py-2 font-medium text-foreground border border-border/60">
                    <Layers className="size-3.5 text-indigo-500" />
                    <span>Page: index.html</span>
                  </div>

                  <div className="ml-3 pl-2 border-l border-border/60 flex flex-col gap-1 mt-1">
                    <div className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-indigo-500" />
                        <span>Hero Container</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">flex</span>
                    </div>

                    <div className="flex items-center justify-between rounded-md bg-secondary px-2.5 py-1.5 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-3 text-amber-500" />
                        <span>3D Canvas Mesh</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-500 font-semibold">Active</span>
                    </div>

                    <div className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-muted-foreground" />
                        <span>Typography Stack</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">h1</span>
                    </div>

                    <div className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-muted-foreground" />
                        <span>CTA Button Group</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">btn</span>
                    </div>

                    <div className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-muted-foreground" />
                        <span>Interactive Bento Grid</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">grid</span>
                    </div>
                  </div>
                </div>

                {/* Quick Tokens */}
                <div className="mt-auto pt-4 border-t border-border/60">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Design Palette
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAccentColor("indigo")}
                      className={`size-6 rounded-full bg-indigo-600 transition-transform ${
                        accentColor === "indigo" ? "ring-2 ring-foreground scale-110" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setAccentColor("violet")}
                      className={`size-6 rounded-full bg-violet-600 transition-transform ${
                        accentColor === "violet" ? "ring-2 ring-foreground scale-110" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setAccentColor("slate")}
                      className={`size-6 rounded-full bg-slate-700 transition-transform ${
                        accentColor === "slate" ? "ring-2 ring-foreground scale-110" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setAccentColor("amber")}
                      className={`size-6 rounded-full bg-amber-600 transition-transform ${
                        accentColor === "amber" ? "ring-2 ring-foreground scale-110" : ""
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Center Column: Interactive Canvas Stage (6 cols or full width) */}
              <div className="col-span-1 lg:col-span-6 flex flex-col items-center justify-center p-4 sm:p-8 studio-grid-bg relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {activeTab === "canvas" && (
                    <motion.div
                      key="canvas"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.3 }}
                      className={`w-full transition-all duration-300 ${
                        deviceMode === "mobile"
                          ? "max-w-[340px]"
                          : deviceMode === "tablet"
                          ? "max-w-[540px]"
                          : "max-w-full"
                      }`}
                    >
                      {/* Realistic Rendered Website Mockup Card */}
                      <div className="relative rounded-2xl border border-border/80 bg-background/95 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
                        {/* Interactive floating badges */}
                        <div className="flex items-center justify-between pb-6 border-b border-border/60">
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-indigo-500 animate-ping" />
                            <span className="text-xs font-mono font-bold tracking-wider uppercase text-foreground">
                              PORTFOLIO // 2026
                            </span>
                          </div>
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                            Draft Mode
                          </span>
                        </div>

                        {/* Interactive Hero Preview Inside Canvas */}
                        <div className="mt-8 space-y-4 text-center">
                          <div className="inline-block rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-foreground">
                            Creative Developer & Design Engineer
                          </div>
                          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                            Crafting high-fidelity web experiences.
                          </h2>
                          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                            Specialized in 3D physics, real-time shaders, and reactive UI architecture.
                          </p>

                          {/* Interactive 3-card mini showcase */}
                          <div className="grid grid-cols-2 gap-3 pt-4 text-left">
                            <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-2xs hover:border-foreground/40 transition-colors">
                              <span className="text-[10px] font-mono text-muted-foreground uppercase">Project 01</span>
                              <div className="text-xs font-bold text-foreground mt-0.5">Nebula Engine</div>
                              <span className="text-[11px] text-muted-foreground">WebGL Shaders</span>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-2xs hover:border-foreground/40 transition-colors">
                              <span className="text-[10px] font-mono text-muted-foreground uppercase">Project 02</span>
                              <div className="text-xs font-bold text-foreground mt-0.5">Quantum UI</div>
                              <span className="text-[11px] text-muted-foreground">Design System</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "code" && (
                    <motion.div
                      key="code"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.3 }}
                      className="w-full font-mono text-xs"
                    >
                      <div className="rounded-2xl border border-border/80 bg-zinc-950 p-5 text-zinc-100 shadow-xl overflow-x-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-[11px] text-zinc-400">
                          <div className="flex items-center gap-2">
                            <Terminal className="size-3.5 text-emerald-400" />
                            <span>index.html</span>
                          </div>
                          <span>UTF-8 · Tailwind CSS v4</span>
                        </div>
                        <pre className="pt-4 leading-relaxed text-zinc-300">
                          <code>{`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Aurora Portfolio</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body class="bg-black text-white antialiased">
    <main class="min-h-screen flex items-center justify-center p-8">
      <section class="max-w-xl text-center space-y-6">
        <h1 class="text-5xl font-extrabold tracking-tight">
          Crafting high-fidelity web experiences.
        </h1>
        <p class="text-zinc-400">
          Compiled with zero config. Ready for Edge deploy.
        </p>
      </section>
    </main>
  </body>
</html>`}</code>
                        </pre>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "preview" && (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.3 }}
                      className="w-full text-center"
                    >
                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-8 shadow-xl">
                        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 mb-4">
                          <CheckCircle2 className="size-7" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">
                          Live on Edge Network
                        </h3>
                        <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                          Deployed instantly across 280+ global Edge PoPs with automatic SSL, caching, and Brotli compression.
                        </p>
                        <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-card border border-border px-4 py-2 font-mono text-xs text-foreground shadow-2xs">
                          <span className="text-emerald-500">https://</span>
                          <span>mindspace.dev/p/aurora-showcase</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right Column: Properties & Inspector (3 cols) */}
              <div className="hidden lg:flex lg:col-span-3 flex-col border-l border-border/70 bg-card/60 p-4">
                <div className="flex items-center justify-between pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="size-3.5 text-foreground" />
                    <span>Property Inspector</span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">CSS</span>
                </div>

                <div className="space-y-4 pt-2 text-xs">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">Layout Type</label>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      <div className="rounded-md border border-border bg-secondary py-1 text-center font-medium text-foreground">
                        Flexbox
                      </div>
                      <div className="rounded-md border border-border/50 py-1 text-center text-muted-foreground">
                        Grid
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                      <span>Border Radius</span>
                      <span className="font-mono">1.25rem</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-3/4 rounded-full bg-foreground" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                      <span>Backdrop Blur</span>
                      <span className="font-mono">24px</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-4/5 rounded-full bg-indigo-500" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                      <span>3D Depth Elevation</span>
                      <span className="font-mono">Z-Index 40</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-2/3 rounded-full bg-violet-500" />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/60">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Live Compilation
                    </span>
                    <div className="mt-2 space-y-1.5 font-mono text-[11px] text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Bundle size</span>
                        <span className="text-foreground font-semibold">14.2 KB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Build time</span>
                        <span className="text-emerald-500 font-semibold">32 ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status</span>
                        <span className="text-emerald-500 font-semibold">Hot Reloading</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* -------------------------------------------------------------- */}
        {/* PLATFORM ARCHITECTURE PILLARS                                  */}
        {/* -------------------------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mt-16 max-w-5xl grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          <div className="rounded-2xl border border-border/70 bg-card/60 p-5 text-center shadow-2xs backdrop-blur-sm">
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              Zero Setup
            </div>
            <div className="mt-1 text-xs text-muted-foreground font-medium">
              Ready in browser
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/60 p-5 text-center shadow-2xs backdrop-blur-sm">
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              Live Sync
            </div>
            <div className="mt-1 text-xs text-muted-foreground font-medium">
              Dual-engine canvas
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/60 p-5 text-center shadow-2xs backdrop-blur-sm">
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              HTML & CSS
            </div>
            <div className="mt-1 text-xs text-muted-foreground font-medium">
              Open web standards
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/60 p-5 text-center shadow-2xs backdrop-blur-sm">
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              1-Click Export
            </div>
            <div className="mt-1 text-xs text-muted-foreground font-medium">
              Clean ZIP bundle
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
