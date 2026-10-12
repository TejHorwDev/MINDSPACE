"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import {
  Settings,
  Sparkles,
  Key,
  Shield,
  Palette,
  Sliders,
  Check,
  Loader2,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Zap,
  Info,
  Server,
  AlertTriangle,
  Plus,
  Radio,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SafeUserSettings } from "@/lib/user-settings";

const MONACO_THEMES = [
  { id: "vs-dark", name: "VS Dark (Default)", desc: "Classic Visual Studio Dark theme" },
  { id: "vs", name: "VS Light", desc: "Clean modern Light theme" },
  { id: "hc-black", name: "High Contrast Dark", desc: "Pure black contrast with vivid accents" },
  { id: "hc-light", name: "High Contrast Light", desc: "Maximum readability light theme" },
];

export function UserSettingsView() {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SafeUserSettings | null>(null);
  const [activeSection, setActiveSection] = useState<"appearance" | "editor" | "ai" | "keys" | "mcp" | "account">("appearance");
  const [userPlanInfo, setUserPlanInfo] = useState<any>(null);
  const [upgradingPlan, setUpgradingPlan] = useState(false);

  // Form states
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const [tabSize, setTabSize] = useState(2);
  const [wordWrap, setWordWrap] = useState(true);
  const [minimap, setMinimap] = useState(false);
  const [aiAutoApprove, setAiAutoApprove] = useState(false);
  const [aiDefaultModelId, setAiDefaultModelId] = useState<string>("auto");

  // BYOK input states (only used when user wants to enter/replace a key)
  const [googleKeyInput, setGoogleKeyInput] = useState("");
  const [groqKeyInput, setGroqKeyInput] = useState("");
  const [openaiKeyInput, setOpenaiKeyInput] = useState("");
  const [nvidiaKeyInput, setNvidiaKeyInput] = useState("");

  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showNvidiaKey, setShowNvidiaKey] = useState(false);

  // MCP Servers state
  const [mcpServers, setMcpServers] = useState<any[]>([]);
  const [mcpLoading, setMcpLoading] = useState(false);
  const [mcpPlatformEnabled, setMcpPlatformEnabled] = useState(true);
  const [showAddMcpModal, setShowAddMcpModal] = useState(false);
  const [showTrustWarningModal, setShowTrustWarningModal] = useState(false);
  const [newMcpName, setNewMcpName] = useState("");
  const [newMcpUrl, setNewMcpUrl] = useState("");
  const [newMcpToken, setNewMcpToken] = useState("");
  const [addingMcp, setAddingMcp] = useState(false);

  // Danger zone: Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const loadMcpServers = async () => {
    try {
      setMcpLoading(true);
      const res = await fetch("/api/user/mcp-servers");
      if (res.ok) {
        const data = await res.json();
        setMcpServers(data.servers || []);
        setMcpPlatformEnabled(data.enabledPlatformWide ?? true);
      }
    } catch (err) {
      console.error("Failed to load MCP servers:", err);
    } finally {
      setMcpLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          const s = data.settings as SafeUserSettings;
          setSettings(s);
          setEditorTheme(s.editorTheme || "vs-dark");
          setFontSize(s.fontSize || 14);
          setTabSize(s.tabSize || 2);
          setWordWrap(s.wordWrap ?? true);
          setMinimap(s.minimap ?? false);
          setAiAutoApprove(s.aiAutoApprove ?? false);
          setAiDefaultModelId(s.aiDefaultModelId || "auto");
        }
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
        toast.error("Failed to load user settings");
      })
      .finally(() => setLoading(false));

    loadMcpServers();

    fetch("/api/user/plan")
      .then((r) => r.json())
      .then((d) => {
        if (d.currentPlan) setUserPlanInfo(d);
      })
      .catch(() => {});
  }, []);

  const handleUpgradePlan = async (targetPlanName: string) => {
    setUpgradingPlan(true);
    try {
      const res = await fetch("/api/user/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlanName }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Switched to ${targetPlanName} tier!`);
        const updated = await fetch("/api/user/plan").then((r) => r.json());
        if (updated.currentPlan) setUserPlanInfo(updated);
      } else {
        toast.error(data.error || "Failed to switch tier");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setUpgradingPlan(false);
    }
  };

  const handleSavePreferences = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);

    const payload: any = {
      editorTheme,
      fontSize,
      tabSize,
      wordWrap,
      minimap,
      aiAutoApprove,
      aiDefaultModelId: aiDefaultModelId === "auto" ? null : aiDefaultModelId,
    };

    if (googleKeyInput.trim()) payload.byokGoogleKey = googleKeyInput.trim();
    if (groqKeyInput.trim()) payload.byokGroqKey = groqKeyInput.trim();
    if (openaiKeyInput.trim()) payload.byokOpenaiKey = openaiKeyInput.trim();
    if (nvidiaKeyInput.trim()) payload.byokNvidiaKey = nvidiaKeyInput.trim();

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update settings");

      setSettings(data.settings);
      setGoogleKeyInput("");
      setGroqKeyInput("");
      setOpenaiKeyInput("");
      setNvidiaKeyInput("");

      toast.success("Settings saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async (provider: "google" | "groq" | "openai" | "nvidia") => {
    if (!confirm(`Are you sure you want to remove your personal ${provider.toUpperCase()} key?`)) {
      return;
    }

    const payload: any = {};
    if (provider === "google") payload.byokGoogleKey = "";
    if (provider === "groq") payload.byokGroqKey = "";
    if (provider === "openai") payload.byokOpenaiKey = "";
    if (provider === "nvidia") payload.byokNvidiaKey = "";

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove key");

      setSettings(data.settings);
      toast.success(`Removed personal ${provider.toUpperCase()} key`);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove key");
    }
  };

  const handleToggleMcp = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/user/mcp-servers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive }),
      });
      if (res.ok) {
        setMcpServers((prev) =>
          prev.map((s) => (s.id === id ? { ...s, active: !currentActive } : s))
        );
        toast.success(`MCP server ${!currentActive ? "activated" : "deactivated"}`);
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to update MCP server");
      }
    } catch {
      toast.error("Failed to toggle MCP server");
    }
  };

  const handleDeleteMcp = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect MCP server "${name}"?`)) return;
    try {
      const res = await fetch(`/api/user/mcp-servers/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMcpServers((prev) => prev.filter((s) => s.id !== id));
        toast.success(`Removed MCP server "${name}"`);
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to remove MCP server");
      }
    } catch {
      toast.error("Failed to remove MCP server");
    }
  };

  const handleOpenAddMcp = () => {
    if (!settings?.hasSeenMcpTrustWarning) {
      setShowTrustWarningModal(true);
    } else {
      setShowAddMcpModal(true);
    }
  };

  const handleConfirmTrustWarning = async () => {
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasSeenMcpTrustWarning: true }),
      });
      if (settings) {
        setSettings({ ...settings, hasSeenMcpTrustWarning: true });
      }
    } catch {
      // Continue anyway
    }
    setShowTrustWarningModal(false);
    setShowAddMcpModal(true);
  };

  const handleSubmitNewMcp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMcpName.trim() || !newMcpUrl.trim()) {
      toast.error("Please provide both a name and endpoint URL.");
      return;
    }
    setAddingMcp(true);
    try {
      const res = await fetch("/api/user/mcp-servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMcpName.trim(),
          url: newMcpUrl.trim(),
          authToken: newMcpToken.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add MCP server");
      toast.success(`Connected MCP server "${newMcpName.trim()}"`);
      setShowAddMcpModal(false);
      setNewMcpName("");
      setNewMcpUrl("");
      setNewMcpToken("");
      loadMcpServers();
    } catch (err: any) {
      toast.error(err.message || "Failed to add MCP server");
    } finally {
      setAddingMcp(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim() && deleteConfirmation.trim() !== "DELETE") {
      toast.error("Please enter your password or type DELETE to confirm.");
      return;
    }
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: deletePassword.trim() || undefined,
          confirmation: deleteConfirmation.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete account");
      toast.success("Account permanently deleted. Signing out...");
      signOut({ callbackUrl: "/" });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Settings className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Editor & AI Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Customize your Monaco editor, AI pair-programming preferences, and Bring-Your-Own-Key credentials.
            </p>
          </div>
        </div>
      </div>
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border/80 pb-3 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSection("appearance")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSection === "appearance"
              ? "bg-foreground text-background shadow-xs font-bold"
              : "bg-secondary/60 text-muted-foreground hover:text-foreground border border-border/60"
          }`}
        >
          <Palette className="size-3.5 text-foreground/70" />
          <span>Appearance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("editor")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSection === "editor"
              ? "bg-foreground text-background shadow-xs font-bold"
              : "bg-secondary/60 text-muted-foreground hover:text-foreground border border-border/60"
          }`}
        >
          <Sliders className="size-3.5 text-foreground/70" />
          <span>Editor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("ai")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSection === "ai"
              ? "bg-foreground text-background shadow-xs font-bold"
              : "bg-secondary/60 text-muted-foreground hover:text-foreground border border-border/60"
          }`}
        >
          <Sparkles className="size-3.5 text-foreground/70" />
          <span>AI Preferences</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("keys")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSection === "keys"
              ? "bg-foreground text-background shadow-xs font-bold"
              : "bg-secondary/60 text-muted-foreground hover:text-foreground border border-border/60"
          }`}
        >
          <Key className="size-3.5 text-foreground/70" />
          <span>AI Keys (BYOK)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("mcp")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSection === "mcp"
              ? "bg-foreground text-background shadow-xs font-bold"
              : "bg-secondary/60 text-muted-foreground hover:text-foreground border border-border/60"
          }`}
        >
          <Server className="size-3.5 text-foreground/70" />
          <span>MCP Servers ({mcpServers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("account")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSection === "account"
              ? "bg-foreground text-background shadow-xs font-bold"
              : "bg-secondary/60 text-muted-foreground hover:text-foreground border border-border/60"
          }`}
        >
          <Shield className="size-3.5 text-foreground/70" />
          <span>Account & Quotas</span>
        </button>
      </div>

      <form onSubmit={handleSavePreferences} className="space-y-8">
        {activeSection === "appearance" && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-2 border-b border-border/80 pb-3">
              <Palette className="size-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Theme & Visuals</h2>
            </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Overall UI Theme */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Interface Theme</Label>
              <p className="text-xs text-muted-foreground">
                Color scheme for MINDSPACE platform and workspace chrome.
              </p>
              <div className="flex gap-2 pt-1">
                {(["light", "dark", "system"] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={theme === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme(t)}
                    className="capitalize text-xs h-8"
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            {/* Monaco Syntax Theme */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Monaco Syntax Theme</Label>
              <p className="text-xs text-muted-foreground">
                Code editing color palette inside Monaco Editor.
              </p>
              <select
                value={editorTheme}
                onChange={(e) => setEditorTheme(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:ring-1 focus:ring-primary shadow-xs"
              >
                {MONACO_THEMES.map((mt) => (
                  <option key={mt.id} value={mt.id}>
                    {mt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Code Editor Preferences */}
      {activeSection === "editor" && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-border/80 pb-3">
            <Sliders className="size-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Editor Preferences</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Font Size */}
            <div className="space-y-2">
              <Label htmlFor="font-size-input" className="text-sm font-medium">
                Font Size (px)
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="font-size-input"
                  type="number"
                  min={11}
                  max={24}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-24 text-sm"
                />
                <span className="text-xs text-muted-foreground">
                  Default is 14px (Recommended)
                </span>
              </div>
            </div>

            {/* Tab Size */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Indentation / Tab Size</Label>
              <div className="flex gap-2">
                {[2, 4].map((ts) => (
                  <Button
                    key={ts}
                    type="button"
                    variant={tabSize === ts ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTabSize(ts)}
                    className="text-xs h-8"
                  >
                    {ts} Spaces
                  </Button>
                ))}
              </div>
            </div>

            {/* Word Wrap */}
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/30 p-3.5">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium cursor-pointer">Word Wrap</Label>
                <p className="text-xs text-muted-foreground">
                  Wrap long code lines without requiring horizontal scrolling.
                </p>
              </div>
              <Switch checked={wordWrap} onCheckedChange={setWordWrap} />
            </div>

            {/* Minimap */}
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/30 p-3.5">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium cursor-pointer">Code Minimap</Label>
                <p className="text-xs text-muted-foreground">
                  Show code overview thumbnail on right edge of Monaco.
                </p>
              </div>
              <Switch checked={minimap} onCheckedChange={setMinimap} />
            </div>
          </div>
        </div>
      )}

      {/* Section 3: AI Preferences */}
      {activeSection === "ai" && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-border/80 pb-3">
            <Sparkles className="size-4 text-foreground/80" />
            <h2 className="text-base font-semibold text-foreground">AI Pair-Programmer</h2>
          </div>

          <div className="space-y-5">
            {/* Auto-Approve Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 p-4">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                  <Zap className="size-4 text-foreground/70" />
                  <span>Auto-Approve Code Proposals</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When enabled, AI code improvements and file creations will be applied immediately without requiring a manual review/diff approval step. Default is OFF.
                </p>
              </div>
              <Switch
                checked={aiAutoApprove}
                onCheckedChange={setAiAutoApprove}
              />
            </div>

            {/* Default Model */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Default Model</Label>
              <p className="text-xs text-muted-foreground">
                Your preferred AI model when opening new editor sessions.
              </p>
              <select
                value={aiDefaultModelId}
                onChange={(e) => setAiDefaultModelId(e.target.value)}
                className="w-full sm:w-80 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:ring-1 focus:ring-primary shadow-xs"
              >
                <option value="auto">Auto (Recommended with Fallback)</option>
                {settings?.hasGoogleKey && (
                  <option value="byok-google">My Gemini Key (BYOK)</option>
                )}
                {settings?.hasGroqKey && (
                  <option value="byok-groq">My Groq Key (BYOK)</option>
                )}
                {settings?.hasOpenaiKey && (
                  <option value="byok-openai">My OpenAI Key (BYOK)</option>
                )}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Bring-Your-Own-Key (BYOK) */}
      {activeSection === "keys" && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div className="flex items-center gap-2">
              <Key className="size-4 text-emerald-500" />
              <h2 className="text-base font-semibold text-foreground">
                Bring-Your-Own-Key (BYOK)
              </h2>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full ring-1 ring-inset ring-emerald-500/20">
              <Shield className="size-3" />
              <span>AES-256-GCM Encrypted</span>
            </div>
          </div>

          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 flex gap-3">
            <Info className="size-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Adding your own API key allows you to execute unlimited AI calls directly through your personal provider account. <strong className="text-foreground">Using your own key does NOT deduct from your daily $20.00 MINDSPACE credits</strong> — usage is recorded at $0.00 for your personal history.
            </p>
          </div>

          <div className="space-y-6">
            {/* Google Gemini Key */}
            <div className="rounded-xl border border-border/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Google Gemini API Key</h3>
                  <p className="text-xs text-muted-foreground">
                    Powers Gemini 2.0 Flash / 3.8 Flash pair-programming.
                  </p>
                </div>
                <Link
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  <span>Get Gemini Key</span>
                  <ExternalLink className="size-2.5" />
                </Link>
              </div>

              {settings?.hasGoogleKey ? (
                <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-500" />
                    <span className="font-mono text-muted-foreground">
                      Active: {settings.maskedGoogleKey}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveKey("google")}
                    className="h-6 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : null}

              <div className="relative">
                <Input
                  type={showGoogleKey ? "text" : "password"}
                  placeholder={
                    settings?.hasGoogleKey
                      ? "Enter new key to replace existing..."
                      : "Paste AIzaSy... key"
                  }
                  value={googleKeyInput}
                  onChange={(e) => setGoogleKeyInput(e.target.value)}
                  className="pr-10 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowGoogleKey(!showGoogleKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showGoogleKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            {/* Groq Key */}
            <div className="rounded-xl border border-border/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Groq Cloud API Key</h3>
                  <p className="text-xs text-muted-foreground">
                    Powers ultrafast Llama 3.3 70B Versatile execution.
                  </p>
                </div>
                <Link
                  href="https://console.groq.com/keys"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  <span>Get Groq Key</span>
                  <ExternalLink className="size-2.5" />
                </Link>
              </div>

              {settings?.hasGroqKey ? (
                <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-500" />
                    <span className="font-mono text-muted-foreground">
                      Active: {settings.maskedGroqKey}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveKey("groq")}
                    className="h-6 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : null}

              <div className="relative">
                <Input
                  type={showGroqKey ? "text" : "password"}
                  placeholder={
                    settings?.hasGroqKey
                      ? "Enter new key to replace existing..."
                      : "Paste gsk_... key"
                  }
                  value={groqKeyInput}
                  onChange={(e) => setGroqKeyInput(e.target.value)}
                  className="pr-10 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowGroqKey(!showGroqKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showGroqKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            {/* OpenAI Key */}
            <div className="rounded-xl border border-border/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">OpenAI API Key</h3>
                  <p className="text-xs text-muted-foreground">
                    Powers GPT-4o Mini code pair-programming.
                  </p>
                </div>
                <Link
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  <span>Get OpenAI Key</span>
                  <ExternalLink className="size-2.5" />
                </Link>
              </div>

              {settings?.hasOpenaiKey ? (
                <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-500" />
                    <span className="font-mono text-muted-foreground">
                      Active: {settings.maskedOpenaiKey}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveKey("openai")}
                    className="h-6 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : null}

              <div className="relative">
                <Input
                  type={showOpenaiKey ? "text" : "password"}
                  placeholder={
                    settings?.hasOpenaiKey
                      ? "Enter new key to replace existing..."
                      : "Paste sk-proj-... key"
                  }
                  value={openaiKeyInput}
                  onChange={(e) => setOpenaiKeyInput(e.target.value)}
                  className="pr-10 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showOpenaiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            {/* NVIDIA NIM Key */}
            <div className="rounded-xl border border-border/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">NVIDIA NIM API Key</h3>
                  <p className="text-xs text-muted-foreground">
                    Connect your personal NVIDIA NIM key (e.g. nvapi-...) for Llama 3.2 90B Vision.
                  </p>
                </div>
                <Link
                  href="https://build.nvidia.com"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500 hover:underline"
                >
                  <span>build.nvidia.com</span>
                  <ExternalLink className="size-2.5" />
                </Link>
              </div>

              {settings?.hasNvidiaKey ? (
                <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-500" />
                    <span className="font-mono text-muted-foreground">
                      Active: {settings.maskedNvidiaKey}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveKey("nvidia")}
                    className="h-6 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : null}

              <div className="relative">
                <Input
                  type={showNvidiaKey ? "text" : "password"}
                  placeholder={
                    settings?.hasNvidiaKey
                      ? "Enter new key to replace existing..."
                      : "Paste nvapi-... key from build.nvidia.com"
                  }
                  value={nvidiaKeyInput}
                  onChange={(e) => setNvidiaKeyInput(e.target.value)}
                  className="pr-10 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNvidiaKey(!showNvidiaKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNvidiaKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Actions (for Appearance, Editor & AI tabs) */}
      {(activeSection === "appearance" || activeSection === "editor" || activeSection === "ai") && (
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="submit"
          disabled={saving}
          className="px-6 gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="size-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    )}
  </form>

  {/* Section 4: Personal Model Context Protocol (MCP) Servers */}
  {activeSection === "mcp" && (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
            <Server className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Model Context Protocol (MCP) Servers
              </h2>
              <p className="text-xs text-muted-foreground">
                Connect external tool servers to expand your AI pair-programmer capabilities.
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenAddMcp}
            disabled={!mcpPlatformEnabled}
            className="h-9 px-3.5 rounded-xl gap-1.5 text-xs font-semibold"
          >
            <Plus className="size-3.5" />
            <span>Connect MCP Server</span>
          </Button>
        </div>

        {!mcpPlatformEnabled ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-start gap-3">
            <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-100">Personal MCP Servers Disabled</p>
              <p className="mt-0.5 text-amber-300/80">
                The platform administrator has temporarily disabled personal MCP servers platform-wide.
              </p>
            </div>
          </div>
        ) : null}

        {mcpLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : mcpServers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-8 text-center space-y-2">
            <Server className="size-8 text-muted-foreground mx-auto stroke-1" />
            <h3 className="text-sm font-semibold text-foreground">No MCP Servers Connected</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Bring your own Model Context Protocol server to allow AI Help to interact with private documentation, databases, or API tools.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {mcpServers.map((server) => (
              <div
                key={server.id}
                className="flex items-center justify-between rounded-xl border border-border/80 bg-secondary/30 p-4 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{server.name}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        server.active
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      <span className={`size-1.5 rounded-full ${server.active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                      {server.active ? "Active in AI Help" : "Paused"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                    <span>{server.url}</span>
                    {server.hasAuthToken && (
                      <span className="text-[11px] text-indigo-400">Auth Token: {server.maskedAuthToken}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={server.active}
                    onCheckedChange={() => handleToggleMcp(server.id, server.active)}
                    aria-label={`Toggle ${server.name}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteMcp(server.id, server.name)}
                    className="size-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* Section 4: Account Tier & Quotas + Danger Zone */}
    {activeSection === "account" && (
      <div className="space-y-6">
        {/* Account Plan & Quotas */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <Shield className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Subscription Tier & Quotas
                </h2>
                <p className="text-xs text-muted-foreground">
                  Your current account tier, resource allowances, and billing status.
                </p>
              </div>
            </div>
            <Link href="/credits">
              <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs font-semibold gap-1.5">
                <Zap className="size-3 text-amber-500" />
                <span>Manage Plans in Credits</span>
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border/80 bg-secondary/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Active Plan</span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase border ${
                    userPlanInfo?.currentPlan?.name === "Pro"
                      ? "bg-secondary text-foreground border-border"
                      : "bg-secondary/60 text-muted-foreground border-border/70"
                  }`}
                >
                  {userPlanInfo?.currentPlan?.name || "Free"}
                </span>
              </div>
              <div className="text-xl font-bold text-foreground">
                {userPlanInfo?.currentPlan?.name === "Pro" ? "Pro Plan" : "Free Plan"}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {userPlanInfo?.currentPlan?.name === "Pro"
                  ? "$50/day AI credits allowance + 50 projects"
                  : "$20/day AI credits allowance + 5 projects"}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-secondary/30 p-4 space-y-2">
              <span className="text-xs text-muted-foreground">Projects Quota</span>
              <div className="text-xl font-bold text-foreground">
                {userPlanInfo?.quotas?.projectCount ?? 0} / {userPlanInfo?.currentPlan?.maxProjects ?? 5}
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-1.5 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      ((userPlanInfo?.quotas?.projectCount ?? 0) /
                        (userPlanInfo?.currentPlan?.maxProjects ?? 5)) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-secondary/30 p-4 space-y-2">
              <span className="text-xs text-muted-foreground">Storage Allowance</span>
              <div className="text-xl font-bold text-foreground">
                {userPlanInfo?.quotas?.storageUsedMB ?? 0} MB /{" "}
                {userPlanInfo?.currentPlan?.maxStorageMB ?? 250} MB
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      ((userPlanInfo?.quotas?.storageUsedMB ?? 0) /
                        (userPlanInfo?.currentPlan?.maxStorageMB ?? 250)) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-secondary/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-foreground">
                Want higher quotas or premium AI allowance?
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Switch anytime between Free and Pro tiers with zero downtime.
              </p>
            </div>
            {userPlanInfo?.currentPlan?.name === "Pro" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={upgradingPlan}
                onClick={() => handleUpgradePlan("Free")}
                className="h-8 rounded-xl text-xs font-semibold"
              >
                Downgrade to Free
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={upgradingPlan}
                onClick={() => handleUpgradePlan("Pro")}
                className="h-8 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Sparkles className="size-3 mr-1" />
                Upgrade to Pro Tier
              </Button>
            )}
          </div>
        </div>

        {/* Danger Zone — Self-Service Account Deletion */}
        <div className="rounded-2xl border border-destructive/40 bg-destructive/[0.02] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-destructive/20 pb-4">
            <div className="flex size-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <UserX className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Danger Zone — Account Deletion
              </h2>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account, project files, published sites, and settings.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            <div>
              <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                Once deleted, your account cannot be recovered. All projects, code files, custom
                templates, and chat records will be permanently wiped.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="h-9 px-4 rounded-xl gap-2 font-semibold text-xs shrink-0"
            >
              <Trash2 className="size-3.5" />
              <span>Delete My Account</span>
            </Button>
          </div>
        </div>
      </div>
    )}

      {/* MCP ONE-TIME TRUST WARNING MODAL */}
      {showTrustWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-secondary text-foreground border border-border flex items-center justify-center shrink-0">
                <Info className="size-5 text-foreground/80" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">External Tool Connection Note</h3>
                <span className="text-[11px] text-muted-foreground font-mono">Model Context Protocol</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              You are connecting an external Model Context Protocol tool to your AI pair-programmer. Only connect servers you trust.
            </p>

            <div className="rounded-xl border border-border/70 bg-secondary/40 p-3.5 text-xs text-muted-foreground space-y-1.5">
              <span className="font-semibold text-foreground text-xs block">Security Protections Active:</span>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                <li>All tool calls are dispatched with strict execution timeouts.</li>
                <li>Private workspace credentials and DB keys are never sent to external servers.</li>
                <li>You can disconnect or pause any MCP server at any time.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTrustWarningModal(false)}
                className="h-9 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmTrustWarning}
                className="h-9 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold text-xs shadow-xs"
              >
                I Understand & Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MCP SERVER MODAL */}
      {showAddMcpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 text-foreground font-bold text-base">
                <Server className="size-4 text-indigo-500" />
                <span>Connect MCP Server</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMcpModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNewMcp} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="mcp-name" className="text-xs font-semibold">Server Name / Label</Label>
                <Input
                  id="mcp-name"
                  placeholder="e.g. Postgres DB Inspector or Docs MCP"
                  value={newMcpName}
                  onChange={(e) => setNewMcpName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mcp-url" className="text-xs font-semibold">Endpoint URL (HTTP / HTTPS)</Label>
                <Input
                  id="mcp-url"
                  placeholder="https://my-tools.example.com/mcp"
                  value={newMcpUrl}
                  onChange={(e) => setNewMcpUrl(e.target.value)}
                  required
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mcp-token" className="text-xs font-semibold">
                  Authorization Bearer Token <span className="text-muted-foreground font-normal">(Optional, encrypted at rest)</span>
                </Label>
                <Input
                  id="mcp-token"
                  type="password"
                  placeholder="Optional token..."
                  value={newMcpToken}
                  onChange={(e) => setNewMcpToken(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMcpModal(false)}
                  className="h-9 rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addingMcp}
                  size="sm"
                  className="h-9 rounded-xl text-xs font-semibold gap-1.5"
                >
                  {addingMcp ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5" />
                      Save Connection
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACCOUNT DELETION CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-destructive/50 bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-destructive">
              <div className="size-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                <UserX className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Confirm Account Deletion</h3>
                <span className="text-xs text-destructive font-medium">Permanent Action</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This action cannot be undone. To verify your intent, please enter your password OR type <span className="font-mono font-bold text-foreground">DELETE</span> below.
            </p>

            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs">Account Password (Optional if typing DELETE)</Label>
                <Input
                  type="password"
                  placeholder="Enter your current password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Type DELETE to confirm</Label>
                <Input
                  placeholder="Type DELETE"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                className="h-9 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deletingAccount || (!deletePassword.trim() && deleteConfirmation.trim() !== "DELETE")}
                onClick={handleDeleteAccount}
                className="h-9 rounded-xl text-xs font-bold gap-2"
              >
                {deletingAccount ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" />
                    Delete Forever
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

