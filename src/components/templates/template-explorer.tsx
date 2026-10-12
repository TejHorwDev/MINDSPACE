"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Code2,
  Eye,
  Filter,
  Flame,
  FolderGit2,
  Grid,
  Layers,
  LayoutTemplate,
  List,
  Menu,
  Palette,
  Plus,
  Rocket,
  Search,
  SlidersHorizontal,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TemplateCard } from "./template-card";
import { TemplateListRow } from "./template-list-row";
import { TemplatePreviewDialog } from "./template-preview-dialog";
import { TemplateCreateDialog } from "./template-create-dialog";
import type { UnifiedTemplate } from "@/lib/templates/service";

const CATEGORY_ITEMS = [
  { id: "all", label: "All Blueprints", icon: LayoutTemplate, color: "text-indigo-400" },
  { id: "portfolio", label: "Portfolios & Bios", icon: User, color: "text-sky-400" },
  { id: "landing", label: "SaaS & Landing", icon: Rocket, color: "text-violet-400" },
  { id: "multi-page", label: "Multi-Page Studios", icon: Layers, color: "text-emerald-400" },
  { id: "club", label: "Clubs & Events", icon: Sparkles, color: "text-amber-400" },
  { id: "creative", label: "Creative & Art", icon: Palette, color: "text-rose-400" },
];

const POPULAR_TAGS = [
  "developer",
  "portfolio",
  "minimal",
  "dark",
  "saas",
  "landing",
  "event",
  "hackathon",
  "multi-page",
  "creator",
];

type SortOption = "popular" | "newest" | "name" | "files";

type TemplateExplorerProps = {
  templates: UnifiedTemplate[];
  authed?: boolean;
};

