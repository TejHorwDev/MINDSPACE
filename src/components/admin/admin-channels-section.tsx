"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ExternalLink,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export type AdminContactChannel = {
  id: string;
  name: string;
  iconType: string;
  contactLink: string;
  instructions: string;
  active: boolean;
  displayOrder: number;
};

type FormState = {
  name: string;
  iconType: string;
  contactLink: string;
  instructions: string;
  active: boolean;
  displayOrder: string;
};

const emptyForm: FormState = {
  name: "",
  iconType: "message-circle",
  contactLink: "",
  instructions: "",
  active: true,
  displayOrder: "0",
};

export function AdminChannelsSection({
  initialChannels,
}: {
  initialChannels: AdminContactChannel[];
}) {
  const [channels, setChannels] = useState<AdminContactChannel[]>(initialChannels);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminContactChannel | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminContactChannel | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      displayOrder: String(channels.length),
    });
    setDialogOpen(true);
  }

  function openEdit(ch: AdminContactChannel) {
    setEditing(ch);
    setForm({
      name: ch.name,
      iconType: ch.iconType,
      contactLink: ch.contactLink,
      instructions: ch.instructions,
      active: ch.active,
      displayOrder: String(ch.displayOrder),
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.contactLink.trim()) {
      toast.error("Channel name and contact link are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        iconType: form.iconType.trim() || "message-circle",
        contactLink: form.contactLink.trim(),
        instructions: form.instructions.trim() || "Message us here to arrange payment.",
        active: form.active,
        displayOrder: parseInt(form.displayOrder, 10) || 0,
      };

      const res = editing
        ? await fetch(`/api/admin/channels/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/channels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save channel.");
      }

      const data = await res.json();
      if (editing) {
        setChannels((prev) =>
          prev.map((c) => (c.id === editing.id ? data.channel : c))
        );
        toast.success("Contact channel updated.");
      } else {
        setChannels((prev) => [...prev, data.channel]);
        toast.success("Contact channel added.");
      }

      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save channel.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/channels/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete channel.");

      setChannels((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast.success("Contact channel deleted.");
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete channel.");
    } finally {
      setDeleting(false);
    }
  }

  async function toggleActive(ch: AdminContactChannel) {
    try {
      const updatedStatus = !ch.active;
      const res = await fetch(`/api/admin/channels/${ch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: updatedStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status.");

      setChannels((prev) =>
        prev.map((c) => (c.id === ch.id ? { ...c, active: updatedStatus } : c))
      );
      toast.success(`${ch.name} is now ${updatedStatus ? "active" : "disabled"}.`);
    } catch (err) {
      toast.error("Failed to update channel status.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">Purchase Contact Channels</h3>
          <p className="text-xs text-muted-foreground">
            Manage the payment channels students see when buying AI credits (Discord, WhatsApp, eSewa, Khalti, etc.).
          </p>
        </div>

        <Button
          onClick={openCreate}
          className="h-9 font-semibold bg-foreground text-background hover:bg-foreground/90 gap-1.5"
        >
          <Plus className="size-4" />
          Add Channel
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-16">Order</TableHead>
              <TableHead>Channel Name</TableHead>
              <TableHead>Contact Link / URL</TableHead>
              <TableHead>Instructions</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                  No contact channels configured. Click "Add Channel" to create one.
                </TableCell>
              </TableRow>
            ) : (
              channels.map((ch) => (
                <TableRow key={ch.id} className="text-xs">
                  <TableCell className="font-mono text-muted-foreground">{ch.displayOrder}</TableCell>
                  <TableCell className="font-semibold text-foreground flex items-center gap-2">
                    <MessageCircle className="size-3.5 text-indigo-500" />
                    <span>{ch.name}</span>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground max-w-[220px] truncate">
                    <a
                      href={ch.contactLink}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-foreground inline-flex items-center gap-1"
                    >
                      {ch.contactLink}
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[260px] truncate">
                    {ch.instructions}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => toggleActive(ch)}
                      className="cursor-pointer"
                      title="Click to toggle active status"
                    >
                      {ch.active ? (
                        <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border-emerald-500/30">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Disabled
                        </Badge>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEdit(ch)}
                        title="Edit channel"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(ch)}
                        title="Delete channel"
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

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl border-border/80 bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {editing ? `Edit ${editing.name}` : "Add Purchase Contact Channel"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Channels are shown to students on /credits and when they run out of daily credits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Channel Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Discord, WhatsApp, eSewa, Khalti"
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Contact Link / URL</Label>
              <Input
                value={form.contactLink}
                onChange={(e) => setForm({ ...form, contactLink: e.target.value })}
                placeholder="https://discord.gg/... or https://wa.me/..."
                className="h-10 text-xs rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Instructions for Student</Label>
              <Textarea
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                placeholder="Message us here to arrange payment via eSewa / Bank..."
                rows={2}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Display Order</Label>
                <Input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="flex items-center justify-between rounded-xl border border-border p-2">
                  <span className="text-xs font-medium">Active</span>
                  <Switch
                    checked={form.active}
                    onCheckedChange={(checked) => setForm({ ...form, active: checked })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="h-9 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-9 text-xs font-semibold rounded-xl bg-foreground text-background hover:bg-foreground/90"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              {editing ? "Save Changes" : "Create Channel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm rounded-3xl border-border/80 bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Delete {deleteTarget?.name}?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This channel will no longer appear on the student purchase screen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs rounded-xl"
            >
              {deleting ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              Delete Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
