"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Code2,
  Coins,
  Cpu,
  Database,
  Flag,
  FolderGit2,
  Globe,
  Layers,
  LayoutDashboard,
  Menu,
  Search,
  Server,
  Shield,
  ShoppingCart,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminCommandPalette } from "@/components/admin/admin-command-palette";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

function SectionFallback() {
  return (
    <div className="space-y-4 p-6 animate-pulse">
      <Skeleton className="h-8 w-48 rounded-lg" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

// Code-split admin sections on-demand to isolate heavy libraries (e.g. Recharts in Overview)
const OverviewSection = dynamic(
  () => import("@/components/admin/sections/overview-section").then((m) => m.OverviewSection),
  { loading: () => <SectionFallback /> }
);
const PurchaseRequestsSection = dynamic(
  () => import("@/components/admin/sections/purchase-requests-section").then((m) => m.PurchaseRequestsSection),
  { loading: () => <SectionFallback /> }
);
const UsersSection = dynamic(
  () => import("@/components/admin/sections/users-section").then((m) => m.UsersSection),
  { loading: () => <SectionFallback /> }
);
const ProjectsSection = dynamic(
  () => import("@/components/admin/sections/projects-section").then((m) => m.ProjectsSection),
  { loading: () => <SectionFallback /> }
);
const AccountPlansSection = dynamic(
  () => import("@/components/admin/sections/account-plans-section").then((m) => m.AccountPlansSection),
  { loading: () => <SectionFallback /> }
);
const CreditsConsolidatedSection = dynamic(
  () => import("@/components/admin/sections/credits-consolidated-section").then((m) => m.CreditsConsolidatedSection),
  { loading: () => <SectionFallback /> }
);
const BackupsSection = dynamic(
  () => import("@/components/admin/sections/backups-section").then((m) => m.BackupsSection),
  { loading: () => <SectionFallback /> }
);
const AdminTeamSection = dynamic(
  () => import("@/components/admin/sections/admin-team-section").then((m) => m.AdminTeamSection),
  { loading: () => <SectionFallback /> }
);
const ActivityLogSection = dynamic(
  () => import("@/components/admin/sections/activity-log-section").then((m) => m.ActivityLogSection),
  { loading: () => <SectionFallback /> }
);
const AdminReportsSection = dynamic(
  () => import("@/components/admin/admin-reports-section").then((m) => m.AdminReportsSection),
  { loading: () => <SectionFallback /> }
);
const AdminProvidersSection = dynamic(
  () => import("@/components/admin/admin-providers-section").then((m) => m.AdminProvidersSection),
  { loading: () => <SectionFallback /> }
);
const DevelopersTable = dynamic(
  () => import("@/components/admin/developers-table").then((m) => m.DevelopersTable),
  { loading: () => <SectionFallback /> }
);
const AdminTemplatesSection = dynamic(
  () => import("@/components/admin/admin-templates-section").then((m) => m.AdminTemplatesSection),
  { loading: () => <SectionFallback /> }
);
const AdminMcpSection = dynamic(
  () => import("@/components/admin/admin-mcp-section").then((m) => m.AdminMcpSection),
  { loading: () => <SectionFallback /> }
);
const AdminErrorsSection = dynamic(
  () => import("@/components/admin/admin-errors-section").then((m) => m.AdminErrorsSection),
  { loading: () => <SectionFallback /> }
);
const AdminSearchProvidersSection = dynamic(
  () =>
    import("@/components/admin/admin-search-providers-section").then(
      (m) => m.AdminSearchProvidersSection
    ),
  { loading: () => <SectionFallback /> }
);
import type { AdminAiProvider } from "@/components/admin/admin-providers-section";
import type { AdminSearchProvider } from "@/components/admin/admin-search-providers-section";

import type { UnifiedTemplate } from "@/lib/templates/service";
import type { AdminContactChannel } from "@/components/admin/admin-channels-section";
import type { AdminCreditPlan } from "@/components/admin/admin-credits-section";

type AdminDashboardViewProps = {
  currentUserId: string;
  adminName?: string | null;
  adminEmail?: string | null;
  userRole?: string;
  users: Array<{ id: string; name: string | null; email: string; role: string; createdAt: string; projectCount: number }>;
  projects: Array<{ id: string; name: string; ownerName: string; ownerEmail: string; createdAt: string }>;
  templates: UnifiedTemplate[];
  developerCount: number;
  channels: AdminContactChannel[];
  plans: AdminCreditPlan[];
  providers: AdminAiProvider[];
  searchProviders: AdminSearchProvider[];
};

export function AdminDashboardView({
  currentUserId,
  adminName,
  adminEmail,
  userRole = "admin",
  users,
  projects,
  templates,
  developerCount,
  channels,
  plans,
  providers,
  searchProviders,
}: AdminDashboardViewProps) {
  const isModerator = userRole === "moderator";

  // Sidebar navigation state
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Command palette state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, color: "text-indigo-400" },
    { id: "purchase-requests", label: "Purchase Requests", icon: ShoppingCart, color: "text-amber-400", adminOnly: true },
    { id: "users", label: "Users", icon: Users, color: "text-sky-400" },
    { id: "projects", label: "Projects", icon: FolderGit2, color: "text-emerald-400" },
    { id: "account-plans", label: "Account Plans", icon: Sparkles, color: "text-foreground", adminOnly: true },
    { id: "providers", label: "AI Providers", icon: Cpu, color: "text-amber-400", adminOnly: true },
    { id: "search-providers", label: "Search Providers", icon: Globe, color: "text-indigo-400", adminOnly: true },
    { id: "credits", label: "Credits", icon: Coins, color: "text-amber-500" },
    { id: "developers", label: "Developers", icon: Code2, color: "text-cyan-400" },
    { id: "reports", label: "Reports", icon: Flag, color: "text-rose-400" },
    { id: "backups", label: "Backups", icon: Database, color: "text-blue-400", adminOnly: true },
    { id: "team", label: "Admin Team", icon: Shield, color: "text-emerald-500", adminOnly: true },
    { id: "activity-log", label: "Activity Log", icon: Activity, color: "text-violet-400" },
    { id: "templates", label: "Templates", icon: Layers, color: "text-foreground" },
    { id: "system", label: "Diagnostics & MCP", icon: Server, color: "text-gray-400", adminOnly: true },
  ];

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || !isModerator);
  const currentSection = navItems.find((n) => n.id === activeTab) || navItems[0];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-indigo-500/20">
      {/* Command Palette */}
      <AdminCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onSelectSection={(sec) => setActiveTab(sec)}
        userRole={userRole}
        users={users}
        projects={projects}
      />

      {/* Main Admin Container */}
      <div className="flex flex-1 w-full relative">
        {/* -------------------------------------------------------- */}
        {/* 1. PERSISTENT DESKTOP SIDEBAR                             */}
        {/* -------------------------------------------------------- */}
        <aside
          aria-label="Admin Navigation Sidebar"
          className={`hidden md:flex flex-col shrink-0 border-r border-border/80 bg-card/60 backdrop-blur-xl transition-all duration-300 ease-in-out relative z-20 ${
            sidebarCollapsed ? "w-20" : "w-64"
          }`}
        >
          {/* Sidebar Header Brand / Title */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-border/70">
            {!sidebarCollapsed ? (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                  <Shield className="size-4" />
                </div>
                <div className="truncate">
                  <h1 className="text-xs font-bold text-foreground tracking-tight">MINDSPACE ADMIN</h1>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">
                    {userRole} console
                  </span>
                </div>
              </div>
            ) : (
              <div className="mx-auto flex size-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Shield className="size-4" />
              </div>
            )}

            {/* Collapse / Expand Toggle */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse to icon-only"}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
            </button>
          </div>

          {/* Quick Search Shortcut Button */}
          <div className="p-3 border-b border-border/50">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className={`flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-all shadow-2xs cursor-pointer ${
                sidebarCollapsed ? "size-10 justify-center mx-auto" : "w-full px-3 py-2 text-xs"
              }`}
              title="Search or jump to... (⌘K)"
            >
              <Search className="size-3.5 shrink-0" />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left truncate text-xs">Quick search...</span>
                  <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[9px] font-medium text-muted-foreground">
                    ⌘K
                  </kbd>
                </>
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 rounded-xl transition-all cursor-pointer ${
                    sidebarCollapsed ? "size-11 justify-center mx-auto" : "px-3 py-2.5 text-xs"
                  } ${
                    isActive
                      ? "bg-indigo-500/15 text-indigo-400 font-semibold shadow-2xs border border-indigo-500/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={`size-4 shrink-0 ${isActive ? item.color : "opacity-70"}`} />
                  {!sidebarCollapsed && (
                    <span className="truncate flex-1 text-left font-medium">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-border/70 space-y-2">
            <Link
              href="/dashboard"
              className={`flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted transition-all ${
                sidebarCollapsed ? "size-10 justify-center mx-auto" : "px-3 py-2 text-xs"
              }`}
              title="Exit Admin to Student Dashboard"
            >
              <ArrowLeft className="size-3.5 shrink-0" />
              {!sidebarCollapsed && <span className="font-medium truncate">Exit to Dashboard</span>}
            </Link>
          </div>
        </aside>

        {/* -------------------------------------------------------- */}
        {/* 2. MOBILE DRAWER (HAMBURGER SLIDING OVERLAY)              */}
        {/* -------------------------------------------------------- */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Sliding Drawer */}
            <div className="relative w-72 max-w-[80vw] bg-card border-r border-border h-full flex flex-col p-4 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-border/70">
                <div className="flex items-center gap-2">
                  <Shield className="size-5 text-indigo-400" />
                  <span className="font-bold text-sm text-foreground">Admin Console</span>
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
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? "bg-indigo-500/15 text-indigo-400 font-bold border border-indigo-500/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      <Icon className={`size-4 shrink-0 ${isActive ? item.color : "opacity-70"}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-border/70">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Exit to Dashboard</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/* 3. MAIN CONTENT CONTAINER                                 */}
        {/* -------------------------------------------------------- */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Sticky Header */}
          <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 sm:px-8 border-b border-border/80 bg-background/80 backdrop-blur-xl">
            {/* Left: Mobile Toggle & Breadcrumbs */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="md:hidden flex size-9 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground hover:text-foreground shadow-2xs"
                title="Open navigation menu"
              >
                <Menu className="size-4" />
              </button>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Admin</span>
                <span className="text-muted-foreground/60">/</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <currentSection.icon className={`size-3.5 ${currentSection.color}`} />
                  <span>{currentSection.label}</span>
                </span>
              </div>
            </div>

            {/* Right: Quick Search Button & Role Badge */}
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommandPaletteOpen(true)}
                className="hidden sm:flex h-8 gap-2 text-xs text-muted-foreground hover:text-foreground border-border/80 shadow-2xs"
              >
                <Search className="size-3.5" />
                <span>Search / Jump...</span>
                <kbd className="pointer-events-none rounded border border-border bg-muted px-1.5 font-mono text-[9px] text-muted-foreground">
                  ⌘K
                </kbd>
              </Button>

              <div className="flex items-center gap-2 pl-2 border-l border-border/60">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    userRole === "admin"
                      ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {userRole}
                </span>

                <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 font-bold text-xs border border-indigo-500/20">
                  {(adminName || adminEmail || "A").charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </header>

          {/* Page Content Body - Full Width */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
            {/* Section 1: Overview */}
            {activeTab === "overview" && (
              <OverviewSection onNavigateSection={(sec) => setActiveTab(sec)} />
            )}

            {/* Section: Purchase Requests Queue */}
            {activeTab === "purchase-requests" && !isModerator && (
              <PurchaseRequestsSection onNavigateSection={(sec) => setActiveTab(sec)} />
            )}

            {/* Section 2: Users */}
            {activeTab === "users" && (
              <UsersSection
                currentUserId={currentUserId}
                userRole={userRole}
                onOpenPlan={() => setActiveTab("account-plans")}
              />
            )}

            {/* Section 3: Projects */}
            {activeTab === "projects" && <ProjectsSection userRole={userRole} />}

            {/* Section 4: Account Plans (Free vs Paid Tiers) */}
            {activeTab === "account-plans" && !isModerator && (
              <AccountPlansSection userRole={userRole} />
            )}

            {/* Section 5: AI Providers */}
            {activeTab === "providers" && !isModerator && (
              <AdminProvidersSection initialProviders={providers} />
            )}

            {/* Section 5b: Search Providers (Docs Studio Phase 3) */}
            {activeTab === "search-providers" && !isModerator && (
              <AdminSearchProvidersSection initialProviders={searchProviders} />
            )}

            {/* Section 6: Credits (Packs, Grants, Channels, Logs) */}
            {activeTab === "credits" && (
              <CreditsConsolidatedSection
                users={users}
                initialPlans={plans}
                initialChannels={channels}
                userRole={userRole}
              />
            )}

            {/* Section 7: Developers */}
            {activeTab === "developers" && (
              <DevelopersTable />
            )}

            {/* Section 8: Reports */}
            {activeTab === "reports" && <AdminReportsSection />}

            {/* Section 9: Backups */}
            {activeTab === "backups" && !isModerator && <BackupsSection />}

            {/* Section 10: Admin Team */}
            {activeTab === "team" && !isModerator && (
              <AdminTeamSection currentUserId={currentUserId} userRole={userRole} />
            )}

            {/* Section 11: Activity Log */}
            {activeTab === "activity-log" && <ActivityLogSection />}

            {/* Section 12: Templates */}
            {activeTab === "templates" && (
              <AdminTemplatesSection initialTemplates={templates} />
            )}

            {/* Section 13: System & MCP */}
            {activeTab === "system" && !isModerator && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <AdminMcpSection />
                <AdminErrorsSection />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
