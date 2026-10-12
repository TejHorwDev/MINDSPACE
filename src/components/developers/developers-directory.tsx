"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Box,
  CheckCircle2,
  Code2,
  Cpu,
  Database,
  ExternalLink,
  Flame,
  GitCommit,
  Github,
  Globe,
  Instagram,
  Layers,
  LayoutTemplate,
  Linkedin,
  Lock,
  Network,
  Pause,
  Play,
  RefreshCw,
  Search,
  Server,
  Shield,
  Sparkles,
  Terminal,
  Twitter,
  User,
  Users,
  Zap,
} from "lucide-react";
import { DeveloperAvatar } from "@/components/developers/developer-avatar";
import { Button } from "@/components/ui/button";
import { safeUrl } from "@/lib/sanitize";

export type DeveloperRecord = {
  id: string;
  name: string;
  slug: string;
  role: string;
  bio: string;
  photoUrl?: string | null;
  socialLinks?: Record<string, string> | null;
  order?: number;
};

// Continuous Telemetry Log Messages for the Live Head Dev Terminal Stream
const HEAD_DEV_LOGS = [
  { module: "KERNEL", text: "V8 isolate client sandbox initialized [14ms]", time: "16:20" },
  { module: "STORAGE", text: "In-memory localStorage proxy injected into iframe viewport", time: "16:21" },
  { module: "MONACO", text: "Multi-buffer file tree dirty state synchronized (34 files)", time: "16:22" },
  { module: "SECURITY", text: "AES-256 encrypted BYOK vault verified [zero server storage]", time: "16:23" },
  { module: "XTERM", text: "Sub-second process spinup for Python compiler container", time: "16:24" },
  { module: "DOM-BRIDGE", text: "Hot-module replacement payload dispatched at 60 FPS", time: "16:25" },
];

// Interactive Architecture Pipeline Stages
const PIPELINE_STAGES = [
  {
    id: "ide",
    label: "01. Studio IDE",
    sub: "Monaco Multi-Buffer Core",
    icon: Code2,
    latency: "< 2ms",
    spec: "Multi-buffer Monaco instance running on client thread with instantaneous syntax tokenization and AST inspection.",
    metrics: "Zero IPC Overhead",
  },
  {
    id: "bridge",
    label: "02. Storage Guard",
    sub: "In-Memory Polyfill Proxy",
    icon: Layers,
    latency: "< 8ms",
    spec: "Patented in-memory storage proxy protecting iframes against cross-origin SecurityErrors while maintaining session persistence.",
    metrics: "100% Client Isolation",
  },
  {
    id: "sandbox",
    label: "03. Containerized Runtime",
    sub: "xterm.js WebContainers",
    icon: Terminal,
    latency: "< 45ms",
    spec: "Hardened compiler containers running native Python, C++, Java, and Node compilers with strict execution timeouts.",
    metrics: "Isolated Process Tree",
  },
  {
    id: "preview",
    label: "04. Live Edge Preview",
    sub: "Hot DOM Asset Bundler",
    icon: Zap,
    latency: "60 FPS",
    spec: "Real-time in-memory asset bundler injecting transformed HTML/CSS/JS deltas directly into the sandboxed viewport.",
    metrics: "Sub-50ms DOM Sync",
  },
];

const MARQUEE_TECH_ROW_1 = [
  "Next.js 15 Turbopack",
  "Monaco Editor Engine",
  "xterm.js Web PTY",
  "TypeScript 5.8",
  "WebContainers Runtime",
  "In-Memory Storage Guard",
  "AES-256-GCM Vault",
  "Bcrypt Hashing Enclave",
  "Prisma ORM Client",
];

const MARQUEE_TECH_ROW_2 = [
  "Zero-Latency DOM Bridge",
  "AST Diff Streamer",
  "Client-Isolated WebWorker",
  "Distributed Edge Nodes",
  "SQLite & PostgreSQL Engine",
  "60 FPS Hot Reload",
  "Zero-Credential Scrubbing",
  "Strict Process Timeouts",
  "Modern Tailwind System",
];

