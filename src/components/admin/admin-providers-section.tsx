"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type AdminAiProvider = {
  id: string;
  name: string;
  modelKey: string;
  provider: string; // "google" | "groq" | "openai" | "nvidia" | "custom"
  baseUrl?: string | null;
  notes?: string | null;
  active: boolean;
  priority: number;
  apiKey?: string | null;
  inputCostPerMillion?: number;
  outputCostPerMillion?: number;
};

type TestStatus = {
  loading: boolean;
  success?: boolean;
  latencyMs?: number;
  error?: string;
  rawResponse?: string;
};

export function AdminProvidersSection({
  initialProviders,
}: {
  initialProviders: AdminAiProvider[];
}) {
  const [providers, setProviders] = useState<AdminAiProvider[]>(initialProviders);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [testStatuses, setTestStatuses] = useState<Record<string, TestStatus>>({});

  // Edit Provider Modal State
  const [editingProvider, setEditingProvider] = useState<AdminAiProvider | null>(null);
  const [editName, setEditName] = useState("");
  const [editProviderType, setEditProviderType] = useState("google");
  const [editBaseUrl, setEditBaseUrl] = useState("");
  const [editModelKey, setEditModelKey] = useState("");
  const [editApiKey, setEditApiKey] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPriority, setEditPriority] = useState(1);
  const [editActive, setEditActive] = useState(true);
  const [showEditApiKey, setShowEditApiKey] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [modalTestStatus, setModalTestStatus] = useState<TestStatus | null>(null);

  // Add Provider Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newProviderType, setNewProviderType] = useState("google");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [newModelKey, setNewModelKey] = useState("gemini-3.8-flash");
  const [newApiKey, setNewApiKey] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newPriority, setNewPriority] = useState(1);
  const [showNewApiKey, setShowNewApiKey] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [addModalTestStatus, setAddModalTestStatus] = useState<TestStatus | null>(null);

  const openEditModal = (p: AdminAiProvider) => {
    setEditingProvider(p);
    setEditName(p.name);
    setEditProviderType(p.provider);
    setEditBaseUrl(
      p.baseUrl ||
        (p.provider === "nvidia"
          ? "https://integrate.api.nvidia.com/v1"
          : p.provider === "groq"
          ? "https://api.groq.com/openai/v1"
          : p.provider === "openai"
          ? "https://api.openai.com/v1"
          : "")
    );
    setEditModelKey(p.modelKey);
    setEditApiKey(p.apiKey || "");
    setEditNotes(p.notes || "");
    setEditPriority(p.priority);
    setEditActive(p.active);
    setShowEditApiKey(false);
    setModalTestStatus(null);
  };

  const handleToggleActive = async (provider: AdminAiProvider) => {
    setTogglingId(provider.id);
    const newActive = !provider.active;

    try {
      const res = await fetch(`/api/admin/providers/${provider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newActive }),
      });

      if (!res.ok) throw new Error("Failed to update provider status");

      setProviders((prev) =>
        prev.map((p) => (p.id === provider.id ? { ...p, active: newActive } : p))
      );

      toast.success(
        `${provider.name} is now ${newActive ? "active" : "disabled"}.`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to toggle provider");
    } finally {
      setTogglingId(null);
    }
  };

  const handleTestConnection = async (provider: AdminAiProvider, customKey?: string) => {
    const keyToTest = customKey !== undefined ? customKey : provider.apiKey;

    setTestStatuses((prev) => ({
      ...prev,
      [provider.id]: { loading: true },
    }));

    try {
      const res = await fetch(`/api/admin/providers/${provider.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: keyToTest,
          baseUrl: provider.baseUrl,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTestStatuses((prev) => ({
          ...prev,
          [provider.id]: {
            loading: false,
            success: true,
            latencyMs: data.latencyMs,
            rawResponse: data.rawResponse,
          },
        }));
        toast.success(`Connected to ${provider.name}! Latency: ${data.latencyMs}ms`);
      } else {
        const errorMsg = data.error || data.message || "Connection failed";
        setTestStatuses((prev) => ({
          ...prev,
          [provider.id]: {
            loading: false,
            success: false,
            error: errorMsg,
          },
        }));
        toast.error(`Test failed for ${provider.name}: ${errorMsg}`);
      }
    } catch (err: any) {
      setTestStatuses((prev) => ({
        ...prev,
        [provider.id]: {
          loading: false,
          success: false,
          error: err.message || "Network test failed",
        },
      }));
      toast.error(`Network error testing ${provider.name}`);
    }
  };

  const handleModalTest = async (
    providerType: string,
    modelKey: string,
    apiKey: string,
    baseUrl?: string,
    providerId?: string
  ) => {
    if (!apiKey || apiKey.trim() === "") {
      toast.error("Please enter an API key to test.");
      return;
    }

    const setStatus = providerId ? setModalTestStatus : setAddModalTestStatus;
    setStatus({ loading: true });

    try {
      const endpoint = providerId
        ? `/api/admin/providers/${providerId}/test`
        : `/api/admin/providers/test`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: providerType,
          modelKey,
          apiKey: apiKey.trim(),
          baseUrl: baseUrl && baseUrl.trim() !== "" ? baseUrl.trim() : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus({
          loading: false,
          success: true,
          latencyMs: data.latencyMs,
          rawResponse: data.rawResponse,
        });
        toast.success(`Real connection verified! Latency: ${data.latencyMs}ms`);
      } else {
        const errorMsg = data.error || data.message || "Connection failed";
        setStatus({
          loading: false,
          success: false,
          error: errorMsg,
        });
        toast.error(`Test failed: ${errorMsg}`);
      }
    } catch (err: any) {
      setStatus({
        loading: false,
        success: false,
        error: err.message || "Network connection failed",
      });
      toast.error("Failed to connect to API endpoint");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProvider) return;
    setSavingEdit(true);

    try {
      const res = await fetch(`/api/admin/providers/${editingProvider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          provider: editProviderType,
          baseUrl: editBaseUrl.trim() || null,
          modelKey: editModelKey,
          apiKey: editApiKey.trim(),
          notes: editNotes.trim() || null,
          priority: Number(editPriority),
          active: editActive,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update provider");
      }

      const { provider: updated } = await res.json();

      setProviders((prev) =>
        prev
          .map((p) => (p.id === updated.id ? updated : p))
          .sort((a, b) => a.priority - b.priority)
      );

      toast.success(
        `${updated.name} updated successfully! Live AI calls will use this configuration immediately.`
      );
      setEditingProvider(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save provider");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveNew = async () => {
    if (!newName.trim() || !newModelKey.trim()) {
      toast.error("Name and Model Key are required.");
      return;
    }

    setSavingNew(true);
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          provider: newProviderType,
          baseUrl: newBaseUrl.trim() || null,
          modelKey: newModelKey.trim(),
          apiKey: newApiKey.trim() || null,
          notes: newNotes.trim() || null,
          priority: Number(newPriority),
          active: true,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add provider");
      }

      const { provider: created } = await res.json();

      setProviders((prev) =>
        [...prev, created].sort((a, b) => a.priority - b.priority)
      );

      toast.success(`Provider "${created.name}" created successfully!`);
      setIsAddOpen(false);
      setNewName("");
      setNewApiKey("");
      setAddModalTestStatus(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create provider");
    } finally {
      setSavingNew(false);
    }
  };

  const handleDeleteProvider = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/providers/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete provider");

      setProviders((prev) => prev.filter((p) => p.id !== id));
      toast.success(`Removed provider "${name}".`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete provider");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-indigo-500" />
            <h3 className="text-base font-bold text-foreground">
              AI Providers & Model Fleet
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure real API keys for Google Gemini, Groq, and OpenAI. All student AI Help requests execute real LLM calls against these providers.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setNewPriority(providers.length + 1);
            setIsAddOpen(true);
            setAddModalTestStatus(null);
          }}
          className="h-9 px-3.5 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold text-xs shadow-xs"
        >
          <Plus className="mr-1.5 size-3.5" />
          Add AI Model
        </Button>
      </div>

      {/* 2. Providers Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16 font-mono text-[11px]">Priority</TableHead>
              <TableHead className="font-mono text-[11px]">Model Name</TableHead>
              <TableHead className="font-mono text-[11px]">Engine</TableHead>
              <TableHead className="font-mono text-[11px]">Model Key</TableHead>
              <TableHead className="font-mono text-[11px]">API Key Status</TableHead>
              <TableHead className="font-mono text-[11px]">Status</TableHead>
              <TableHead className="text-right font-mono text-[11px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((p) => {
              const testStatus = testStatuses[p.id];
              const hasKey = Boolean(p.apiKey && p.apiKey.trim() !== "");

              return (
                <TableRow key={p.id} className="hover:bg-muted/20">
                  <TableCell className="font-mono text-xs font-bold text-foreground">
                    #{p.priority}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">{p.name}</span>
                      {p.priority === 1 && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                        >
                          Primary
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {p.provider === "nvidia" ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                        NVIDIA NIM
                      </span>
                    ) : p.provider === "custom" ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-cyan-400">
                        CUSTOM
                      </span>
                    ) : (
                      <span className="uppercase text-muted-foreground">{p.provider}</span>
                    )}
                    {p.notes && (
                      <div className="text-[10px] text-muted-foreground truncate max-w-[140px] font-sans" title={p.notes}>
                        {p.notes}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.modelKey}
                  </TableCell>
                  <TableCell>
                    {hasKey ? (
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                        <Key className="size-3" />
                        <span>Configured (••••{p.apiKey?.slice(-4)})</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-mono text-amber-400">
                        <AlertCircle className="size-3" />
                        <span>No API Key Set</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={p.active ? "default" : "secondary"}
                        className={`text-[10px] ${
                          p.active
                            ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {p.active ? "Active" : "Disabled"}
                      </Badge>
                      <Switch
                        checked={p.active}
                        disabled={togglingId === p.id}
                        onCheckedChange={() => handleToggleActive(p)}
                        className="scale-75"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {/* Test Connection Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={testStatus?.loading}
                        onClick={() => handleTestConnection(p)}
                        className="h-7 px-2.5 text-xs rounded-lg border-border/80 hover:bg-secondary flex items-center gap-1 font-mono"
                        title="Fire a real network ping to verify API key"
                      >
                        {testStatus?.loading ? (
                          <Loader2 className="size-3 animate-spin text-muted-foreground" />
                        ) : testStatus?.success ? (
                          <CheckCircle2 className="size-3 text-emerald-500" />
                        ) : testStatus?.error ? (
                          <AlertCircle className="size-3 text-rose-500" />
                        ) : (
                          <Zap className="size-3 text-indigo-400" />
                        )}
                        <span>
                          {testStatus?.loading
                            ? "Testing..."
                            : testStatus?.success
                            ? `${testStatus.latencyMs}ms`
                            : testStatus?.error
                            ? "Failed"
                            : "Test Ping"}
                        </span>
                      </Button>

                      {/* Configure / Edit Button */}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEditModal(p)}
                        className="h-7 px-2.5 text-xs rounded-lg flex items-center gap-1"
                        title="Configure API Key and Model"
                      >
                        <Settings2 className="size-3" />
                        <span>Configure</span>
                      </Button>

                      {/* Delete Custom Provider Button */}
                      {providers.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteProvider(p.id, p.name)}
                          className="size-7 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                          title="Delete provider"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* 3. Configure / Edit Provider Modal */}
      {editingProvider && (
        <Dialog open={Boolean(editingProvider)} onOpenChange={(open) => !open && setEditingProvider(null)}>
          <DialogContent className="sm:max-w-md bg-card border-border/80">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Settings2 className="size-4 text-indigo-500" />
                Configure {editingProvider.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update the API key and model properties. Changes take effect instantly for all student AI Help requests.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Display Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Gemini Flash"
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Provider Engine</label>
                  <select
                    value={editProviderType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setEditProviderType(newType);
                      if (newType === "nvidia" && !editBaseUrl) {
                        setEditBaseUrl("https://integrate.api.nvidia.com/v1");
                        setEditModelKey("meta/llama-3.3-70b-instruct");
                      }
                    }}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="google">Google Gemini</option>
                    <option value="groq">Groq Cloud</option>
                    <option value="openai">OpenAI</option>
                    <option value="nvidia">NVIDIA NIM (build.nvidia.com)</option>
                    <option value="custom">Custom OpenAI-Compatible</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Priority (Fallback Order)</label>
                  <Input
                    type="number"
                    min={1}
                    value={editPriority}
                    onChange={(e) => setEditPriority(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* API Base URL for generic OpenAI-compatible providers */}
              {editProviderType !== "google" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">API Base URL</label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {editProviderType === "nvidia"
                        ? "https://integrate.api.nvidia.com/v1"
                        : editProviderType === "groq"
                        ? "https://api.groq.com/openai/v1"
                        : "e.g. https://api.openai.com/v1"}
                    </span>
                  </div>
                  <Input
                    value={editBaseUrl}
                    onChange={(e) => setEditBaseUrl(e.target.value)}
                    placeholder={
                      editProviderType === "nvidia"
                        ? "https://integrate.api.nvidia.com/v1"
                        : "https://api.openai.com/v1"
                    }
                    className="h-9 text-xs font-mono"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Model Identifier (Key)</label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {editProviderType === "nvidia"
                      ? "Recommended: meta/llama-3.2-90b-vision-instruct"
                      : editProviderType === "groq"
                      ? "Recommended: qwen/qwen3.8-27b"
                      : editProviderType === "google"
                      ? "Recommended: gemini-3.8-flash"
                      : "Recommended: gpt-4o-mini"}
                  </span>
                </div>
                <Input
                  value={editModelKey}
                  onChange={(e) => setEditModelKey(e.target.value)}
                  placeholder="meta/llama-3.3-70b-instruct, gemini-3.8-flash, gpt-4o-mini"
                  className="h-9 text-xs font-mono"
                />

                {/* Quick Model Selector Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-muted-foreground font-medium">Quick Pick:</span>
                  {editProviderType === "nvidia" && (
                    <>
                      {[
                        { label: "meta/llama-3.2-90b-vision-instruct (Recommended)", key: "meta/llama-3.2-90b-vision-instruct" },
                        { label: "meta/llama-3.2-11b-vision-instruct", key: "meta/llama-3.2-11b-vision-instruct" },
                        { label: "mistralai/mistral-large-2-instruct", key: "mistralai/mistral-large-2-instruct" },
                        { label: "mistralai/codestral-22b-instruct-v0.1 (Code)", key: "mistralai/codestral-22b-instruct-v0.1" },
                        { label: "deepseek-ai/deepseek-v4.1-flash (Fast)", key: "deepseek-ai/deepseek-v4.1-flash" },
                      ].map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setEditModelKey(m.key)}
                          className={`px-2 py-0.5 text-[10px] rounded-md border font-mono transition-all ${
                            editModelKey === m.key
                              ? "bg-emerald-500 text-black border-emerald-400 font-bold"
                              : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </>
                  )}
                  {editProviderType === "groq" && (
                    <>
                      {[
                        { label: "qwen/qwen3.8-27b (Fast / Recommended)", key: "qwen/qwen3.8-27b" },
                        { label: "openai/gpt-oss-120b (Flagship Reasoning)", key: "openai/gpt-oss-120b" },
                        { label: "openai/gpt-oss-20b (Lightweight)", key: "openai/gpt-oss-20b" },
                      ].map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setEditModelKey(m.key)}
                          className={`px-2 py-0.5 text-[10px] rounded-md border font-mono transition-all ${
                            editModelKey === m.key
                              ? "bg-foreground text-background border-foreground font-bold"
                              : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </>
                  )}
                  {editProviderType === "google" && (
                    <>
                      {[
                        { label: "gemini-3.8-flash (Latest)", key: "gemini-3.8-flash" },
                        { label: "gemini-2.5-flash", key: "gemini-2.5-flash" },
                        { label: "gemini-1.5-flash", key: "gemini-1.5-flash" },
                      ].map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setEditModelKey(m.key)}
                          className={`px-2 py-0.5 text-[10px] rounded-md border font-mono transition-all ${
                            editModelKey === m.key
                              ? "bg-foreground text-background border-foreground font-bold"
                              : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </>
                  )}
                  {editProviderType === "openai" && (
                    <>
                      {[
                        { label: "gpt-4o-mini (Recommended)", key: "gpt-4o-mini" },
                        { label: "gpt-4o", key: "gpt-4o" },
                      ].map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setEditModelKey(m.key)}
                          className={`px-2 py-0.5 text-[10px] rounded-md border font-mono transition-all ${
                            editModelKey === m.key
                              ? "bg-foreground text-background border-foreground font-bold"
                              : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Admin Notes / Pricing Guidance */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Admin Notes & Pricing Guidance</label>
                <Input
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. NVIDIA NIM Free Tier (1,000 requests on build.nvidia.com)"
                  className="h-9 text-xs"
                />
              </div>

              {/* API Key Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Key className="size-3 text-indigo-400" />
                    Real API Key
                  </label>
                  {editApiKey && (
                    <button
                      type="button"
                      onClick={() => setEditApiKey("")}
                      className="text-[10px] text-muted-foreground hover:text-rose-400"
                    >
                      Clear Key
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Input
                    type={showEditApiKey ? "text" : "password"}
                    value={editApiKey}
                    onChange={(e) => {
                      setEditApiKey(e.target.value);
                      setModalTestStatus(null);
                    }}
                    placeholder={
                      editProviderType === "google"
                        ? "AIzaSy..."
                        : editProviderType === "groq"
                        ? "gsk_..."
                        : editProviderType === "nvidia"
                        ? "nvapi-..."
                        : "sk-..."
                    }
                    className="h-9 pr-20 text-xs font-mono"
                  />
                  <div className="absolute right-1 top-1 flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowEditApiKey(!showEditApiKey)}
                      className="size-7 text-muted-foreground hover:text-foreground"
                    >
                      {showEditApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </Button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Saved directly to database. Stored securely and never exposed to students.
                </p>
              </div>

              {/* Test Connection Button & Live Response Area */}
              <div className="rounded-xl border border-border/80 bg-secondary/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Real Network Verification</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={modalTestStatus?.loading || !editApiKey.trim()}
                    onClick={() =>
                      handleModalTest(
                        editProviderType,
                        editModelKey,
                        editApiKey,
                        editBaseUrl,
                        editingProvider.id
                      )
                    }
                    className="h-7 px-2.5 text-xs rounded-lg flex items-center gap-1.5"
                  >
                    {modalTestStatus?.loading ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Zap className="size-3 text-indigo-400" />
                    )}
                    <span>Test Connection</span>
                  </Button>
                </div>

                {modalTestStatus && (
                  <div
                    className={`rounded-lg p-2.5 text-xs ${
                      modalTestStatus.success
                        ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                    }`}
                  >
                    {modalTestStatus.success ? (
                      <div className="flex items-center gap-2">
                        <Check className="size-4 shrink-0 text-emerald-400" />
                        <div>
                          <div className="font-semibold">
                            Connected successfully ({modalTestStatus.latencyMs}ms)!
                          </div>
                          <div className="text-[10px] opacity-80 font-mono mt-0.5">
                            Real API response verified from {editingProvider.name}.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
                        <div className="space-y-1 w-full">
                          <div className="font-semibold">Connection Failed</div>
                          <div className="text-[11px] leading-relaxed break-words font-mono">
                            {modalTestStatus.error}
                          </div>
                          {editProviderType === "groq" &&
                            editModelKey !== "llama-3.1-8b-instant" &&
                            (modalTestStatus.error?.includes("llama-3.3") ||
                              modalTestStatus.error?.includes("does not exist") ||
                              modalTestStatus.error?.includes("do not have access")) && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setEditModelKey("llama-3.1-8b-instant");
                                handleModalTest(
                                  editProviderType,
                                  "llama-3.1-8b-instant",
                                  editApiKey,
                                  editingProvider.id
                                );
                              }}
                              className="mt-1 h-7 px-2.5 text-xs bg-rose-500/20 text-rose-200 border border-rose-500/40 hover:bg-rose-500/30 font-medium"
                            >
                              ⚡ Try: Switch to llama-3.1-8b-instant & Re-test
                            </Button>
                          )}
                          {editProviderType === "groq" &&
                            editModelKey === "llama-3.1-8b-instant" &&
                            (modalTestStatus.error?.includes("does not exist") ||
                              modalTestStatus.error?.includes("do not have access")) && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setEditModelKey("llama-3.3-70b-versatile");
                                handleModalTest(
                                  editProviderType,
                                  "llama-3.3-70b-versatile",
                                  editApiKey,
                                  editingProvider.id
                                );
                              }}
                              className="mt-1 h-7 px-2.5 text-xs bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 hover:bg-cyan-500/30 font-medium"
                            >
                              ⚡ Try: Switch to llama-3.3-70b-versatile & Re-test
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 border-t border-border/60 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingProvider(null)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="text-xs h-8 px-4 bg-foreground text-background hover:bg-foreground/90 font-semibold"
              >
                {savingEdit ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 4. Add New Provider Modal */}
      {isAddOpen && (
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-md bg-card border-border/80">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Plus className="size-4 text-indigo-500" />
                Add New AI Model
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Register a new model to the MINDSPACE fleet. Students will be able to select it from the editor chat panel.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Display Name</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Gemini 1.5 Pro, Llama 3.1 8B"
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Provider Engine</label>
                  <select
                    value={newProviderType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setNewProviderType(newType);
                      if (newType === "nvidia") {
                        setNewBaseUrl("https://integrate.api.nvidia.com/v1");
                        setNewModelKey("meta/llama-3.3-70b-instruct");
                        if (!newName) setNewName("Llama 3.3 70B (NVIDIA NIM)");
                      } else if (newType === "google") {
                        setNewModelKey("gemini-3.8-flash");
                        setNewBaseUrl("");
                      } else if (newType === "groq") {
                        setNewModelKey("llama-3.1-8b-instant");
                        setNewBaseUrl("https://api.groq.com/openai/v1");
                      } else {
                        setNewModelKey("gpt-4o-mini");
                        setNewBaseUrl("https://api.openai.com/v1");
                      }
                    }}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="google">Google Gemini</option>
                    <option value="groq">Groq Cloud</option>
                    <option value="openai">OpenAI</option>
                    <option value="nvidia">NVIDIA NIM (build.nvidia.com)</option>
                    <option value="custom">Custom OpenAI-Compatible</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Priority</label>
                  <Input
                    type="number"
                    min={1}
                    value={newPriority}
                    onChange={(e) => setNewPriority(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* API Base URL for generic OpenAI-compatible providers */}
              {newProviderType !== "google" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">API Base URL</label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {newProviderType === "nvidia"
                        ? "https://integrate.api.nvidia.com/v1"
                        : newProviderType === "groq"
                        ? "https://api.groq.com/openai/v1"
                        : "e.g. https://api.openai.com/v1"}
                    </span>
                  </div>
                  <Input
                    value={newBaseUrl}
                    onChange={(e) => setNewBaseUrl(e.target.value)}
                    placeholder={
                      newProviderType === "nvidia"
                        ? "https://integrate.api.nvidia.com/v1"
                        : "https://api.openai.com/v1"
                    }
                    className="h-9 text-xs font-mono"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Model Identifier (Key)</label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {newProviderType === "nvidia"
                      ? "Recommended: meta/llama-3.2-90b-vision-instruct"
                      : newProviderType === "groq"
                      ? "Recommended: qwen/qwen3.8-27b"
                      : newProviderType === "google"
                      ? "Recommended: gemini-3.8-flash"
                      : "Recommended: gpt-4o-mini"}
                  </span>
                </div>
                <Input
                  value={newModelKey}
                  onChange={(e) => setNewModelKey(e.target.value)}
                  placeholder="meta/llama-3.3-70b-instruct, gemini-3.8-flash, gpt-4o-mini"
                  className="h-9 text-xs font-mono"
                />

                {/* Quick Model Selector Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-muted-foreground font-medium">Quick Pick:</span>
                  {newProviderType === "nvidia" && (
                    <>
                      {[
                        { label: "meta/llama-3.2-90b-vision-instruct (Recommended)", key: "meta/llama-3.2-90b-vision-instruct" },
                        { label: "meta/llama-3.2-11b-vision-instruct", key: "meta/llama-3.2-11b-vision-instruct" },
                        { label: "mistralai/mistral-large-2-instruct", key: "mistralai/mistral-large-2-instruct" },
                        { label: "mistralai/codestral-22b-instruct-v0.1 (Code)", key: "mistralai/codestral-22b-instruct-v0.1" },
                        { label: "deepseek-ai/deepseek-v4.1-flash (Fast)", key: "deepseek-ai/deepseek-v4.1-flash" },
                      ].map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setNewModelKey(m.key)}
                          className={`px-2 py-0.5 text-[10px] rounded-md border font-mono transition-all ${
                            newModelKey === m.key
                              ? "bg-emerald-500 text-black border-emerald-400 font-bold"
                              : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </>
                  )}
                  {newProviderType === "groq" && (
                    <>
                      {[
                        { label: "qwen/qwen3.8-27b (Fast / Recommended)", key: "qwen/qwen3.8-27b" },
                        { label: "openai/gpt-oss-120b (Flagship Reasoning)", key: "openai/gpt-oss-120b" },
                        { label: "openai/gpt-oss-20b (Lightweight)", key: "openai/gpt-oss-20b" },
                      ].map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setNewModelKey(m.key)}
                          className={`px-2 py-0.5 text-[10px] rounded-md border font-mono transition-all ${
                            newModelKey === m.key
                              ? "bg-foreground text-background border-foreground font-bold"
                              : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </>
                  )}
                  {newProviderType === "google" && (
                    <>
                      {[
                        { label: "gemini-3.8-flash (Latest)", key: "gemini-3.8-flash" },
                        { label: "gemini-2.5-flash", key: "gemini-2.5-flash" },
                        { label: "gemini-1.5-flash", key: "gemini-1.5-flash" },
                      ].map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setNewModelKey(m.key)}
                          className={`px-2 py-0.5 text-[10px] rounded-md border font-mono transition-all ${
                            newModelKey === m.key
                              ? "bg-foreground text-background border-foreground font-bold"
                              : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </>
                  )}
                  {newProviderType === "openai" && (
                    <>
                      {[
                        { label: "gpt-4o-mini (Recommended)", key: "gpt-4o-mini" },
                        { label: "gpt-4o", key: "gpt-4o" },
                      ].map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setNewModelKey(m.key)}
                          className={`px-2 py-0.5 text-[10px] rounded-md border font-mono transition-all ${
                            newModelKey === m.key
                              ? "bg-foreground text-background border-foreground font-bold"
                              : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Admin Notes / Pricing Guidance */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Admin Notes & Pricing Guidance</label>
                <Input
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. NVIDIA NIM Free Tier (1,000 requests on build.nvidia.com)"
                  className="h-9 text-xs"
                />
              </div>

              {/* API Key Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Key className="size-3 text-indigo-400" />
                  API Key
                </label>
                <div className="relative">
                  <Input
                    type={showNewApiKey ? "text" : "password"}
                    value={newApiKey}
                    onChange={(e) => {
                      setNewApiKey(e.target.value);
                      setAddModalTestStatus(null);
                    }}
                    placeholder={
                      newProviderType === "google"
                        ? "AIzaSy..."
                        : newProviderType === "groq"
                        ? "gsk_..."
                        : newProviderType === "nvidia"
                        ? "nvapi-..."
                        : "sk-..."
                    }
                    className="h-9 pr-20 text-xs font-mono"
                  />
                  <div className="absolute right-1 top-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowNewApiKey(!showNewApiKey)}
                      className="size-7 text-muted-foreground hover:text-foreground"
                    >
                      {showNewApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Test Connection Button & Live Response Area */}
              <div className="rounded-xl border border-border/80 bg-secondary/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Verify Before Adding</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={addModalTestStatus?.loading || !newApiKey.trim()}
                    onClick={() =>
                      handleModalTest(
                        newProviderType,
                        newModelKey,
                        newApiKey,
                        newBaseUrl
                      )
                    }
                    className="h-7 px-2.5 text-xs rounded-lg flex items-center gap-1.5"
                  >
                    {addModalTestStatus?.loading ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Zap className="size-3 text-indigo-400" />
                    )}
                    <span>Test Connection</span>
                  </Button>
                </div>

                {addModalTestStatus && (
                  <div
                    className={`rounded-lg p-2.5 text-xs ${
                      addModalTestStatus.success
                        ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                    }`}
                  >
                    {addModalTestStatus.success ? (
                      <div className="flex items-center gap-2">
                        <Check className="size-4 shrink-0 text-emerald-400" />
                        <div>
                          <div className="font-semibold">
                            Connected successfully ({addModalTestStatus.latencyMs}ms)!
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
                        <div className="space-y-1 w-full">
                          <div className="font-semibold">Connection Failed</div>
                          <div className="text-[11px] leading-relaxed break-words font-mono">
                            {addModalTestStatus.error}
                          </div>
                          {newProviderType === "groq" &&
                            newModelKey !== "llama-3.1-8b-instant" &&
                            (addModalTestStatus.error?.includes("llama-3.3") ||
                              addModalTestStatus.error?.includes("does not exist") ||
                              addModalTestStatus.error?.includes("do not have access")) && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setNewModelKey("llama-3.1-8b-instant");
                                handleModalTest(newProviderType, "llama-3.1-8b-instant", newApiKey);
                              }}
                              className="mt-1 h-7 px-2.5 text-xs bg-rose-500/20 text-rose-200 border border-rose-500/40 hover:bg-rose-500/30 font-medium"
                            >
                              ⚡ Try: Switch to llama-3.1-8b-instant & Re-test
                            </Button>
                          )}
                          {newProviderType === "groq" &&
                            newModelKey === "llama-3.1-8b-instant" &&
                            (addModalTestStatus.error?.includes("does not exist") ||
                              addModalTestStatus.error?.includes("do not have access")) && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setNewModelKey("llama-3.3-70b-versatile");
                                handleModalTest(newProviderType, "llama-3.3-70b-versatile", newApiKey);
                              }}
                              className="mt-1 h-7 px-2.5 text-xs bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 hover:bg-cyan-500/30 font-medium"
                            >
                              ⚡ Try: Switch to llama-3.3-70b-versatile & Re-test
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 border-t border-border/60 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddOpen(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveNew}
                disabled={savingNew || !newName.trim()}
                className="text-xs h-8 px-4 bg-foreground text-background hover:bg-foreground/90 font-semibold"
              >
                {savingNew ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Add Provider"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
