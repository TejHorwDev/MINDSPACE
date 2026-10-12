"use client";

import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Activity,
  Coins,
  Cpu,
  Database,
  Flag,
  FolderGit2,
  Globe,
  Layers,
  Plus,
  Shield,
  ShoppingCart,
  Sparkles,
  Users,
  Code2,
  LayoutDashboard,
} from "lucide-react";

interface AdminCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSection: (section: string) => void;
  userRole?: string;
  users?: Array<{ id: string; name?: string | null; email: string }>;
  projects?: Array<{ id: string; name: string }>;
  onSelectUser?: (userId: string) => void;
  onSelectProject?: (projectId: string) => void;
}

export function AdminCommandPalette({
  open,
  onOpenChange,
  onSelectSection,
  userRole = "admin",
  users = [],
  projects = [],
  onSelectUser,
  onSelectProject,
}: AdminCommandPaletteProps) {
  const isModerator = userRole === "moderator";

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const handleSelect = (section: string) => {
    onSelectSection(section);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command, search users, projects, or jump to section... (⌘K)" />
      <CommandList className="max-h-[380px]">
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Section Navigation */}
        <CommandGroup heading="Admin Navigation">
          <CommandItem
            onSelect={() => handleSelect("overview")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <LayoutDashboard className="size-4 text-indigo-400" />
            <span>Overview Dashboard</span>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect("purchase-requests")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <ShoppingCart className="size-4 text-amber-400" />
            <span>Purchase Requests Queue</span>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect("users")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Users className="size-4 text-sky-400" />
            <span>Users Management</span>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect("projects")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <FolderGit2 className="size-4 text-emerald-400" />
            <span>Projects Directory</span>
          </CommandItem>

          {!isModerator && (
            <CommandItem
              onSelect={() => handleSelect("account-plans")}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="size-4 text-muted-foreground" />
              <span>Account Plans (Free vs Pro)</span>
            </CommandItem>
          )}

          {!isModerator && (
            <CommandItem
              onSelect={() => handleSelect("providers")}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Cpu className="size-4 text-amber-400" />
              <span>AI Providers & Models</span>
            </CommandItem>
          )}

          {!isModerator && (
            <CommandItem
              onSelect={() => handleSelect("search-providers")}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Globe className="size-4 text-indigo-400" />
              <span>Search Providers (Docs Studio Auto-Research)</span>
            </CommandItem>
          )}

          <CommandItem
            onSelect={() => handleSelect("credits")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Coins className="size-4 text-amber-500" />
            <span>Credits (Plans, Grants, Channels, Logs)</span>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect("developers")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Code2 className="size-4 text-cyan-400" />
            <span>Developers Team Profiles</span>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect("reports")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Flag className="size-4 text-rose-400" />
            <span>Flagged Reports</span>
          </CommandItem>

          {!isModerator && (
            <CommandItem
              onSelect={() => handleSelect("backups")}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Database className="size-4 text-blue-400" />
              <span>Database Backups & Snapshot</span>
            </CommandItem>
          )}

          {!isModerator && (
            <CommandItem
              onSelect={() => handleSelect("team")}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Shield className="size-4 text-emerald-500" />
              <span>Admin Team & Roles</span>
            </CommandItem>
          )}

          <CommandItem
            onSelect={() => handleSelect("activity-log")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Activity className="size-4 text-violet-400" />
            <span>Admin Activity Audit Log</span>
          </CommandItem>
        </CommandGroup>

        {/* Quick Actions (Admin Only) */}
        {!isModerator && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Quick Actions">
              <CommandItem
                onSelect={() => handleSelect("account-plans")}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Plus className="size-4 text-muted-foreground" />
                <span>Create New Account Plan</span>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect("credits")}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Plus className="size-4 text-amber-500" />
                <span>Grant Credits to User</span>
              </CommandItem>

              <CommandItem
                onSelect={() => handleSelect("backups")}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Database className="size-4 text-blue-400" />
                <span>Trigger Manual Snapshot Backup</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {/* Users Jump */}
        {users.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Jump to User">
              {users.slice(0, 5).map((u) => (
                <CommandItem
                  key={u.id}
                  onSelect={() => {
                    if (onSelectUser) onSelectUser(u.id);
                    handleSelect("users");
                  }}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Users className="size-3.5 text-muted-foreground" />
                    <span>{u.name || u.email}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{u.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Projects Jump */}
        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Jump to Project">
              {projects.slice(0, 5).map((p) => (
                <CommandItem
                  key={p.id}
                  onSelect={() => {
                    if (onSelectProject) onSelectProject(p.id);
                    handleSelect("projects");
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <FolderGit2 className="size-3.5 text-muted-foreground" />
                  <span>{p.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
