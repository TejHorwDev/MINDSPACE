"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock,
  Code2,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  Globe2,
  HardDrive,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Presentation as PresentationIcon,
  Search,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type UnifiedItemType = "website" | "document" | "presentation";

export type DashboardUnifiedItem = {
  id: string;
  type: UnifiedItemType;
  name: string;
  createdAt: string;
  updatedAt: string;
  // Website specific
  isPublished?: boolean;
  publicSlug?: string | null;
  templateUsed?: string | null;
  fileCount?: number;
  // Document specific
  wordCount?: number;
  // Presentation specific
  slideCount?: number;
};

// Backwards compatibility alias
export type DashboardProjectItem = {
  id: string;
  name: string;
  isPublished: boolean;
  publicSlug: string | null;
  templateUsed: string | null;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DashboardUserPlan = {
  id: string;
  name: string;
  dailyFreeCreditUSD: number;
  maxProjects: number;
  maxStorageMB: number;
  isDefault: boolean;
};

type DashboardViewProps = {
  userName?: string | null;
  userEmail?: string | null;
  currentPlan: DashboardUserPlan;
  creditBalance: {
    freeCredits: number;
    purchasedCredits: number;
    totalCredits: number;
    isPaidUser: boolean;
    creditsResetAt: string;
  };
  quotas: {
    projects: {
      used: number;
      max: number;
      allowed: boolean;
    };
    storage: {
      usedMB: number;
      maxMB: number;
      allowed: boolean;
    };
  };
  initialProjects?: DashboardProjectItem[];
  initialItems?: DashboardUnifiedItem[];
};

export function formatGreeting(name?: string | null): string {
  const raw = (name || "").trim();
  const lower = raw.toLowerCase();

  // If no display name is set or it looks like a raw system role/username
  if (
    !raw ||
    lower === "admin" ||
    lower === "administrator" ||
    lower === "student" ||
    lower === "moderator" ||
    lower === "user" ||
    lower === "developer" ||
    lower === "root" ||
    lower === "system"
  ) {
    return "Welcome to your Studio";
  }

  // Get the first word
  const firstName = raw.split(/\s+/)[0];
  if (!firstName) return "Welcome to your Studio";

  // Check if first name is all caps (e.g. "TEJ" or "ADMIN")
  if (firstName.length > 1 && firstName === firstName.toUpperCase()) {
    if (firstName.toLowerCase() === "admin") return "Welcome to your Studio";
    return `Welcome back, ${firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()}`;
  }

  return `Welcome back, ${firstName}`;
}

export function DashboardView({
  userName,
  userEmail,
  currentPlan,
  creditBalance,
  quotas,
  initialProjects = [],
  initialItems,
}: DashboardViewProps) {
  const router = useRouter();

  // Unified items state
  const [items, setItems] = useState<DashboardUnifiedItem[]>(() => {
    if (initialItems && initialItems.length > 0) {
      return initialItems;
    }
    return initialProjects.map((p) => ({
      id: p.id,
      type: "website" as const,
      name: p.name,
      isPublished: p.isPublished,
      publicSlug: p.publicSlug,
      templateUsed: p.templateUsed,
      fileCount: p.fileCount,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  });

  // Filter tabs: "all" | "websites" | "documents" | "presentations"
  const [typeFilter, setTypeFilter] = useState<
    "all" | "websites" | "documents" | "presentations"
  >("all");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "type">("recent");

  // Document & Presentation creation loading state
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [isCreatingPresentation, setIsCreatingPresentation] = useState(false);

  // Upgrade Modal State
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  // Rename Dialog State
  const [itemToRename, setItemToRename] = useState<DashboardUnifiedItem | null>(null);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);

  // Delete Dialog State
  const [itemToDelete, setItemToDelete] = useState<DashboardUnifiedItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isPro = currentPlan.name.toLowerCase().includes("pro");

  // Sync initial query params on mount (e.g. ?filter=documents)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("filter");
      if (param === "documents" || param === "document") {
        setTypeFilter("documents");
      } else if (param === "websites" || param === "website" || param === "projects") {
        setTypeFilter("websites");
      }
    }
  }, []);

  // Compute counts for tabs
  const counts = useMemo(() => {
    let websites = 0;
    let documents = 0;
    let presentations = 0;
    for (const it of items) {
      if (it.type === "website") websites++;
      else if (it.type === "document") documents++;
      else if (it.type === "presentation") presentations++;
    }
    return {
      all: items.length,
      websites,
      documents,
      presentations,
    };
  }, [items]);

  // Filter & Sort Items
  const filteredItems = useMemo(() => {
    return items
      .filter((it) => {
        // Type filter
        if (typeFilter === "websites" && it.type !== "website") return false;
        if (typeFilter === "documents" && it.type !== "document") return false;
        if (typeFilter === "presentations" && it.type !== "presentation") return false;

        // Search filter across name and template
        const query = search.toLowerCase().trim();
        if (query) {
          const matchName = it.name.toLowerCase().includes(query);
          const matchTemplate =
            it.type === "website" &&
            Boolean(it.templateUsed && it.templateUsed.toLowerCase().includes(query));
          if (!matchName && !matchTemplate) return false;
        }

        // Website status filter
        if (it.type === "website") {
          if (filterStatus === "published" && !it.isPublished) return false;
          if (filterStatus === "draft" && it.isPublished) return false;
        } else if (filterStatus !== "all" && typeFilter === "all") {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "recent") {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "type") {
          return a.type.localeCompare(b.type);
        }
        return 0;
      });
  }, [items, typeFilter, search, filterStatus, sortBy]);

  // Handle instant upgrade to Pro tier
  const handleUpgradeToPro = async () => {
    setUpgrading(true);
    try {
      const res = await fetch("/api/user/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlanName: "Pro" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Upgraded to Pro Tier!");
        setUpgradeModalOpen(false);
        router.refresh();
      } else {
        toast.error(data.error || "Failed to upgrade plan");
      }
    } catch {
      toast.error("Network error while upgrading");
    } finally {
      setUpgrading(false);
    }
  };

  // Handle document creation
  const handleCreateDocument = async () => {
    if (isCreatingDoc) return;
    setIsCreatingDoc(true);
    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Document" }),
      });
      const data = await res.json();
      if (res.ok && data.document?.id) {
        toast.success("Document created");
        router.push(`/docs/${data.document.id}`);
      } else {
        toast.error(data.error || "Failed to create document");
        setIsCreatingDoc(false);
      }
    } catch (err) {
      console.error("Create document error:", err);
      toast.error("Network error while creating document");
      setIsCreatingDoc(false);
    }
  };

  // Handle presentation creation
  const handleCreatePresentation = async () => {
    if (isCreatingPresentation) return;
    setIsCreatingPresentation(true);
    try {
      const res = await fetch("/api/presentations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Presentation" }),
      });
      const data = await res.json();
      if (res.ok && data.presentation?.id) {
        toast.success("Presentation created");
        router.push(`/presentations/${data.presentation.id}`);
      } else {
        toast.error(data.error || "Failed to create presentation");
        setIsCreatingPresentation(false);
      }
    } catch (err) {
      console.error("Create presentation error:", err);
      toast.error("Network error while creating presentation");
      setIsCreatingPresentation(false);
    }
  };

  // Handle item rename (both website and document)
  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToRename || !newName.trim()) return;
    setRenaming(true);
    try {
      const endpoint =
        itemToRename.type === "website"
          ? `/api/projects/${itemToRename.id}`
          : itemToRename.type === "presentation"
          ? `/api/presentations/${itemToRename.id}`
          : `/api/docs/${itemToRename.id}`;

      const payload =
        itemToRename.type === "website"
          ? { name: newName.trim() }
          : { title: newName.trim() };

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === itemToRename.id
              ? { ...it, name: newName.trim(), updatedAt: new Date().toISOString() }
              : it
          )
        );
        toast.success(
          `${itemToRename.type === "website" ? "Website" : "Document"} renamed successfully`
        );
        setItemToRename(null);
      } else {
        toast.error(`Failed to rename ${itemToRename.type}`);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setRenaming(false);
    }
  };

  // Handle item delete (both website and document)
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      const endpoint =
        itemToDelete.type === "website"
          ? `/api/projects/${itemToDelete.id}`
          : itemToDelete.type === "presentation"
          ? `/api/presentations/${itemToDelete.id}`
          : `/api/docs/${itemToDelete.id}`;

      const res = await fetch(endpoint, {
        method: "DELETE",
      });

      if (res.ok) {
        setItems((prev) => prev.filter((it) => it.id !== itemToDelete.id));
        toast.success(
          `Deleted ${itemToDelete.type === "website" ? "website" : "document"} "${itemToDelete.name}"`
        );
        setItemToDelete(null);
      } else {
        toast.error(`Failed to delete ${itemToDelete.type}`);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  };

  // Quotas calculations
  const projectPct = Math.min(100, Math.round((quotas.projects.used / quotas.projects.max) * 100));
  const storagePct = Math.min(100, Math.round((quotas.storage.usedMB / quotas.storage.maxMB) * 100));

  return (
    <div className="relative w-full space-y-8">
      {/* Ambient Studio Lighting (Sophisticated, Non-Loud) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-[900px] h-[360px] bg-indigo-500/[0.04] blur-[140px] rounded-full -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-40 right-10 w-[500px] h-[300px] bg-violet-500/[0.03] blur-[120px] rounded-full -z-10"
      />

      {/* 1. Header Command Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/70">
        <div>
          {/* Studio Workspace Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/80 border border-border/80 text-xs font-medium text-foreground backdrop-blur-md shadow-2xs mb-2.5">
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              CREATIVE STUDIO WORKSPACE
            </span>
            <span className="text-muted-foreground/40">·</span>
            <button
              type="button"
              onClick={() => setUpgradeModalOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground hover:underline cursor-pointer"
            >
              <Sparkles className="size-3 text-indigo-400" />
              <span className="font-semibold">{currentPlan.name} Tier</span>
              {!isPro && (
                <span className="text-[10px] text-muted-foreground hover:text-foreground font-medium ml-1">
                  Upgrade →
                </span>
              )}
            </button>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            {formatGreeting(userName)}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            A calm space to build your websites and write your documents together.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 px-3.5 rounded-xl border-border/80 text-xs hover:bg-secondary transition-all"
          >
            <Link href="/templates">
              <Layers className="size-3.5 mr-1.5 text-indigo-400" />
              <span>Blueprints</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 px-3.5 rounded-xl border-border/80 text-xs hover:bg-secondary transition-all"
          >
            <Link href="/credits">
              <span className="text-amber-500 font-bold mr-1.5">$</span>
              <span>Credits (${creditBalance.totalCredits.toFixed(2)})</span>
            </Link>
          </Button>

          {/* New Item Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="h-9 px-4 rounded-xl font-semibold text-xs bg-foreground text-background hover:bg-foreground/90 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
              >
                {isCreatingDoc ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                <span>Create New</span>
                <ChevronDown className="size-3 opacity-60 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs p-1.5 rounded-xl">
              <DropdownMenuItem asChild>
                <Link
                  href="/project/new"
                  className="cursor-pointer flex items-center gap-3 px-3 py-2 rounded-lg"
                >
                  <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Code2 className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">New Website</span>
                    <span className="text-[10px] text-muted-foreground">
                      Blank canvas or design blueprint
                    </span>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={handleCreateDocument}
                disabled={isCreatingDoc}
                className="cursor-pointer flex items-center gap-3 px-3 py-2 rounded-lg"
              >
                <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  {isCreatingDoc ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">New Document</span>
                  <span className="text-[10px] text-muted-foreground">
                    Reports, essays, and lab notes
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={handleCreatePresentation}
                disabled={isCreatingPresentation}
                className="cursor-pointer flex items-center gap-3 px-3 py-2 rounded-lg"
              >
                <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                  {isCreatingPresentation ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <PresentationIcon className="size-4" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">New Presentation</span>
                  <span className="text-[10px] text-muted-foreground">
                    Slide decks, pitches, and talks
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 2. Workspace Quotas & Health Status (Unified, Consistent Sizing & Alignment) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Account Tier */}
        <div className="rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md p-5 shadow-2xs ms-lift flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span className="font-mono text-[10px] uppercase tracking-wider">Account Tier</span>
              <div className="size-7 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <Sparkles className="size-3.5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">{currentPlan.name}</span>
              <span className="text-xs text-muted-foreground font-mono">Plan</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground truncate">
              ${currentPlan.dailyFreeCreditUSD.toFixed(2)} daily AI allowance
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              {isPro ? "Unlimited Studio Access" : "Standard Student Tier"}
            </span>
            {!isPro ? (
              <button
                type="button"
                onClick={() => setUpgradeModalOpen(true)}
                className="text-foreground font-semibold hover:underline cursor-pointer"
              >
                Go Pro →
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                <span className="status-dot status-dot-success" />
                Active
              </span>
            )}
          </div>
        </div>

        {/* Card 2: AI Credit Allowance */}
        <div className="rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md p-5 shadow-2xs ms-lift flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span className="font-mono text-[10px] uppercase tracking-wider">AI Credits Remaining</span>
              <div className="size-7 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                <Zap className="size-3.5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight font-mono text-foreground">
                ${creditBalance.freeCredits.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">available</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground truncate">
              {creditBalance.purchasedCredits > 0
                ? `Purchased top-up: $${creditBalance.purchasedCredits.toFixed(2)}`
                : "Daily credits reset at midnight UTC"}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Resets midnight UTC</span>
            <Link href="/credits" className="text-foreground hover:underline font-semibold">
              View Log →
            </Link>
          </div>
        </div>

        {/* Card 3: Project Capacity */}
        <div className="rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md p-5 shadow-2xs ms-lift flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span className="font-mono text-[10px] uppercase tracking-wider">Projects Capacity</span>
              <div className="size-7 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <FolderOpen className="size-3.5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight font-mono text-foreground">
                {quotas.projects.used}
              </span>
              <span className="text-xs text-muted-foreground">/ {quotas.projects.max} allowed</span>
            </div>
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  projectPct > 80 ? "bg-amber-500" : "bg-foreground"
                }`}
                style={{ width: `${projectPct}%` }}
              />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{projectPct}% quota used</span>
            <Link href="/project/new" className="text-foreground hover:underline font-semibold">
              New Website →
            </Link>
          </div>
        </div>

        {/* Card 4: Cloud Storage */}
        <div className="rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md p-5 shadow-2xs ms-lift flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span className="font-mono text-[10px] uppercase tracking-wider">Storage Used</span>
              <div className="size-7 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center">
                <HardDrive className="size-3.5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight font-mono text-foreground">
                {quotas.storage.usedMB.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">MB of {quotas.storage.maxMB} MB</span>
            </div>
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground transition-all"
                style={{ width: `${storagePct}%` }}
              />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{storagePct}% quota used</span>
            <span className="text-muted-foreground font-mono">
              {(quotas.storage.maxMB - quotas.storage.usedMB).toFixed(1)} MB free
            </span>
          </div>
        </div>
      </div>

      {/* 3. Studio Creation Launchpad Cards (Interactive Quick Access) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Launchpad Card 1: Website Studio */}
        <div className="relative rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md p-5 shadow-2xs hover:border-blue-500/40 transition-all ms-lift flex flex-col justify-between group overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Code2 className="size-3" />
                <span>WEBSITE BUILDER</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                Live Sandbox
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                Build a Web Application
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Start from a blank canvas or launch from professional blueprints with full visual canvas & multi-file code editing.
              </p>
            </div>

            {/* Feature Mini-Preview Strip */}
            <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/60 font-mono text-[11px] flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <div className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-red-400/60" />
                  <span className="size-1.5 rounded-full bg-yellow-400/60" />
                  <span className="size-1.5 rounded-full bg-green-400/60" />
                </div>
                <span className="text-foreground/90 font-medium">index.html</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-muted-foreground">style.css</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-muted-foreground">app.js</span>
              </div>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold shrink-0">Ready to Build</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2.5">
            <Button
              asChild
              size="sm"
              className="h-8 px-3 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-2xs"
            >
              <Link href="/project/new">
                <Plus className="size-3.5 mr-1" />
                New Website
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs border-border/80 hover:bg-secondary"
            >
              <Link href="/templates">
                <Layers className="size-3 mr-1 text-muted-foreground" />
                Browse Blueprints
              </Link>
            </Button>
          </div>
        </div>

        {/* Launchpad Card 2: Docs Studio */}
        <div className="relative rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md p-5 shadow-2xs hover:border-emerald-500/40 transition-all ms-lift flex flex-col justify-between group overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <FileText className="size-3" />
                <span>DOCS & PRESENTATION STUDIO</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ProseMirror Engine
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                Draft a Rich Document
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Write structured essays, research reports, and lab notes with headings, tables, blockquotes, and automatic cloud save.
              </p>
            </div>

            {/* Feature Mini-Preview Strip */}
            <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/60 font-mono text-[11px] flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <FileText className="size-3 text-emerald-500 shrink-0" />
                <span className="text-foreground/90 font-medium">Research Paper</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-muted-foreground">Markdown / JSON</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-muted-foreground">Tables</span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">Auto-Cloud Synced</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2.5">
            <Button
              onClick={handleCreateDocument}
              disabled={isCreatingDoc}
              size="sm"
              className="h-8 px-3 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-2xs cursor-pointer"
            >
              {isCreatingDoc ? (
                <Loader2 className="size-3.5 mr-1 animate-spin" />
              ) : (
                <Plus className="size-3.5 mr-1" />
              )}
              New Document
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTypeFilter("documents")}
              className="h-8 px-3 text-xs border-border/80 hover:bg-secondary cursor-pointer"
            >
              <FileText className="size-3 mr-1 text-muted-foreground" />
              Filter Documents ({counts.documents})
            </Button>
          </div>
        </div>
      </div>

      {/* 4. Coherent Control Toolbar (Linear / macOS Precision Row) */}
      <div className="space-y-4">
        <div className="p-1.5 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-2xs">
          {/* Left: Type Filter Tabs */}
          <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-xl border border-border/60 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                typeFilter === "all"
                  ? "bg-background text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("websites")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                typeFilter === "websites"
                  ? "bg-background text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Code2 className="size-3 text-blue-500" />
              <span>Websites ({counts.websites})</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("documents")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                typeFilter === "documents"
                  ? "bg-background text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="size-3 text-emerald-500" />
              <span>Documents ({counts.documents})</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("presentations")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                typeFilter === "presentations"
                  ? "bg-background text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <PresentationIcon className="size-3 text-amber-500" />
              <span>Presentations ({counts.presentations})</span>
            </button>
          </div>

          {/* Right: Search, Filter, Sort, View Toggle */}
          <div className="flex flex-wrap items-center gap-2 md:justify-end flex-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search websites and documents..."
                className="h-8 pl-9 pr-8 text-xs border-border/70 bg-card rounded-xl w-full"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Status Select (Websites only) */}
            {typeFilter !== "documents" && (
              <select
                value={filterStatus}
                onChange={(e: any) => setFilterStatus(e.target.value)}
                className="h-8 rounded-xl border border-border/70 bg-card px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="published">Live Only</option>
                <option value="draft">Drafts Only</option>
              </select>
            )}

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="h-8 rounded-xl border border-border/70 bg-card px-2.5 text-xs text-foreground focus:outline-none cursor-pointer"
            >
              <option value="recent">Recently Updated</option>
              <option value="name">Name (A-Z)</option>
              <option value="type">Type</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-border/70 rounded-xl overflow-hidden bg-card">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 transition-colors cursor-pointer",
                  viewMode === "grid"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Grid cards view"
              >
                <LayoutGrid className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-1.5 transition-colors cursor-pointer",
                  viewMode === "table"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Table rows view"
              >
                <List className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 5. Unified Grid/Table View */}
        {filteredItems.length === 0 ? (
          /* Empty State Matching MINDSPACE's Calm Aesthetic */
          <div className="relative rounded-2xl border border-dashed border-border/80 bg-card/60 p-12 text-center animate-in fade-in-50 duration-200 overflow-hidden">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary/80 text-foreground mb-4 border border-border/60 shadow-2xs">
              {search ? (
                <Search className="size-6 text-muted-foreground" />
              ) : typeFilter === "documents" ? (
                <FileText className="size-6 text-emerald-500" />
              ) : typeFilter === "websites" ? (
                <Code2 className="size-6 text-blue-500" />
              ) : (
                <Sparkles className="size-6 text-foreground" />
              )}
            </div>

            <h3 className="text-base font-bold text-foreground">
              {search
                ? "No matches found"
                : typeFilter === "documents"
                ? "A clean slate for your writing."
                : typeFilter === "websites"
                ? "No websites yet."
                : "A calm space to build what you imagine."}
            </h3>

            <p className="mt-1.5 text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {search
                ? `Nothing matched "${search}". Check your search term or clear the filter.`
                : typeFilter === "documents"
                ? "Draft essays, research notes, and assignments in a focused, distraction-free environment."
                : typeFilter === "websites"
                ? "Start from a blank canvas or explore curated blueprints crafted for student portfolios and web apps."
                : "Nothing created yet. Begin with a responsive website or open a new document to write notes, reports, and assignments."}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {search ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSearch("")}
                  className="h-8 px-4 text-xs border-border/80 cursor-pointer"
                >
                  Clear Search
                </Button>
              ) : typeFilter === "documents" ? (
                <>
                  <Button
                    onClick={handleCreateDocument}
                    disabled={isCreatingDoc}
                    size="sm"
                    className="h-8 px-4 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-xs cursor-pointer"
                  >
                    {isCreatingDoc ? (
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5 mr-1.5" />
                    )}
                    New Document
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTypeFilter("all")}
                    className="h-8 px-4 text-xs border-border/80 hover:bg-secondary cursor-pointer"
                  >
                    View All Items
                  </Button>
                </>
              ) : typeFilter === "websites" ? (
                <>
                  <Button
                    asChild
                    size="sm"
                    className="h-8 px-4 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-xs"
                  >
                    <Link href="/project/new">
                      <Plus className="size-3.5 mr-1.5" />
                      New Website
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 px-4 text-xs border-border/80 hover:bg-secondary"
                  >
                    <Link href="/templates">
                      <Layers className="size-3.5 mr-1.5 text-muted-foreground" />
                      Browse Blueprints
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTypeFilter("all")}
                    className="h-8 px-4 text-xs border-border/80 hover:bg-secondary cursor-pointer"
                  >
                    View All Items
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    asChild
                    size="sm"
                    className="h-8 px-4 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 shadow-xs"
                  >
                    <Link href="/project/new">
                      <Code2 className="size-3.5 mr-1.5 text-blue-400" />
                      New Website
                    </Link>
                  </Button>
                  <Button
                    onClick={handleCreateDocument}
                    disabled={isCreatingDoc}
                    variant="outline"
                    size="sm"
                    className="h-8 px-4 text-xs border-border/80 font-semibold cursor-pointer"
                  >
                    {isCreatingDoc ? (
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <FileText className="size-3.5 mr-1.5 text-emerald-500" />
                    )}
                    New Document
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View Cards - Precision Luxury Card Design */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => {
              const isWebsite = item.type === "website";
              const isPresentation = item.type === "presentation";
              const targetUrl = isWebsite
                ? `/project/${item.id}`
                : isPresentation
                ? `/presentations/${item.id}`
                : `/docs/${item.id}`;

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="group relative rounded-2xl border border-border/80 bg-card/85 hover:border-foreground/30 transition-all shadow-2xs hover:shadow-md ms-lift flex flex-col justify-between overflow-hidden min-h-[220px]"
                >
                  {/* Card Visual Header Bar */}
                  <div className="h-8 px-3.5 bg-secondary/50 border-b border-border/60 flex items-center justify-between">
                    {isWebsite ? (
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-red-400/40 group-hover:bg-red-400/70 transition-colors" />
                        <span className="size-2 rounded-full bg-yellow-400/40 group-hover:bg-yellow-400/70 transition-colors" />
                        <span className="size-2 rounded-full bg-green-400/40 group-hover:bg-green-400/70 transition-colors" />
                      </div>
                    ) : isPresentation ? (
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <PresentationIcon className="size-3" />
                        <span className="text-[10px] font-mono uppercase tracking-wider">Presentation</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-muted-foreground/70">
                        <FileText className="size-3" />
                        <span className="text-[10px] font-mono uppercase tracking-wider">Document</span>
                      </div>
                    )}

                    <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[140px]">
                      {isWebsite
                        ? item.templateUsed || "web app"
                        : isPresentation
                        ? `${item.slideCount ?? 1} ${(item.slideCount === 1) ? "slide" : "slides"}`
                        : `${item.wordCount ?? 0} words`}
                    </span>
                  </div>

                  {/* Card Body: Title, Type Indicator, Actions */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "flex size-9 items-center justify-center rounded-xl border shrink-0",
                              isWebsite
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                : isPresentation
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            )}
                          >
                            {isWebsite ? (
                              <Code2 className="size-4" />
                            ) : isPresentation ? (
                              <PresentationIcon className="size-4" />
                            ) : (
                              <FileText className="size-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={targetUrl}
                              className="font-bold text-sm text-foreground hover:underline truncate block max-w-full"
                              title={item.name}
                            >
                              {item.name}
                            </Link>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {isWebsite
                                ? `${item.fileCount ?? 0} ${item.fileCount === 1 ? "file" : "files"}`
                                : isPresentation
                                ? `${item.slideCount ?? 1} ${item.slideCount === 1 ? "slide" : "slides"}`
                                : `${item.wordCount ?? 0} ${item.wordCount === 1 ? "word" : "words"}`}
                            </span>
                          </div>
                        </div>

                        {/* Card Dropdown Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground shrink-0 rounded-lg cursor-pointer"
                            >
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs">
                            {isWebsite ? (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link href={`/project/${item.id}`} className="cursor-pointer">
                                    <Eye className="size-3.5 mr-2 text-foreground/70" />
                                    Project Overview
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/project/${item.id}/build`} className="cursor-pointer">
                                    <Code2 className="size-3.5 mr-2 text-blue-500" />
                                    Open Code Editor
                                  </Link>
                                </DropdownMenuItem>
                                {item.isPublished && (
                                  <DropdownMenuItem asChild>
                                    <Link
                                      href={`/p/${item.publicSlug || item.id}`}
                                      target="_blank"
                                      className="cursor-pointer text-emerald-600 dark:text-emerald-400"
                                    >
                                      <ExternalLink className="size-3.5 mr-2" />
                                      View Live Site
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setItemToRename(item);
                                    setNewName(item.name);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Pencil className="size-3.5 mr-2" />
                                  Rename Website
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setItemToDelete(item)}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="size-3.5 mr-2" />
                                  Delete Website
                                </DropdownMenuItem>
                              </>
                            ) : isPresentation ? (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link href={`/presentations/${item.id}`} className="cursor-pointer">
                                    <PresentationIcon className="size-3.5 mr-2 text-amber-500" />
                                    Open Slide Editor
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setItemToRename(item);
                                    setNewName(item.name);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Pencil className="size-3.5 mr-2" />
                                  Rename Presentation
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setItemToDelete(item)}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="size-3.5 mr-2" />
                                  Delete Presentation
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link href={`/docs/${item.id}`} className="cursor-pointer">
                                    <FileText className="size-3.5 mr-2 text-emerald-500" />
                                    Open Document
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setItemToRename(item);
                                    setNewName(item.name);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Pencil className="size-3.5 mr-2" />
                                  Rename Document
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setItemToDelete(item)}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="size-3.5 mr-2" />
                                  Delete Document
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Middle Badges */}
                      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                        {isWebsite ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Code2 className="size-2.5" />
                            Website
                          </span>
                        ) : isPresentation ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <PresentationIcon className="size-2.5" />
                            Presentation
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <FileText className="size-2.5" />
                            Document
                          </span>
                        )}

                        {isWebsite ? (
                          <>
                            {item.isPublished ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <span className="status-dot status-dot-success" />
                                Live
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground border border-border/50">
                                <span className="status-dot bg-muted-foreground/40" />
                                Draft
                              </span>
                            )}
                            {item.templateUsed && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-secondary/80 text-muted-foreground border border-border/60">
                                {item.templateUsed}
                              </span>
                            )}
                          </>
                        ) : isPresentation ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-secondary/80 text-muted-foreground border border-border/60">
                            Slide Deck
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-secondary/80 text-muted-foreground border border-border/60">
                            Rich Text
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Row */}
                    <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                        <Clock className="size-2.5 opacity-60" />
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </span>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2.5 font-semibold text-foreground hover:bg-secondary rounded-lg group-hover:text-primary transition-all"
                      >
                        <Link href={targetUrl}>
                          <span>
                            {isWebsite
                              ? "Open Studio"
                              : isPresentation
                              ? "Open Deck"
                              : "Open Editor"}
                          </span>
                          <ArrowUpRight className="size-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table Rows View */
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/80 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-3 pl-4">Item</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status / Format</th>
                  <th className="p-3">Metric</th>
                  <th className="p-3">Updated</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredItems.map((item) => {
                  const isWebsite = item.type === "website";
                  const isPresentation = item.type === "presentation";
                  const targetUrl = isWebsite
                    ? `/project/${item.id}`
                    : isPresentation
                    ? `/presentations/${item.id}`
                    : `/docs/${item.id}`;

                  return (
                    <tr
                      key={`${item.type}-${item.id}`}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "flex size-7 items-center justify-center rounded-lg font-bold text-xs shrink-0 border",
                              isWebsite
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                : isPresentation
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            )}
                          >
                            {isWebsite ? (
                              <Code2 className="size-3.5" />
                            ) : isPresentation ? (
                              <PresentationIcon className="size-3.5" />
                            ) : (
                              <FileText className="size-3.5" />
                            )}
                          </div>
                          <Link
                            href={targetUrl}
                            className="font-semibold text-foreground hover:underline truncate max-w-xs block"
                            title={item.name}
                          >
                            {item.name}
                          </Link>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                            isWebsite
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : isPresentation
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {isWebsite
                            ? "Website"
                            : isPresentation
                            ? "Presentation"
                            : "Document"}
                        </span>
                      </td>
                      <td className="p-3">
                        {isWebsite ? (
                          item.isPublished ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <Globe2 className="size-2.5" />
                              Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                              Draft
                            </span>
                          )
                        ) : isPresentation ? (
                          <span className="text-muted-foreground font-mono text-[11px]">
                            Slide Deck
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-mono text-[11px]">
                            Rich Text
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">
                        {isWebsite
                          ? `${item.fileCount ?? 0} files`
                          : isPresentation
                          ? `${item.slideCount ?? 1} slides`
                          : `${item.wordCount ?? 0} words`}
                      </td>
                      <td className="p-3 text-muted-foreground text-[11px] font-mono">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2.5 font-semibold text-foreground hover:bg-secondary"
                          >
                            <Link href={targetUrl}>
                              <span>
                                {isWebsite
                                  ? "Open Studio"
                                  : isPresentation
                                  ? "Open Deck"
                                  : "Open Editor"}
                              </span>
                            </Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground"
                              >
                                <MoreVertical className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-xs">
                              <DropdownMenuItem asChild>
                                <Link href={targetUrl}>
                                  {isWebsite
                                    ? "Overview"
                                    : isPresentation
                                    ? "Edit Deck"
                                    : "Edit Document"}
                                </Link>
                              </DropdownMenuItem>
                              {isWebsite && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/project/${item.id}/build`}>
                                    Code Editor
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setItemToRename(item);
                                  setNewName(item.name);
                                }}
                              >
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setItemToDelete(item)}
                                className="text-destructive"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Upgrade to Pro Modal */}
      <Dialog open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-foreground" />
              <span>Upgrade to Pro Tier</span>
            </DialogTitle>
            <DialogDescription>
              Expand your development capabilities with increased daily free credits and project limits.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border/80 bg-secondary/40 p-4 space-y-2 text-xs">
            <div className="font-bold text-sm text-foreground">Pro Tier Benefits:</div>
            <ul className="space-y-1.5 text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-foreground shrink-0" />
                <span>
                  <strong className="text-foreground">$50.00 daily AI credits</strong> allowance (vs $20)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-foreground shrink-0" />
                <span>
                  <strong className="text-foreground">50 projects quota</strong> (vs 5 projects)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-foreground shrink-0" />
                <span>
                  <strong className="text-foreground">500 MB cloud storage</strong> (vs 50 MB)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-foreground shrink-0" />
                <span>Priority AI model serving & pair-programming runtime</span>
              </li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUpgradeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpgradeToPro}
              disabled={upgrading || isPro}
              className="bg-foreground text-background hover:bg-foreground/90 font-medium transition-colors cursor-pointer"
            >
              {upgrading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Upgrading...
                </>
              ) : isPro ? (
                "Already on Pro"
              ) : (
                "Confirm Upgrade to Pro"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Rename Dialog (Handles Websites, Documents, Presentations) */}
      <Dialog
        open={Boolean(itemToRename)}
        onOpenChange={(open) => !open && setItemToRename(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleConfirmRename}>
            <DialogHeader>
              <DialogTitle>
                {itemToRename?.type === "website"
                  ? "Rename Website"
                  : itemToRename?.type === "presentation"
                  ? "Rename Presentation"
                  : "Rename Document"}
              </DialogTitle>
              <DialogDescription>
                Choose a new title for this{" "}
                {itemToRename?.type === "website"
                  ? "web application"
                  : itemToRename?.type === "presentation"
                  ? "presentation deck"
                  : "document"}.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={
                  itemToRename?.type === "website"
                    ? "Website title..."
                    : itemToRename?.type === "presentation"
                    ? "Presentation title..."
                    : "Document title..."
                }
                className="text-xs"
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItemToRename(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={renaming || !newName.trim()}
                className="font-semibold cursor-pointer"
              >
                {renaming ? "Saving..." : "Save Name"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 8. Delete Confirmation Dialog (Handles Websites, Documents, Presentations) */}
      <Dialog
        open={Boolean(itemToDelete)}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Delete{" "}
              {itemToDelete?.type === "website"
                ? "Website"
                : itemToDelete?.type === "presentation"
                ? "Presentation"
                : "Document"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong className="text-foreground">{itemToDelete?.name}</strong>?
              {itemToDelete?.type === "website"
                ? " All files and chat sessions will be removed."
                : itemToDelete?.type === "presentation"
                ? " All slides and presentation content will be permanently removed."
                : " All formatted text and content will be permanently removed."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItemToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="font-semibold cursor-pointer"
            >
              {deleting ? "Deleting..." : "Delete Forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