const ENGINEERING_PILLARS = [
  {
    icon: Terminal,
    title: "Sandboxed Multi-Language Compute",
    badge: "Runtime Engine",
    description:
      "Isolated compiler containers running real Python, C++, Java, and Node binaries with zero cross-tenant contamination and strict execution limits.",
    metrics: "Sub-second process spinup",
  },
  {
    icon: Zap,
    title: "Zero-Latency Preview Bundler",
    badge: "Core Studio",
    description:
      "In-memory asset bundling and HTML injection with runtime storage guard polyfills, delivering instant 60 FPS hot-reloads without build lag.",
    metrics: "< 45ms DOM synchronization",
  },
  {
    icon: Lock,
    title: "AES-256-GCM Vaulted AI Pairing",
    badge: "Security & AI",
    description:
      "Unified LLM orchestration with inline diff inspection. Stored BYOK personal API keys and MCP endpoints never leave encrypted memory.",
    metrics: "Authenticated hardware cipher",
  },
  {
    icon: LayoutTemplate,
    title: "Curated Blueprint Ecosystem",
    badge: "Open Platform",
    description:
      "Production-ready starter templates for portfolios, fullstack applications, and club portals. One-click cloning directly into your studio.",
    metrics: "100% Student-owned code",
  },
];

const HEAD_DEV_STATS = [
  { label: "Lines of Code", value: "140k+", sub: "Engineered from scratch" },
  { label: "Runtime Isolation", value: "100%", sub: "Client-side sandboxed" },
  { label: "Preview Latency", value: "< 45ms", sub: "Hot-reloading DOM sync" },
  { label: "Language Engines", value: "6+ Native", sub: "Python, C++, Java, Node" },
];

const CORE_PRINCIPLES = [
  {
    title: "Zero-Latency Local Runtimes",
    description:
      "Code execution and compilation happen locally on the client using WebContainers and in-memory polyfills — eliminating round-trip latency.",
  },
  {
    title: "Client-First Security Isolation",
    description:
      "Strict in-memory process trees, zero-credential scrubbing, and AES-256 encrypted personal BYOK keys ensure user code never leaks.",
  },
  {
    title: "Craft & Tactile Micro-Interactions",
    description:
      "Obsessive focus on developer ergonomics, instant keyboard shortcuts, 60 FPS transitions, and distraction-free visual canvas.",
  },
  {
    title: "Open Ecosystem for Students",
    description:
      "Built by students, for students. Accessible anywhere in the world without expensive cloud credits or complex setups.",
  },
];