export function TemplateExplorer({ templates, authed = false }: TemplateExplorerProps) {
  const router = useRouter();

  // Sidebar state (like admin panel)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Dialog state
  const [previewTemplate, setPreviewTemplate] = useState<UnifiedTemplate | null>(null);
  const [createTemplate, setCreateTemplate] = useState<UnifiedTemplate | null>(null);

  // Keyboard shortcut for search (/ or ⌘K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) &&
        document.activeElement?.tagName !== "INPUT"
      ) {
        e.preventDefault();
        const searchInput = document.getElementById("template-search-input");
        searchInput?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: templates.length };
    for (const t of templates) {
      const c = t.category.toLowerCase();
      counts[c] = (counts[c] || 0) + 1;
    }
    return counts;
  }, [templates]);

  // Filter & Sort logic
  const filteredTemplates = useMemo(() => {
    const list = templates.filter((template) => {
      const matchesCategory =
        selectedCategory === "all" ||
        template.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesFeatured = !featuredOnly || Boolean(template.isFeatured);

      const matchesTag =
        !selectedTag ||
        template.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());

      const matchesDifficulty =
        selectedDifficulty === "all" ||
        (selectedDifficulty === "beginner" && template.fileCount <= 2) ||
        (selectedDifficulty === "intermediate" && template.fileCount > 2);

      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        template.name.toLowerCase().includes(q) ||
        template.description.toLowerCase().includes(q) ||
        template.tags.some((t) => t.toLowerCase().includes(q)) ||
        template.category.toLowerCase().includes(q);

      return (
        matchesCategory &&
        matchesFeatured &&
        matchesTag &&
        matchesDifficulty &&
        matchesSearch
      );
    });

    return list.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "files") {
        return a.fileCount - b.fileCount;
      }
      if (sortBy === "newest") {
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      }
      // default: popular (featured first, then name)
      if (a.isFeatured !== b.isFeatured) {
        return a.isFeatured ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [
    templates,
    selectedCategory,
    featuredOnly,
    selectedTag,
    selectedDifficulty,
    search,
    sortBy,
  ]);

  const hasActiveFilters = Boolean(
    selectedTag ||
      search ||
      featuredOnly ||
      selectedCategory !== "all" ||
      selectedDifficulty !== "all"
  );

  const handleResetFilters = () => {
    setSelectedTag(null);
    setSearch("");
    setFeaturedOnly(false);
    setSelectedCategory("all");
    setSelectedDifficulty("all");
    setSortBy("popular");
  };

  const handleOpenCreate = (template: UnifiedTemplate) => {
    if (!authed) {
      router.push(`/login?callbackUrl=/project/new/templates`);
      return;
    }
    setCreateTemplate(template);
  };

  const currentCategoryObj =
    CATEGORY_ITEMS.find((c) => c.id === selectedCategory) || CATEGORY_ITEMS[0];

  return (
    <div className="flex flex-1 w-full relative min-h-[calc(100vh-4rem)] bg-background text-foreground">
      {/* ------------------------------------------------------------------ */}
      {/* 1. PERSISTENT DESKTOP SIDEBAR (Like Admin Panel)                   */}
      {/* ------------------------------------------------------------------ */}
      <aside
        aria-label="Templates Navigation Sidebar"
        className={`hidden md:flex flex-col shrink-0 border-r border-border/80 bg-card/60 backdrop-blur-xl transition-all duration-300 ease-in-out relative z-20 ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Sidebar Header Brand / Title */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border/70 shrink-0">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                <LayoutTemplate className="size-4" />
              </div>
              <div className="truncate">
                <h1 className="text-xs font-bold text-foreground tracking-tight">
                  MINDSPACE
                </h1>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  Blueprints Store
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex size-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <LayoutTemplate className="size-4" />
            </div>
          )}

          {/* Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </button>
        </div>

        {/* Quick Search Shortcut in Sidebar */}
        <div className="p-3 border-b border-border/50 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              id="template-search-input"
              type="search"
              placeholder={sidebarCollapsed ? "..." : "Search blueprints..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`h-9 pl-9 pr-7 text-xs rounded-xl border-border/80 bg-background/80 shadow-2xs ${
                sidebarCollapsed ? "px-0 text-center" : ""
              }`}
            />
            {search && !sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Categories Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {!sidebarCollapsed && (
            <div className="text-[10px] font-mono uppercase font-semibold text-muted-foreground px-2 py-1">
              Categories
            </div>
          )}

          {CATEGORY_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = selectedCategory === item.id;
            const count = categoryCounts[item.id] || 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(item.id);
                  setSelectedTag(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-500/15 text-indigo-400 font-bold border border-indigo-500/20 shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                } ${sidebarCollapsed ? "justify-center px-0 size-10 mx-auto" : ""}`}
                title={sidebarCollapsed ? `${item.label} (${count})` : undefined}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`size-4 shrink-0 ${
                      isActive ? item.color : "opacity-70"
                    }`}
                  />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!sidebarCollapsed && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isActive
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Sidebar Filters (when expanded) */}
          {!sidebarCollapsed && (
            <div className="pt-4 mt-2 border-t border-border/50 space-y-3">
              {/* Difficulty Filter */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono uppercase font-semibold text-muted-foreground px-2">
                  Difficulty
                </div>
                <div className="grid grid-cols-3 gap-1 px-1">
                  {[
                    { id: "all", label: "All" },
                    { id: "beginner", label: "Beg" },
                    { id: "intermediate", label: "Mid" },
                  ].map((diff) => (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => setSelectedDifficulty(diff.id)}
                      className={`text-[10px] font-mono py-1 rounded-md border transition-colors cursor-pointer ${
                        selectedDifficulty === diff.id
                          ? "bg-foreground text-background font-bold border-foreground"
                          : "border-border/60 text-muted-foreground hover:text-foreground bg-muted/40"
                      }`}
                    >
                      {diff.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Featured Only Toggle */}
              <div className="px-1">
                <button
                  type="button"
                  onClick={() => setFeaturedOnly(!featuredOnly)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    featuredOnly
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <Flame className="size-3.5" />
                    Featured Only
                  </span>
                  <span
                    className={`size-2 rounded-full ${
                      featuredOnly ? "bg-amber-500" : "bg-muted"
                    }`}
                  />
                </button>
              </div>

              {/* Popular Tags */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono uppercase font-semibold text-muted-foreground px-2">
                  Filter by Tag
                </div>
                <div className="flex flex-wrap gap-1 px-1">
                  {POPULAR_TAGS.map((tag) => {
                    const active = selectedTag?.toLowerCase() === tag.toLowerCase();
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTag(active ? null : tag)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                          active
                            ? "bg-foreground text-background font-bold"
                            : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/50"
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar Footer Action */}
        <div className="p-3 border-t border-border/60 shrink-0 space-y-2">
          {hasActiveFilters && !sidebarCollapsed && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}

          <Button
            asChild
            size="sm"
            className={`font-semibold text-xs bg-foreground text-background hover:bg-foreground/90 rounded-xl shadow-xs cursor-pointer ${
              sidebarCollapsed ? "size-10 p-0 mx-auto justify-center" : "w-full h-9"
            }`}
          >
            <Link href="/project/new" title="Start blank project">
              <Plus className="size-3.5 shrink-0" />
              {!sidebarCollapsed && <span className="ml-1.5">Start Blank</span>}
            </Link>
          </Button>
        </div>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* 2. MOBILE DRAWER (For Phones / Tablets)                            */}
      {/* ------------------------------------------------------------------ */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-card border-r border-border h-full flex flex-col p-4 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border/70">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="size-5 text-indigo-400" />
                <span className="font-bold text-sm text-foreground">Blueprints Store</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 space-y-1">
              {CATEGORY_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = selectedCategory === item.id;
                const count = categoryCounts[item.id] || 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(item.id);
                      setSelectedTag(null);
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? "bg-indigo-500/15 text-indigo-400 font-bold border border-indigo-500/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`size-4 ${isActive ? item.color : "opacity-70"}`} />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[10px] font-mono bg-muted px-1.5 py-0.2 rounded text-muted-foreground">
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-border/70 space-y-2">
              <Button asChild className="w-full text-xs h-9 font-semibold">
                <Link href="/project/new">
                  <Plus className="size-3.5 mr-1.5" />
                  Start Blank Project
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. MAIN WORKSPACE CONTENT CONTAINER (Stretched full width)         */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Sticky Header Bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 border-b border-border/80 bg-background/80 backdrop-blur-xl">
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden flex size-9 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer"
              title="Open category menu"
            >
              <Menu className="size-4" />
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Templates</span>
              <span className="text-muted-foreground/60">/</span>
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <currentCategoryObj.icon
                  className={`size-3.5 ${currentCategoryObj.color}`}
                />
                <span>{currentCategoryObj.label}</span>
              </span>
            </div>
          </div>

          {/* Right: Quick Controls (Count, Sort, View Toggle) */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
              {filteredTemplates.length} {filteredTemplates.length === 1 ? "Blueprint" : "Blueprints"}
            </span>

            {/* Sort Switcher */}
            <div className="flex items-center rounded-xl border border-border/70 bg-card px-2.5 py-1 text-xs">
              <span className="text-muted-foreground text-[11px] mr-1.5 hidden md:inline">
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-foreground text-xs font-medium outline-none cursor-pointer"
              >
                <option value="popular">Popular</option>
                <option value="newest">Newest</option>
                <option value="name">Alphabetical</option>
                <option value="files">Fewest Files</option>
              </select>
            </div>

            {/* View Mode Toggle: Dense Grid vs List */}
            <div className="flex items-center rounded-xl border border-border/70 bg-card p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-secondary text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Dense Grid View"
              >
                <Grid className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "list"
                    ? "bg-secondary text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Compact Table / List View"
              >
                <List className="size-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Full-Width Workspace Gallery */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full overflow-y-auto">
          {filteredTemplates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 p-16 text-center my-6">
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground mb-3 border border-border/60">
                <Search className="size-5 text-muted-foreground" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                No blueprints match your filter criteria
              </h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                We couldn't find any templates matching your search or filters.
                Try choosing another category or reset filters.
              </p>
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="mt-5 text-xs h-9 rounded-xl cursor-pointer"
              >
                Clear all filters
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            /* STRETCHED DENSE MARKETPLACE GRID: 3-5 columns across available space */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.slug}
                  template={template}
                  onPreview={(t) => setPreviewTemplate(t)}
                  onSelect={(t) => handleOpenCreate(t)}
                />
              ))}
            </div>
          ) : (
            /* COMPACT TABLE / LIST VIEW */
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
              {filteredTemplates.map((template) => (
                <TemplateListRow
                  key={template.slug}
                  template={template}
                  onPreview={(t) => setPreviewTemplate(t)}
                  onSelect={(t) => handleOpenCreate(t)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* 4. INTERACTIVE LIVE SIMULATOR & CODE INSPECTOR DIALOG */}
      <TemplatePreviewDialog
        template={previewTemplate}
        open={Boolean(previewTemplate)}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
        onSelect={(t) => handleOpenCreate(t)}
      />

      {/* 5. ONE-CLICK PROJECT CREATION DIALOG */}
      <TemplateCreateDialog
        template={createTemplate}
        open={Boolean(createTemplate)}
        onOpenChange={(open) => !open && setCreateTemplate(null)}
        authed={authed}
      />
    </div>
  );
}
