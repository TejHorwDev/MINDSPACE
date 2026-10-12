"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Camera,
  Check,
  ExternalLink,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Twitter,
  Upload,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DeveloperAvatar } from "@/components/developers/developer-avatar";

export type AdminDeveloper = {
  id: string;
  name: string;
  slug: string;
  role: string;
  bio: string;
  photoUrl: string | null;
  socialLinks: {
    github?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
    website?: string;
  };
  order: number;
};

const EMPTY_SOCIALS = {
  github: "",
  linkedin: "",
  instagram: "",
  twitter: "",
  website: "",
};

type FormState = {
  name: string;
  role: string;
  bio: string;
  photoUrl: string;
  socials: typeof EMPTY_SOCIALS;
  order: string;
};

const emptyForm = (): FormState => ({
  name: "",
  role: "",
  bio: "",
  photoUrl: "",
  socials: { ...EMPTY_SOCIALS },
  order: "0",
});

const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function DevelopersTable() {
  const [developers, setDevelopers] = useState<AdminDeveloper[] | null>(null);
  const [editing, setEditing] = useState<AdminDeveloper | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminDeveloper | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch("/api/admin/developers");
    if (res.ok) {
      const data = (await res.json()) as { developers: AdminDeveloper[] };
      setDevelopers(data.developers);
    } else {
      setDevelopers([]);
      toast.error("Could not load developers.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/developers")
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as { developers: AdminDeveloper[] };
          setDevelopers(data.developers);
        } else {
          setDevelopers([]);
        }
      })
      .catch(() => {
        if (!cancelled) setDevelopers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(d: AdminDeveloper) {
    setEditing(d);
    setForm({
      name: d.name,
      role: d.role,
      bio: d.bio,
      photoUrl: d.photoUrl ?? "",
      socials: {
        github: d.socialLinks?.github ?? "",
        linkedin: d.socialLinks?.linkedin ?? "",
        instagram: d.socialLinks?.instagram ?? "",
        twitter: d.socialLinks?.twitter ?? "",
        website: d.socialLinks?.website ?? "",
      },
      order: String(d.order ?? 0),
    });
    setDialogOpen(true);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to upload photo.");
      }

      setForm((prev) => ({ ...prev, photoUrl: data.url }));
      toast.success("Photo uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function save() {
    if (!form.name.trim() || !form.role.trim()) {
      toast.error("Name and role are required.");
      return;
    }

    setSaving(true);
    try {
      const socials: Record<string, string> = {};
      if (form.socials.github.trim()) socials.github = form.socials.github.trim();
      if (form.socials.linkedin.trim()) socials.linkedin = form.socials.linkedin.trim();
      if (form.socials.instagram.trim()) socials.instagram = form.socials.instagram.trim();
      if (form.socials.twitter.trim()) socials.twitter = form.socials.twitter.trim();
      if (form.socials.website.trim()) socials.website = form.socials.website.trim();

      const payload = {
        name: form.name.trim(),
        role: form.role.trim(),
        bio: form.bio.trim(),
        photoUrl: form.photoUrl.trim() || undefined,
        socialLinks: socials,
        order: Number(form.order) || 0,
      };

      const res = editing
        ? await fetch(`/api/admin/developers/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/developers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Could not save developer.");
        return;
      }

      toast.success(editing ? "Developer updated." : "Developer added.");
      setDialogOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">Developers & Creators</h3>
          <p className="text-xs text-muted-foreground">Manage verified creators shown on the public directory.</p>
        </div>
        <Button onClick={openCreate} className="h-9 font-semibold bg-foreground text-background hover:bg-foreground/90">
          <Plus className="mr-1.5 size-4" />
          Add Developer
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-16">Avatar</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Public URL</TableHead>
              <TableHead className="w-20 text-center">Order</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {developers === null ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : developers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                  No developers found. Click "Add Developer" to create one.
                </TableCell>
              </TableRow>
            ) : (
              developers.map((dev) => (
                <TableRow key={dev.id} className="hover:bg-muted/30">
                  <TableCell>
                    <DeveloperAvatar
                      name={dev.name}
                      photoUrl={dev.photoUrl}
                      size={36}
                    />
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {dev.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <span className="inline-block rounded-md bg-secondary px-2 py-0.5 font-medium text-foreground">
                      {dev.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    <Link
                      href={`/developers/${dev.slug}`}
                      target="_blank"
                      className="hover:text-indigo-500 inline-flex items-center gap-1"
                    >
                      /developers/{dev.slug}
                      <ExternalLink className="size-3" />
                    </Link>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs text-muted-foreground">
                    {dev.order}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(dev)}
                        title="Edit developer"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(dev)}
                        title="Delete developer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Developer Dialog with Local Photo Upload */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-3xl border-border/80 bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              {editing ? `Edit ${editing.name}` : "Add New Developer"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure profile information and upload a local photo file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Local Photo Upload Area */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Developer Avatar Photo</Label>
              <div className="flex items-center gap-4 rounded-2xl border border-border/80 bg-secondary/30 p-4">
                <DeveloperAvatar
                  name={form.name || "Preview"}
                  photoUrl={form.photoUrl}
                  size={64}
                  className="ring-2 ring-border/80 shadow-sm"
                />

                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="h-8 text-xs font-medium rounded-xl border-border/80"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-1.5 size-3.5" />
                          Upload Photo File
                        </>
                      )}
                    </Button>

                    {form.photoUrl && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setForm((prev) => ({ ...prev, photoUrl: "" }))}
                        className="h-8 text-xs text-destructive hover:bg-destructive/10 rounded-xl"
                      >
                        <X className="mr-1 size-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Upload PNG, JPG, or WEBP from your computer (max 5MB).
                  </p>
                </div>
              </div>

              {/* Direct URL input fallback */}
              <div className="pt-1">
                <Label htmlFor="dev-photo-url" className="text-[11px] text-muted-foreground">
                  Or image file URL:
                </Label>
                <Input
                  id="dev-photo-url"
                  value={form.photoUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, photoUrl: e.target.value }))}
                  placeholder="/uploads/... or direct https://...png"
                  className="h-9 text-xs rounded-xl border-border/80 mt-1 font-mono"
                />
              </div>
            </div>

            {/* Name & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dev-name" className="text-xs font-medium text-foreground">
                  Full Name *
                </Label>
                <Input
                  id="dev-name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Tej Jung Xettri"
                  className="h-9 text-xs rounded-xl border-border/80"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dev-role" className="text-xs font-medium text-foreground">
                  Role Title *
                </Label>
                <Input
                  id="dev-role"
                  value={form.role}
                  onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                  placeholder="e.g. HEAD DEV </>"
                  className="h-9 text-xs rounded-xl border-border/80"
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <Label htmlFor="dev-bio" className="text-xs font-medium text-foreground">
                Biography
              </Label>
              <Textarea
                id="dev-bio"
                rows={3}
                value={form.bio}
                onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                placeholder="A short description of their role, focus, and background..."
                className="text-xs rounded-xl border-border/80 resize-none"
              />
            </div>

            {/* Social Links */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Social & Portfolio Links</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Github className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    value={form.socials.github}
                    onChange={(e) => setForm((f) => ({ ...f, socials: { ...f.socials, github: e.target.value } }))}
                    placeholder="GitHub URL"
                    className="h-9 pl-9 text-xs rounded-xl border-border/80"
                  />
                </div>

                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    value={form.socials.linkedin}
                    onChange={(e) => setForm((f) => ({ ...f, socials: { ...f.socials, linkedin: e.target.value } }))}
                    placeholder="LinkedIn URL"
                    className="h-9 pl-9 text-xs rounded-xl border-border/80"
                  />
                </div>

                <div className="relative">
                  <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    value={form.socials.twitter}
                    onChange={(e) => setForm((f) => ({ ...f, socials: { ...f.socials, twitter: e.target.value } }))}
                    placeholder="X / Twitter URL"
                    className="h-9 pl-9 text-xs rounded-xl border-border/80"
                  />
                </div>

                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    value={form.socials.website}
                    onChange={(e) => setForm((f) => ({ ...f, socials: { ...f.socials, website: e.target.value } }))}
                    placeholder="Portfolio URL"
                    className="h-9 pl-9 text-xs rounded-xl border-border/80"
                  />
                </div>
              </div>
            </div>

            {/* Display Order */}
            <div className="space-y-1.5">
              <Label htmlFor="dev-order" className="text-xs font-medium text-foreground">
                Display Order Priority (0 = first)
              </Label>
              <Input
                id="dev-order"
                type="number"
                min={0}
                value={form.order}
                onChange={(e) => setForm((prev) => ({ ...prev, order: e.target.value }))}
                className="h-9 text-xs rounded-xl border-border/80 w-32"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="h-9 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={save}
              disabled={saving || !form.name.trim() || !form.role.trim()}
              className="h-9 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-xl"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Saving...
                </>
              ) : editing ? (
                "Save Changes"
              ) : (
                "Add Developer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            load();
          }
        }}
        endpoint={deleteTarget ? `/api/admin/developers/${deleteTarget.id}` : ""}
        title={`Remove ${deleteTarget?.name}?`}
        description="Their verified creator profile will be permanently removed from the website."
        successTitle="Developer removed"
      />
    </div>
  );
}