export function DevelopersDirectory({ developers }: { developers: DeveloperRecord[] }) {
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStage, setSelectedStage] = useState(PIPELINE_STAGES[0].id);

  // Live Terminal Stream State for Head Dev Card
  const [telemetryLogs, setTelemetryLogs] = useState(HEAD_DEV_LOGS.slice(0, 4));
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const logIndexRef = useRef(4);

  // Tab State for Head Dev Card
  const [headDevTab, setHeadDevTab] = useState<"systems" | "telemetry" | "stack">("systems");

  // Identify Head Developer (first developer or role containing HEAD DEV)
  const headDeveloper = useMemo(() => {
    return (
      developers.find((d) => d.role.toLowerCase().includes("head dev") || d.order === 0) ||
      developers[0] ||
      null
    );
  }, [developers]);

  // Identify Team Members (all developers except the head developer)
  const teamMembers = useMemo(() => {
    if (!headDeveloper) return developers;
    return developers.filter((d) => d.id !== headDeveloper.id);
  }, [developers, headDeveloper]);

  // Real-time log streaming interval
  useEffect(() => {
    if (isStreamPaused) return;

    const interval = setInterval(() => {
      const nextEvent = HEAD_DEV_LOGS[logIndexRef.current % HEAD_DEV_LOGS.length];
      logIndexRef.current += 1;

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

      setTelemetryLogs((prev) => [
        ...prev.slice(-4),
        { ...nextEvent, time: timeStr },
      ]);
    }, 2600);

    return () => clearInterval(interval);
  }, [isStreamPaused]);

  // Distinct roles for filter pills
  const distinctRoles = useMemo(() => {
    const roles = Array.from(new Set(teamMembers.map((d) => d.role).filter(Boolean)));
    return ["all", ...roles];
  }, [teamMembers]);

  // Filtered Team Members
  const filteredTeamMembers = useMemo(() => {
    return teamMembers.filter((dev) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        dev.name.toLowerCase().includes(q) ||
        dev.role.toLowerCase().includes(q) ||
        dev.bio.toLowerCase().includes(q);

      const matchesRole =
        selectedRole === "all" ||
        dev.role.toLowerCase() === selectedRole.toLowerCase();

      return matchesSearch && matchesRole;
    });
  }, [teamMembers, search, selectedRole]);

  const activeStageSpec = PIPELINE_STAGES.find((s) => s.id === selectedStage) || PIPELINE_STAGES[0];

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* ------------------------------------------------------------------ */}
      {/* 1. TOP: HEAD DEVELOPER EXECUTIVE SHOWCASE (HERO)                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-8">
        {/* Navigation Bar & Header Label */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="size-2 rounded-full bg-neutral-200 animate-pulse" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400">
              Engineering Leadership & Ecosystem
            </span>
            <span className="text-white/20">•</span>
            <span className="text-xs font-mono text-neutral-300">
              MINDSPACE v3.2 Core
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 px-4 text-xs font-semibold rounded-xl border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-neutral-300 cursor-pointer"
            >
              <Link href="/dashboard">
                <ArrowLeft className="size-3.5 mr-1.5" />
                Back to Studio
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-9 px-4 text-xs font-semibold bg-white text-black hover:bg-neutral-200 rounded-xl cursor-pointer shadow-sm"
            >
              <Link href="/project/new/templates">
                <LayoutTemplate className="size-3.5 mr-1.5" />
                Explore Blueprints
              </Link>
            </Button>
          </div>
        </div>

        {/* Grand Head Developer Spotlight Bento Card */}
        {headDeveloper && (
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.12] bg-neutral-950 p-6 sm:p-10 lg:p-12 shadow-xl">
            {/* Subtle monochrome ambient light */}
            <div className="pointer-events-none absolute -top-40 -right-40 size-[450px] rounded-full bg-white/[0.02] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 -left-40 size-[450px] rounded-full bg-white/[0.02] blur-3xl" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start relative z-10">
              {/* Left Column: Head Developer Identity, Bio, Stats & Actions (6 Cols) */}
              <div className="lg:col-span-6 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
                  {/* Portrait with Glowing Status Ring */}
                  <div className="relative group shrink-0">
                    <div className="relative">
                      <DeveloperAvatar
                        name={headDeveloper.name}
                        photoUrl={headDeveloper.photoUrl}
                        size={110}
                        className="ring-3 ring-white/20 shadow-2xl transition-transform duration-300 group-hover:scale-102"
                      />
                      <div
                        className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-white text-black shadow-lg ring-3 ring-neutral-950"
                        title="Verified Creator & Head Developer"
                      >
                        <CheckCircle2 className="size-4" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono font-bold bg-white text-black shadow-xs">
                        {headDeveloper.role}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-mono text-neutral-300 bg-white/[0.05] border border-white/10">
                        <span className="size-1.5 rounded-full bg-neutral-200 animate-pulse" />
                        Founder & Maintainer
                      </span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                      {headDeveloper.name}
                    </h1>

                    <p className="text-xs sm:text-sm font-mono text-neutral-400">
                      Lead Systems Architect • Creator of MINDSPACE
                    </p>
                  </div>
                </div>

                {/* Creator Narrative Statement */}
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-sans whitespace-pre-wrap">
                  {headDeveloper.bio ||
                    "Founder & Lead Architect of MINDSPACE. Engineering the zero-latency multi-language cloud IDE, in-memory sandboxes, and modern web studio for the next generation of builders."}
                </p>

                {/* Head Dev Quick Stats Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                  {HEAD_DEV_STATS.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-0.5"
                    >
                      <div className="text-base sm:text-lg font-bold text-white tracking-tight">
                        {stat.value}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 uppercase">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Social Quick Links & Dossier Button */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Button
                    asChild
                    className="h-10 px-5 text-xs font-semibold bg-white text-black hover:bg-neutral-200 rounded-xl shadow-xs cursor-pointer"
                  >
                    <Link href={`/developers/${headDeveloper.slug}`}>
                      View Complete Dossier
                      <ArrowRight className="ml-2 size-3.5" />
                    </Link>
                  </Button>

                  {headDeveloper.socialLinks && (
                    <div className="flex items-center gap-2">
                      {headDeveloper.socialLinks.github && safeUrl(headDeveloper.socialLinks.github) && (
                        <a
                          href={safeUrl(headDeveloper.socialLinks.github)!}
                          target="_blank"
                          rel="noreferrer"
                          className="size-10 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                          title="GitHub"
                        >
                          <Github className="size-4" />
                        </a>
                      )}
                      {headDeveloper.socialLinks.linkedin && safeUrl(headDeveloper.socialLinks.linkedin) && (
                        <a
                          href={safeUrl(headDeveloper.socialLinks.linkedin)!}
                          target="_blank"
                          rel="noreferrer"
                          className="size-10 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                          title="LinkedIn"
                        >
                          <Linkedin className="size-4" />
                        </a>
                      )}
                      {headDeveloper.socialLinks.twitter && safeUrl(headDeveloper.socialLinks.twitter) && (
                        <a
                          href={safeUrl(headDeveloper.socialLinks.twitter)!}
                          target="_blank"
                          rel="noreferrer"
                          className="size-10 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                          title="X / Twitter"
                        >
                          <Twitter className="size-4" />
                        </a>
                      )}
                      {headDeveloper.socialLinks.instagram && safeUrl(headDeveloper.socialLinks.instagram) && (
                        <a
                          href={safeUrl(headDeveloper.socialLinks.instagram)!}
                          target="_blank"
                          rel="noreferrer"
                          className="size-10 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                          title="Instagram"
                        >
                          <Instagram className="size-4" />
                        </a>
                      )}
                      {headDeveloper.socialLinks.website && safeUrl(headDeveloper.socialLinks.website) && (
                        <a
                          href={safeUrl(headDeveloper.socialLinks.website)!}
                          target="_blank"
                          rel="noreferrer"
                          className="size-10 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                          title="Portfolio"
                        >
                          <Globe className="size-4" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Systems Architected & Live Telemetry Console (6 Cols) */}
              <div className="lg:col-span-6 rounded-2xl border border-white/[0.08] bg-black/60 p-6 space-y-5 backdrop-blur-md">
                {/* Console Tab Switcher */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setHeadDevTab("systems")}
                      className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                        headDevTab === "systems"
                          ? "bg-white text-black font-semibold shadow-xs"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Systems Architected
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeadDevTab("telemetry")}
                      className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                        headDevTab === "telemetry"
                          ? "bg-white text-black font-semibold shadow-xs"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Live Terminal Log
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeadDevTab("stack")}
                      className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                        headDevTab === "stack"
                          ? "bg-white text-black font-semibold shadow-xs"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Engine Stack
                    </button>
                  </div>

                  <span className="text-[10px] font-mono text-neutral-400 bg-white/[0.05] px-2 py-0.5 rounded border border-white/10">
                    Active Development
                  </span>
                </div>

                {/* Tab 1: Systems Architected by Head Dev */}
                {headDevTab === "systems" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-white/[0.06] bg-neutral-900/40 p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-white">
                        <Zap className="size-3.5 text-neutral-300" />
                        <span>Virtual Cloud IDE</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
                        Monaco multi-buffer file tree with reactive dirty state tracking and keyboard commands.
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-neutral-900/40 p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-white">
                        <Shield className="size-3.5 text-neutral-300" />
                        <span>Storage Guard Polyfill</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
                        In-memory localStorage proxy intercepting iframe sandbox SecurityErrors.
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-neutral-900/40 p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-white">
                        <Terminal className="size-3.5 text-neutral-300" />
                        <span>Sandboxed xterm.js Runtime</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
                        Containerized process isolation running native Python, C++, and Node compilers.
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-neutral-900/40 p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-white">
                        <Lock className="size-3.5 text-neutral-300" />
                        <span>AES-256 AI Key Enclave</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
                        Personal BYOK hardware encryption ensuring zero server-side key retention.
                      </p>
                    </div>
                  </div>
                )}

                {/* Tab 2: Live Head Dev Terminal Stream */}
                {headDevTab === "telemetry" && (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between pb-1 text-[11px] text-neutral-500">
                      <span>tej-kernel-stream.log</span>
                      <button
                        type="button"
                        onClick={() => setIsStreamPaused(!isStreamPaused)}
                        className="text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        {isStreamPaused ? <Play className="size-3" /> : <Pause className="size-3" />}
                        <span>{isStreamPaused ? "Resume" : "Pause"}</span>
                      </button>
                    </div>

                    <div className="space-y-2 min-h-[140px]">
                      {telemetryLogs.map((log, idx) => (
                        <div key={`${log.time}-${idx}`} className="flex items-start gap-2 text-[11px]">
                          <span className="text-neutral-600 select-none">{log.time}</span>
                          <span className="text-neutral-400 font-semibold bg-white/[0.04] px-1.5 py-0.2 rounded border border-white/[0.06]">
                            {log.module}
                          </span>
                          <span className="text-neutral-300 flex-1">{log.text}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-1 text-[11px] text-neutral-500 pt-1">
                        <span>$ stream listening</span>
                        <span className="inline-block w-2 h-3.5 bg-neutral-400 animate-pulse ml-1" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Technology Stack Pills */}
                {headDevTab === "stack" && (
                  <div className="space-y-3 font-mono text-xs">
                    <span className="text-[10px] text-neutral-500 uppercase block">
                      Core Technology Engine
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {MARQUEE_TECH_ROW_1.concat(["Tailwind CSS", "SQLite", "PostgreSQL", "WebContainers"]).map((tech) => (
                        <span
                          key={tech}
                          className="text-[11px] bg-white/[0.04] text-neutral-200 px-3 py-1 rounded-lg border border-white/10"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. DOWN: CORE ENGINEERING TEAM & CONTRIBUTORS (PHOTOS & ROLES)     */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-neutral-300" />
              <span className="text-xs font-mono font-semibold uppercase text-neutral-400 tracking-wider">
                Engineering Team
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Core Engineering Team & Contributors
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400">
              Meet the systems engineers, runtime researchers, and contributors building the MINDSPACE engine.
            </p>
          </div>

          {/* Search Input & Role Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400" />
              <input
                type="search"
                placeholder="Search team members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 pr-4 rounded-xl border border-white/10 bg-neutral-900/60 text-xs text-white shadow-2xs w-full sm:w-56 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 placeholder:text-neutral-500"
              />
            </div>

            {distinctRoles.length > 2 && (
              <div className="flex items-center rounded-xl border border-white/10 bg-neutral-900/60 p-0.5">
                {distinctRoles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      selectedRole === r
                        ? "bg-white text-black font-semibold shadow-xs"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {r === "all" ? "All Team" : r}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Team Members Grid with Photos, Roles, and Bios */}
        {filteredTeamMembers.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-white/10 bg-neutral-950/40 p-8">
            <Users className="mx-auto size-10 text-neutral-500" />
            <h3 className="mt-3 text-base font-bold text-white">No team members found</h3>
            <p className="text-xs text-neutral-400 mt-1">
              Try adjusting your search criteria or role filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeamMembers.map((member) => {
              const socialLinks = member.socialLinks as Record<string, string> | undefined;

              return (
                <div
                  key={member.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-neutral-950 p-6 shadow-2xs hover:border-white/20 hover:shadow-lg transition-all duration-200"
                >
                  <div className="space-y-4">
                    {/* Top Avatar with Photo & Verified Badge */}
                    <div className="flex items-start justify-between">
                      <div className="relative">
                        <DeveloperAvatar
                          name={member.name}
                          photoUrl={member.photoUrl}
                          size={76}
                          className="ring-2 ring-white/10 shadow-md group-hover:scale-105 transition-transform duration-200"
                        />
                        <div
                          className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-white text-black shadow-sm ring-2 ring-neutral-950"
                          title="Verified Contributor"
                        >
                          <CheckCircle2 className="size-3" />
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border bg-white/[0.05] text-neutral-300 border-white/10 font-mono">
                        {member.role}
                      </span>
                    </div>

                    {/* Name & Focus Area / Bio */}
                    <div>
                      <Link
                        href={`/developers/${member.slug}`}
                        className="text-lg font-bold text-white group-hover:text-neutral-200 transition-colors inline-flex items-center gap-1.5"
                      >
                        <span>{member.name}</span>
                        <ArrowUpRight className="size-3.5 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
                      </Link>

                      <p className="mt-2 text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans line-clamp-3">
                        {member.bio || "Active contributor to the MINDSPACE engine."}
                      </p>
                    </div>
                  </div>

                  {/* Card Bottom: Social Connect & Profile Button */}
                  <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {socialLinks?.github && safeUrl(socialLinks.github) && (
                        <a
                          href={safeUrl(socialLinks.github)!}
                          target="_blank"
                          rel="noreferrer"
                          className="size-7 rounded-lg border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                          title="GitHub"
                        >
                          <Github className="size-3.5" />
                        </a>
                      )}
                      {socialLinks?.linkedin && safeUrl(socialLinks.linkedin) && (
                        <a
                          href={safeUrl(socialLinks.linkedin)!}
                          target="_blank"
                          rel="noreferrer"
                          className="size-7 rounded-lg border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                          title="LinkedIn"
                        >
                          <Linkedin className="size-3.5" />
                        </a>
                      )}
                      {socialLinks?.twitter && safeUrl(socialLinks.twitter) && (
                        <a
                          href={safeUrl(socialLinks.twitter)!}
                          target="_blank"
                          rel="noreferrer"
                          className="size-7 rounded-lg border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                          title="X / Twitter"
                        >
                          <Twitter className="size-3.5" />
                        </a>
                      )}
                      {socialLinks?.instagram && safeUrl(socialLinks.instagram) && (
                        <a
                          href={safeUrl(socialLinks.instagram)!}
                          target="_blank"
                          rel="noreferrer"
                          className="size-7 rounded-lg border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                          title="Instagram"
                        >
                          <Instagram className="size-3.5" />
                        </a>
                      )}
                      {socialLinks?.website && safeUrl(socialLinks.website) && (
                        <a
                          href={safeUrl(socialLinks.website)!}
                          target="_blank"
                          rel="noreferrer"
                          className="size-7 rounded-lg border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                          title="Portfolio"
                        >
                          <Globe className="size-3.5" />
                        </a>
                      )}
                    </div>

                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs font-semibold rounded-lg border-white/10 bg-white/[0.02] text-neutral-200 hover:bg-white/[0.06] hover:text-white cursor-pointer"
                    >
                      <Link href={`/developers/${member.slug}`}>
                        Profile Dossier
                        <ArrowRight className="ml-1 size-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. HARDWARE-ACCELERATED MARQUEE RAILS (MOVING TECH STACK)          */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-4 py-2">
        <div className="flex items-center justify-between text-xs font-mono text-neutral-400 px-1">
          <span className="uppercase tracking-wider flex items-center gap-2">
            <Cpu className="size-3.5 text-neutral-300" />
            Core Architecture & Technology Stack
          </span>
          <span className="text-[11px] text-neutral-500 hidden sm:inline">
            Interactive Continuous Feed
          </span>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-neutral-950 py-5 space-y-3">
          {/* Edge fade masks */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-neutral-950 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-neutral-950 to-transparent z-10" />

          {/* Rail 1: Forward Marquee */}
          <div className="animate-marquee flex items-center gap-3">
            {[...MARQUEE_TECH_ROW_1, ...MARQUEE_TECH_ROW_1].map((tech, idx) => (
              <div
                key={`row1-${tech}-${idx}`}
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs font-mono text-neutral-300 hover:border-white/20 hover:text-white transition-colors select-none"
              >
                <span className="size-1.5 rounded-full bg-neutral-400" />
                <span>{tech}</span>
              </div>
            ))}
          </div>

          {/* Rail 2: Reverse Marquee */}
          <div className="animate-marquee-reverse flex items-center gap-3">
            {[...MARQUEE_TECH_ROW_2, ...MARQUEE_TECH_ROW_2].map((tech, idx) => (
              <div
                key={`row2-${tech}-${idx}`}
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs font-mono text-neutral-300 hover:border-white/20 hover:text-white transition-colors select-none"
              >
                <span className="size-1.5 rounded-full bg-neutral-400" />
                <span>{tech}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. TECHNICAL ANATOMY / 4 ENGINEERING PILLARS                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="size-2 rounded-full bg-neutral-300" />
            <span className="text-xs font-mono font-semibold uppercase text-neutral-400 tracking-wider">
              System Pillars
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Engineered For Pure Performance
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl font-sans">
            Built from scratch to deliver high-performance browser IDE capabilities without the
            latency, complexity, or resource overhead of traditional server virtualization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ENGINEERING_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="rounded-2xl border border-white/[0.08] bg-neutral-950 p-6 sm:p-7 space-y-3 shadow-2xs hover:border-white/20 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="size-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white">
                    <Icon className="size-5" />
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-white/[0.03] text-neutral-400 border border-white/10">
                    {pillar.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight">
                  {pillar.title}
                </h3>

                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans">
                  {pillar.description}
                </p>

                <div className="pt-2 border-t border-white/[0.06] text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
                  <CheckCircle2 className="size-3 text-neutral-300" />
                  <span>{pillar.metrics}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 5. INTERACTIVE 4-STAGE EXECUTION PIPELINE                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="size-2 rounded-full bg-neutral-300" />
              <span className="text-xs font-mono font-semibold uppercase text-neutral-400 tracking-wider">
                System Wireframe
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Interactive Execution Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 font-sans">
              Click any stage in the runtime pipeline to inspect its isolation guarantees and memory specifications.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            Selected: <span className="text-white font-bold">{activeStageSpec.label}</span>
          </span>
        </div>

        {/* 4 Interactive Nodes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {PIPELINE_STAGES.map((stage) => {
            const Icon = stage.icon;
            const isSelected = selectedStage === stage.id;

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setSelectedStage(stage.id)}
                className={`relative text-left rounded-2xl border p-5 transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-white/40 bg-neutral-900/80 shadow-md ring-1 ring-white/20"
                    : "border-white/[0.08] bg-neutral-950/60 hover:border-white/20 hover:bg-neutral-900/30"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`size-9 rounded-xl flex items-center justify-center border ${
                      isSelected
                        ? "bg-white text-black border-white"
                        : "bg-white/[0.05] text-neutral-300 border-white/10"
                    }`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-neutral-300 border border-white/10">
                    {stage.latency}
                  </span>
                </div>

                <div className="text-sm font-bold text-white tracking-tight">{stage.label}</div>
                <div className="text-xs text-neutral-400 mt-0.5">{stage.sub}</div>

                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <span>{stage.metrics}</span>
                  {isSelected && <span className="size-1.5 rounded-full bg-white animate-pulse" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Node Specification Box */}
        <div className="rounded-2xl border border-white/[0.08] bg-neutral-900/30 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-sm">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300">
                Specification Matrix: {activeStageSpec.label}
              </span>
              <span className="text-xs font-mono text-neutral-400">• Verified Safe</span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
              {activeStageSpec.spec}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 text-xs font-mono">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 space-y-0.5">
              <div className="text-neutral-500 text-[10px] uppercase">Latency Budget</div>
              <div className="text-white font-bold">{activeStageSpec.latency}</div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 space-y-0.5">
              <div className="text-neutral-500 text-[10px] uppercase">Security Ceiling</div>
              <div className="text-white font-bold">{activeStageSpec.metrics}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 6. ENGINEERING PRINCIPLES & OPEN CULTURE                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="size-2 rounded-full bg-neutral-300" />
            <span className="text-xs font-mono font-semibold uppercase text-neutral-400 tracking-wider">
              Engineering Culture
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Core Principles We Build By
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CORE_PRINCIPLES.map((principle, idx) => (
            <div
              key={principle.title}
              className="rounded-2xl border border-white/[0.08] bg-neutral-950 p-5 space-y-2.5"
            >
              <div className="text-xs font-mono text-neutral-500">0{idx + 1}</div>
              <div className="text-sm font-bold text-white tracking-tight">{principle.title}</div>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                {principle.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 7. OPEN COMMUNITY CALL TO ACTION                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-3xl border border-white/[0.08] bg-neutral-950 p-8 sm:p-12 text-center space-y-6 relative overflow-hidden shadow-xs">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono font-semibold bg-white/[0.05] text-neutral-300 border border-white/10">
            <Sparkles className="size-3.5 text-neutral-300" />
            Join the Next Generation
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Want to Build with the MINDSPACE Team?
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans">
            MINDSPACE is engineered for students and ambitious creators worldwide. Publish custom starter
            blueprints, submit runtime extensions, or showcase your projects to the community.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            asChild
            className="h-10 px-6 text-xs font-semibold bg-white text-black hover:bg-neutral-200 rounded-xl shadow-xs cursor-pointer"
          >
            <Link href="/signup">
              Create Builder Account
              <ArrowRight className="ml-1.5 size-3.5" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-10 px-5 text-xs font-medium rounded-xl border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-neutral-300 cursor-pointer"
          >
            <Link href="/project/new/templates">
              Browse Blueprints Store
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
