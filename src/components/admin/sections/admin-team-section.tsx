"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Crown,
  MoreHorizontal,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "moderator";
  createdAt: string;
  updatedAt: string;
  _count?: {
    adminLogs: number;
  };
}

interface AdminTeamSectionProps {
  currentUserId: string;
  userRole?: string;
}

export function AdminTeamSection({
  currentUserId,
  userRole = "admin",
}: AdminTeamSectionProps) {
  const isModerator = userRole === "moderator";

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Promote Dialog
  const [isPromoteOpen, setIsPromoteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string | null; email: string; role: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string | null; email: string } | null>(null);
  const [targetRole, setTargetRole] = useState<"moderator" | "admin">("moderator");
  const [isPromoting, setIsPromoting] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/team");
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      }
    } catch {
      toast.error("Failed to load admin team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
      }
    } catch {
      // Ignore
    } finally {
      setSearching(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "student" | "moderator" | "admin") => {
    try {
      const res = await fetch("/api/admin/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || `Role updated to ${newRole}`);
        fetchStaff();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update role");
      }
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      toast.error("Select a user to promote");
      return;
    }
    setIsPromoting(true);
    try {
      const res = await fetch("/api/admin/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, role: targetRole }),
      });

      if (res.ok) {
        toast.success(`Promoted ${selectedUser.email} to ${targetRole}`);
        setIsPromoteOpen(false);
        setSelectedUser(null);
        setSearchQuery("");
        setSearchResults([]);
        fetchStaff();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to promote user");
      }
    } catch {
      toast.error("Failed to promote user");
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="size-5 text-emerald-500" />
            <span>Admin Team & Permissions</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Manage administrator and moderator privileges. Admins have full platform control; moderators
            can review reported projects and view read-only user directories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isModerator && (
            <Button
              onClick={() => setIsPromoteOpen(true)}
              size="sm"
              className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              <UserPlus className="size-3.5" />
              <span>Add Staff Member</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchStaff}
            disabled={loading}
            className="h-9 gap-1.5 text-xs shadow-2xs"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/80 bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="p-3">Team Member</th>
                <th className="p-3">Access Level</th>
                <th className="p-3">Capabilities</th>
                <th className="p-3">Audit Actions</th>
                <th className="p-3 text-right">Role Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="p-3"><Skeleton className="h-4 w-36" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-12" /></td>
                    <td className="p-3 text-right"><Skeleton className="h-7 w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No staff members found.
                  </td>
                </tr>
              ) : (
                staff.map((member) => {
                  const isSelf = member.id === currentUserId;

                  return (
                    <tr key={member.id} className="hover:bg-muted/30">
                      {/* Name & Email */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex size-8 items-center justify-center rounded-xl font-bold text-xs ${
                              member.role === "admin"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {(member.name || member.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">
                                {member.name || "Nameless Staff"}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-400 font-mono">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Access Level Badge */}
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            member.role === "admin"
                              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {member.role === "admin" ? (
                            <Crown className="size-3" />
                          ) : (
                            <Shield className="size-3" />
                          )}
                          <span>{member.role}</span>
                        </span>
                      </td>

                      {/* Capabilities Description */}
                      <td className="p-3 text-muted-foreground">
                        {member.role === "admin" ? (
                          <span className="text-foreground">Full Platform Administration & BYOK</span>
                        ) : (
                          <span>Reports Moderation & Read-Only Directories</span>
                        )}
                      </td>

                      {/* Audit Log Count */}
                      <td className="p-3 font-mono text-muted-foreground">
                        {member._count?.adminLogs ?? 0} actions
                      </td>

                      {/* Role Management Dropdown */}
                      <td className="p-3 text-right">
                        {!isModerator && !isSelf ? (
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleRoleChange(
                                member.id,
                                e.target.value as "student" | "moderator" | "admin"
                              )
                            }
                            aria-label={`Change role for ${member.email}`}
                            className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none cursor-pointer"
                          >
                            <option value="admin">Admin</option>
                            <option value="moderator">Moderator</option>
                            <option value="student">Demote to Student</option>
                          </select>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            {isSelf ? "Self Account" : "Read-only"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Member Dialog */}
      <Dialog open={isPromoteOpen} onOpenChange={setIsPromoteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-emerald-500" />
              <span>Add Staff Member</span>
            </DialogTitle>
            <DialogDescription>
              Search an existing user by email or name to promote them to Moderator or Admin.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePromoteSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground">Search User</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  placeholder="Type email or name..."
                  className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs text-foreground focus:outline-none"
                />
              </div>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg space-y-1">
                  {searchResults.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setSelectedUser(u);
                        setSearchQuery(u.email);
                        setSearchResults([]);
                      }}
                      className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between ${
                        selectedUser?.id === u.id
                          ? "bg-emerald-500/15 text-emerald-400 font-semibold"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <div>
                        <span>{u.name || "Student"}</span>
                        <span className="text-[10px] text-muted-foreground block font-mono">
                          {u.email}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-secondary">
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedUser && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                  Selected User
                </span>
                <span className="font-bold text-foreground">
                  {selectedUser.name || "Student"} ({selectedUser.email})
                </span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-foreground">Target Role</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as "moderator" | "admin")}
                className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none cursor-pointer"
              >
                <option value="moderator">Moderator (Reports & Directory Read-Only)</option>
                <option value="admin">Full Admin (All Features & BYOK)</option>
              </select>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsPromoteOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPromoting || !selectedUser}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
              >
                {isPromoting ? "Promoting..." : "Promote to Staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
