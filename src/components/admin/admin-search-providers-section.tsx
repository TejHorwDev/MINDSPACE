"use client";

import React, { useState } from "react";
import {
  Globe,
  Plus,
  Check,
  AlertTriangle,
  Loader2,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
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

export type AdminSearchProvider = {
  id: string;
  name: string;
  provider: string; // "tavily" | "serpapi" | "bing" | "custom"
  apiKey?: string | null;
  baseUrl?: string | null;
  active: boolean;
  priority: number;
  searchDepth?: string;
  maxResults?: number;
  notes?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type TestStatus = {
  loading: boolean;
  success?: boolean;
  latencyMs?: number;
  message?: string;
  error?: string;
};

export function AdminSearchProvidersSection({
  initialProviders,
}: {
  initialProviders: AdminSearchProvider[];
}) {
  const [providers, setProviders] = useState<AdminSearchProvider[]>(initialProviders);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [testStatuses, setTestStatuses] = useState<Record<string, TestStatus>>({});
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

  // Edit Provider Modal State
  const [editingProvider, setEditingProvider] = useState<AdminSearchProvider | null>(null);
  const [editName, setEditName] = useState("");
  const [editProviderType, setEditProviderType] = useState("tavily");
  const [editBaseUrl, setEditBaseUrl] = useState("");
  const [editApiKey, setEditApiKey] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPriority, setEditPriority] = useState(0);
  const [editSearchDepth, setEditSearchDepth] = useState("basic");
  const [editMaxResults, setEditMaxResults] = useState(5);
  const [editActive, setEditActive] = useState(true);
  const [showEditApiKey, setShowEditApiKey] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [modalTestStatus, setModalTestStatus] = useState<TestStatus | null>(null);

  // Add Provider Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newProviderType, setNewProviderType] = useState("tavily");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newPriority, setNewPriority] = useState(0);
  const [newSearchDepth, setNewSearchDepth] = useState("basic");
  const [newMaxResults, setNewMaxResults] = useState(5);
  const [showNewApiKey, setShowNewApiKey] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [addModalTestStatus, setAddModalTestStatus] = useState<TestStatus | null>(null);

  // Delete Provider Modal State
  const [deletingProvider, setDeletingProvider] = useState<AdminSearchProvider | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleRevealKey = (id: string) => {
    setRevealedKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openEditModal = (p: AdminSearchProvider) => {
    setEditingProvider(p);
    setEditName(p.name);
    setEditProviderType(p.provider);
    setEditBaseUrl(p.baseUrl || "");
    setEditApiKey(p.apiKey || "");
    setEditNotes(p.notes || "");
    setEditPriority(p.priority);
    setEditSearchDepth(p.searchDepth || "basic");
    setEditMaxResults(p.maxResults || 5);
    setEditActive(p.active);
    setShowEditApiKey(false);
    setModalTestStatus(null);
  };

  const handleToggleActive = async (provider: AdminSearchProvider) => {
    setTogglingId(provider.id);
    const newActive = !provider.active;

    try {
      const res = await fetch(`/api/admin/search-providers/${provider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newActive }),
      });

      if (!res.ok) throw new Error("Failed to update search provider status");

      setProviders((prev) =>
        prev.map((p) => (p.id === provider.id ? { ...p, active: newActive } : p))
      );

      toast.success(
        `${provider.name} is now ${newActive ? "active" : "disabled"}.`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to toggle search provider");
    } finally {
      setTogglingId(null);
    }
  };

  const handleTestConnection = async (
    provider: AdminSearchProvider,
    customKey?: string
  ) => {
    const keyToTest = customKey !== undefined ? customKey : provider.apiKey;

    setTestStatuses((prev) => ({
      ...prev,
      [provider.id]: { loading: true },
    }));

    try {
      const res = await fetch(`/api/admin/search-providers/${provider.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: keyToTest,
          provider: provider.provider,
          baseUrl: provider.baseUrl,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestStatuses((prev) => ({
          ...prev,
          [provider.id]: {
            loading: false,
            success: true,
            latencyMs: data.latencyMs,
            message: data.message,
          },
        }));
        toast.success(
          `${provider.name} tested successfully! (${data.latencyMs}ms)`
        );
      } else {
        setTestStatuses((prev) => ({
          ...prev,
          [provider.id]: {
            loading: false,
            success: false,
            latencyMs: data.latencyMs,
            message: data.message,
            error: data.error || data.message || "Connection failed",
          },
        }));
        toast.error(`${provider.name} test failed: ${data.error || data.message}`);
      }
    } catch (err: any) {
      setTestStatuses((prev) => ({
        ...prev,
        [provider.id]: {
          loading: false,
          success: false,
          error: err.message,
        },
      }));
      toast.error(`Network error testing ${provider.name}: ${err.message}`);
    }
  };

  const handleModalTest = async (isNew: boolean) => {
    const provider = isNew ? newProviderType : editProviderType;
    const apiKey = isNew ? newApiKey : editApiKey;
    const baseUrl = isNew ? newBaseUrl : editBaseUrl;

    if (!apiKey.trim()) {
      toast.error("Please enter an API key to test");
      return;
    }

    const setStatus = isNew ? setAddModalTestStatus : setModalTestStatus;
    setStatus({ loading: true });

    try {
      const res = await fetch(
        isNew
          ? `/api/admin/search-providers`
          : `/api/admin/search-providers/${editingProvider?.id}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: apiKey.trim(),
            provider,
            baseUrl: baseUrl.trim() || undefined,
          }),
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus({
          loading: false,
          success: true,
          latencyMs: data.latencyMs,
          message: data.message,
        });
        toast.success(`Connection verified (${data.latencyMs}ms)!`);
      } else {
        setStatus({
          loading: false,
          success: false,
          message: data.message,
          error: data.error || data.message || "Failed",
        });
        toast.error(`Test failed: ${data.error || data.message}`);
      }
    } catch (err: any) {
      setStatus({
        loading: false,
        success: false,
        error: err.message,
      });
      toast.error(`Network error: ${err.message}`);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProvider) return;
    if (!editName.trim()) {
      toast.error("Name is required");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/search-providers/${editingProvider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          provider: editProviderType,
          baseUrl: editBaseUrl.trim() || null,
          apiKey: editApiKey.trim() || null,
          notes: editNotes.trim() || null,
          priority: Number(editPriority),
          searchDepth: editSearchDepth,
          maxResults: Number(editMaxResults),
          active: editActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update search provider");
      }

      const { provider: updated } = await res.json();
      setProviders((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      toast.success(`${updated.name} updated successfully!`);
      setEditingProvider(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save changes");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveNew = async () => {
    if (!newName.trim()) {
      toast.error("Provider Name is required");
      return;
    }

    setSavingNew(true);
    try {
      const res = await fetch(`/api/admin/search-providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          provider: newProviderType,
          baseUrl: newBaseUrl.trim() || null,
          apiKey: newApiKey.trim() || null,
          notes: newNotes.trim() || null,
          priority: Number(newPriority),
          searchDepth: newSearchDepth,
          maxResults: Number(newMaxResults),
          active: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create search provider");
      }

      const { provider: created } = await res.json();
      setProviders((prev) => [...prev, created]);
      toast.success(`${created.name} added successfully!`);
      setIsAddOpen(false);
      setNewName("");
      setNewApiKey("");
      setNewNotes("");
      setNewBaseUrl("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create search provider");
    } finally {
      setSavingNew(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProvider) return;
    setIsDeleting(true);

    try {
      const res = await fetch(
        `/api/admin/search-providers/${deletingProvider.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Failed to delete search provider");

      setProviders((prev) => prev.filter((p) => p.id !== deletingProvider.id));
      toast.success(`${deletingProvider.name} deleted.`);
      setDeletingProvider(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  const activeCount = providers.filter((p) => p.active).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Globe className="size-4" />
            </div>
            <h2 className="text-base font-bold text-foreground">Web Search Providers</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Docs Studio Phase 3
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Powers Docs Studio&apos;s AI Auto-Research engine. Searches the live web using real search APIs (Tavily, SerpAPI, Bing) to extract grounded facts and generate verifiable APA citations without hallucinations.
          </p>
        </div>

        <Button
          onClick={() => {
            setIsAddOpen(true);
            setAddModalTestStatus(null);
          }}
          className="h-9 px-4 text-xs font-semibold rounded-xl bg-foreground text-background hover:bg-foreground/90 shrink-0 shadow-xs"
        >
          <Plus className="size-3.5 mr-1.5" />
          Add Search Provider
        </Button>
      </div>

      {/* Active Status Callout */}
      {activeCount === 0 ? (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-semibold block">No active search provider configured</span>
            <p className="text-muted-foreground">
              Docs Studio Auto-Research will remain disabled for students until an active provider with a valid API key (such as Tavily) is enabled. Add an API key below to activate live research.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          <Check className="size-4 shrink-0" />
          <span>
            <strong>{activeCount} search provider(s) active.</strong> AI Auto-Research is enabled with verifiable web grounding.
          </span>
        </div>
      )}

      {/* Main Providers Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="w-16 text-center text-xs">Active</TableHead>
              <TableHead className="text-xs">Provider</TableHead>
              <TableHead className="text-xs">Service Engine</TableHead>
              <TableHead className="text-xs">Priority</TableHead>
              <TableHead className="text-xs">API Key</TableHead>
              <TableHead className="text-xs">Diagnostics / Test</TableHead>
              <TableHead className="w-24 text-right text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                  No search providers configured. Click &quot;Add Search Provider&quot; above to configure Tavily or SerpAPI.
                </TableCell>
              </TableRow>
            ) : (
              providers.map((p) => {
                const testState = testStatuses[p.id];
                const isKeyRevealed = Boolean(revealedKeys[p.id]);

                return (
                  <TableRow key={p.id} className="border-border/50 hover:bg-secondary/40 transition-colors">
                    {/* Active Toggle Switch */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <Switch
                          checked={p.active}
                          disabled={togglingId === p.id}
                          onCheckedChange={() => handleToggleActive(p)}
                          className="scale-90"
                        />
                      </div>
                    </TableCell>

                    {/* Name + Notes */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                          <span>{p.name}</span>
                          {p.provider === "tavily" && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        {p.notes && (
                          <p className="text-[11px] text-muted-foreground truncate max-w-xs">
                            {p.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Service Type */}
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-medium bg-secondary text-foreground border border-border/80 uppercase">
                        {p.provider}
                      </span>
                    </TableCell>

                    {/* Priority */}
                    <TableCell>
                      <span className="font-mono text-xs font-semibold text-muted-foreground">
                        #{p.priority}
                      </span>
                    </TableCell>

                    {/* API Key */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <code className="text-[11px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-secondary/80 border border-border/60 max-w-[140px] truncate">
                          {p.apiKey
                            ? isKeyRevealed
                              ? p.apiKey
                              : `••••••••••••${p.apiKey.slice(-4)}`
                            : "Not configured"}
                        </code>
                        {p.apiKey && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRevealKey(p.id)}
                            className="size-6 p-0 text-muted-foreground hover:text-foreground"
                            title={isKeyRevealed ? "Hide key" : "Show key"}
                          >
                            {isKeyRevealed ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                          </Button>
                        )}
                      </div>
                    </TableCell>

                    {/* Test Button & Diagnostics */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={testState?.loading}
                          onClick={() => handleTestConnection(p)}
                          className="h-7 px-2.5 text-[11px] font-medium border-border/80 hover:bg-secondary cursor-pointer shadow-2xs"
                        >
                          {testState?.loading ? (
                            <>
                              <Loader2 className="size-3 mr-1 animate-spin text-indigo-400" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <Zap className="size-3 mr-1 text-amber-400" />
                              Test Connection
                            </>
                          )}
                        </Button>

                        {testState?.success === true && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <Check className="size-3" />
                            {testState.latencyMs}ms
                          </span>
                        )}

                        {testState?.success === false && (
                          <span
                            title={testState.error || testState.message}
                            className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 max-w-[120px] truncate"
                          >
                            <AlertTriangle className="size-3 shrink-0" />
                            Failed
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions: Edit / Delete */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(p)}
                          className="size-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Edit search provider"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingProvider(p)}
                          className="size-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                          title="Delete search provider"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ADD SEARCH PROVIDER MODAL                                          */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Globe className="size-4 text-indigo-400" />
              Add Search Provider
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure a real search API for Docs Studio AI Auto-Research.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Provider Name</Label>
              <Input
                placeholder="e.g. Tavily AI Search (Primary)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-xs bg-secondary/40 border-border/80"
              />
            </div>

            {/* Provider Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Service Engine</Label>
              <select
                value={newProviderType}
                onChange={(e) => setNewProviderType(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg text-xs bg-secondary/60 border border-border/80 text-foreground"
              >
                <option value="tavily">Tavily (Recommended — Built for AI Agents)</option>
                <option value="serpapi">SerpAPI (Google Organic Results)</option>
                <option value="bing">Bing Web Search (Azure Cognitive Services)</option>
                <option value="custom">Custom Endpoint</option>
              </select>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">API Key</Label>
                {newProviderType === "tavily" && (
                  <a
                    href="https://tavily.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    Get free key at tavily.com <ExternalLink className="size-2.5 ml-0.5" />
                  </a>
                )}
                {newProviderType === "serpapi" && (
                  <a
                    href="https://serpapi.com/manage-api-key"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    Get 64-char key at serpapi.com <ExternalLink className="size-2.5 ml-0.5" />
                  </a>
                )}
                {newProviderType === "bing" && (
                  <a
                    href="https://portal.azure.com/#create/Microsoft.BingSearch"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    portal.azure.com (Bing v7) <ExternalLink className="size-2.5 ml-0.5" />
                  </a>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showNewApiKey ? "text" : "password"}
                  placeholder={
                    newProviderType === "tavily"
                      ? "tvly-..."
                      : newProviderType === "serpapi"
                      ? "64-character hex key (from serpapi.com/manage-api-key)"
                      : "Search API key"
                  }
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  className="h-8 pr-8 text-xs font-mono bg-secondary/40 border-border/80"
                />
                <button
                  type="button"
                  onClick={() => setShowNewApiKey(!showNewApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            {/* Base URL (Optional) */}
            {newProviderType === "custom" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Custom Base URL</Label>
                <Input
                  placeholder="https://api.custom-search.com/search"
                  value={newBaseUrl}
                  onChange={(e) => setNewBaseUrl(e.target.value)}
                  className="h-8 text-xs font-mono bg-secondary/40 border-border/80"
                />
              </div>
            )}

            {/* Priority & Max Results */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Priority (0 = highest)</Label>
                <Input
                  type="number"
                  value={newPriority}
                  onChange={(e) => setNewPriority(parseInt(e.target.value) || 0)}
                  className="h-8 text-xs bg-secondary/40 border-border/80"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Results per Query</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newMaxResults}
                  onChange={(e) => setNewMaxResults(parseInt(e.target.value) || 5)}
                  className="h-8 text-xs bg-secondary/40 border-border/80"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Notes (Optional)</Label>
              <Textarea
                placeholder="e.g. Free tier (1,000 requests/mo)"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="text-xs bg-secondary/40 border-border/80 resize-none h-16"
              />
            </div>

            {/* Test Connection Inside Modal */}
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={addModalTestStatus?.loading || !newApiKey.trim()}
                onClick={() => handleModalTest(true)}
                className="w-full h-8 text-xs border-border/80"
              >
                {addModalTestStatus?.loading ? (
                  <>
                    <Loader2 className="size-3 mr-1.5 animate-spin" />
                    Testing API Key...
                  </>
                ) : (
                  <>
                    <Zap className="size-3 mr-1.5 text-amber-400" />
                    Test Key Before Saving
                  </>
                )}
              </Button>

              {addModalTestStatus && !addModalTestStatus.loading && (
                <p
                  className={`mt-1.5 text-[11px] font-mono ${
                    addModalTestStatus.success ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {addModalTestStatus.message || addModalTestStatus.error}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={savingNew || !newName.trim()}
              onClick={handleSaveNew}
              className="h-8 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90"
            >
              {savingNew ? (
                <>
                  <Loader2 className="size-3 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Search Provider"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* EDIT SEARCH PROVIDER MODAL                                         */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={Boolean(editingProvider)} onOpenChange={(open) => !open && setEditingProvider(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Edit2 className="size-4 text-indigo-400" />
              Edit Search Provider
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update credentials and settings for this search engine.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Provider Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 text-xs bg-secondary/40 border-border/80"
              />
            </div>

            {/* Provider Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Service Engine</Label>
              <select
                value={editProviderType}
                onChange={(e) => setEditProviderType(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg text-xs bg-secondary/60 border border-border/80 text-foreground"
              >
                <option value="tavily">Tavily (Recommended — Built for AI Agents)</option>
                <option value="serpapi">SerpAPI (Google Organic Results)</option>
                <option value="bing">Bing Web Search (Azure Cognitive Services)</option>
                <option value="custom">Custom Endpoint</option>
              </select>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">API Key</Label>
                {editProviderType === "tavily" && (
                  <a
                    href="https://tavily.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    tavily.com <ExternalLink className="size-2.5 ml-0.5" />
                  </a>
                )}
                {editProviderType === "serpapi" && (
                  <a
                    href="https://serpapi.com/manage-api-key"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    serpapi.com/manage-api-key <ExternalLink className="size-2.5 ml-0.5" />
                  </a>
                )}
                {editProviderType === "bing" && (
                  <a
                    href="https://portal.azure.com/#create/Microsoft.BingSearch"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    portal.azure.com (Bing v7) <ExternalLink className="size-2.5 ml-0.5" />
                  </a>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showEditApiKey ? "text" : "password"}
                  placeholder={
                    editProviderType === "serpapi"
                      ? "64-character hex key (from serpapi.com/manage-api-key)"
                      : editProviderType === "bing"
                      ? "32-character Azure Key (from Keys and Endpoint)"
                      : "Enter new API key or leave unchanged"
                  }
                  value={editApiKey}
                  onChange={(e) => setEditApiKey(e.target.value)}
                  className="h-8 pr-8 text-xs font-mono bg-secondary/40 border-border/80"
                />
                <button
                  type="button"
                  onClick={() => setShowEditApiKey(!showEditApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showEditApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            {/* Custom Base URL */}
            {editProviderType === "custom" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Custom Base URL</Label>
                <Input
                  value={editBaseUrl}
                  onChange={(e) => setEditBaseUrl(e.target.value)}
                  className="h-8 text-xs font-mono bg-secondary/40 border-border/80"
                />
              </div>
            )}

            {/* Priority & Max Results */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Priority</Label>
                <Input
                  type="number"
                  value={editPriority}
                  onChange={(e) => setEditPriority(parseInt(e.target.value) || 0)}
                  className="h-8 text-xs bg-secondary/40 border-border/80"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Results per Query</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={editMaxResults}
                  onChange={(e) => setEditMaxResults(parseInt(e.target.value) || 5)}
                  className="h-8 text-xs bg-secondary/40 border-border/80"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="text-xs bg-secondary/40 border-border/80 resize-none h-16"
              />
            </div>

            {/* Active Toggle in Edit Modal */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border/60">
              <span className="text-xs font-medium">Enable this Provider</span>
              <Switch checked={editActive} onCheckedChange={setEditActive} />
            </div>

            {/* Test Connection Button */}
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={modalTestStatus?.loading || !editApiKey.trim()}
                onClick={() => handleModalTest(false)}
                className="w-full h-8 text-xs border-border/80"
              >
                {modalTestStatus?.loading ? (
                  <>
                    <Loader2 className="size-3 mr-1.5 animate-spin" />
                    Testing API Key...
                  </>
                ) : (
                  <>
                    <Zap className="size-3 mr-1.5 text-amber-400" />
                    Test Connection
                  </>
                )}
              </Button>

              {modalTestStatus && !modalTestStatus.loading && (
                <p
                  className={`mt-1.5 text-[11px] font-mono ${
                    modalTestStatus.success ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {modalTestStatus.message || modalTestStatus.error}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingProvider(null)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={savingEdit || !editName.trim()}
              onClick={handleSaveEdit}
              className="h-8 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90"
            >
              {savingEdit ? (
                <>
                  <Loader2 className="size-3 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* DELETE CONFIRMATION MODAL                                          */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={Boolean(deletingProvider)} onOpenChange={(open) => !open && setDeletingProvider(null)}>
        <DialogContent className="sm:max-w-sm bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="size-4" />
              Delete Search Provider
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to remove <strong>{deletingProvider?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingProvider(null)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={handleDelete}
              className="h-8 text-xs font-semibold"
            >
              {isDeleting ? "Deleting..." : "Delete Provider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
