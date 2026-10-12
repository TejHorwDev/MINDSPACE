"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Terminal as TerminalIcon,
  RotateCw,
  Trash2,
  X,
  Maximize2,
  Minimize2,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Import xterm styles
import "@xterm/xterm/css/xterm.css";

type TerminalPanelProps = {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
};

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "capacity";

export function TerminalPanel({ projectId, isOpen, onClose }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  // Send input to the server
  const sendInput = useCallback(
    async (data: string) => {
      try {
        await fetch(`/api/projects/${projectId}/terminal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "input", data }),
        });
      } catch (err) {
        console.error("Failed to send terminal input:", err);
      }
    },
    [projectId]
  );

  // Resize pty on backend
  const sendResize = useCallback(
    async (cols: number, rows: number) => {
      try {
        await fetch(`/api/projects/${projectId}/terminal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "resize", cols, rows }),
        });
      } catch (err) {
        // Ignore resize failure on disconnected sessions
      }
    },
    [projectId]
  );

  // Restart / reconnect terminal
  const restartSession = useCallback(async () => {
    setStatus("connecting");
    setErrorMessage(null);

    // Terminate existing session first
    try {
      await fetch(`/api/projects/${projectId}/terminal`, {
        method: "DELETE",
      });
    } catch {}

    if (termRef.current) {
      termRef.current.reset();
      termRef.current.writeln("\x1b[33m[Restarting terminal session...]\x1b[0m");
    }

    // Close existing event source
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    connectStream();
  }, [projectId]);

  // Connect to SSE stream
  const connectStream = useCallback(() => {
    if (!isOpen) return;

    setStatus("connecting");
    setErrorMessage(null);

    const es = new EventSource(`/api/projects/${projectId}/terminal`);
    eventSourceRef.current = es;

    es.addEventListener("output", (event) => {
      try {
        const text = JSON.parse(event.data);
        if (termRef.current) {
          termRef.current.write(text);
        }
        setStatus("connected");
      } catch (err) {
        console.error("Error parsing terminal output chunk:", err);
      }
    });

    es.onopen = () => {
      setStatus("connected");
      setErrorMessage(null);
    };

    es.onerror = (err) => {
      console.warn("Terminal SSE connection closed or failed:", err);
      es.close();

      // Check if it's a concurrency cap error by querying
      fetch(`/api/projects/${projectId}/terminal`)
        .then(async (res) => {
          if (res.status === 429) {
            const data = await res.json().catch(() => ({}));
            setStatus("capacity");
            setErrorMessage(data.error || "Terminal sessions are at capacity, try again shortly");
          } else {
            setStatus("disconnected");
          }
        })
        .catch(() => {
          setStatus("disconnected");
        });
    };
  }, [projectId, isOpen]);

  // Initialize xterm instance
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    let terminal: any = null;
    let fitAddon: any = null;

    async function initXterm() {
      if (termRef.current) return;

      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      const isDark = document.documentElement.classList.contains("dark");
      const darkTheme = {
        background: "#09090b",
        foreground: "#f4f4f5",
        cursor: "#fafafa",
        selectionBackground: "rgba(255, 255, 255, 0.2)",
        black: "#18181b",
        red: "#ef4444",
        green: "#10b981",
        yellow: "#f59e0b",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#fafafa",
        brightBlack: "#71717a",
        brightRed: "#f87171",
        brightGreen: "#34d399",
        brightYellow: "#fbbf24",
        brightBlue: "#60a5fa",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#ffffff",
      };
      const lightTheme = {
        background: "#fcfcfc",
        foreground: "#18181b",
        cursor: "#18181b",
        selectionBackground: "rgba(24, 24, 27, 0.15)",
        black: "#e4e4e7",
        red: "#dc2626",
        green: "#16a34a",
        yellow: "#d97706",
        blue: "#2563eb",
        magenta: "#9333ea",
        cyan: "#0891b2",
        white: "#18181b",
        brightBlack: "#a1a1aa",
        brightRed: "#ef4444",
        brightGreen: "#22c55e",
        brightYellow: "#f59e0b",
        brightBlue: "#3b82f6",
        brightMagenta: "#a855f7",
        brightCyan: "#06b6d4",
        brightWhite: "#09090b",
      };

      terminal = new Terminal({
        cursorBlink: true,
        cursorStyle: "bar",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: 13,
        lineHeight: 1.25,
        theme: isDark ? darkTheme : lightTheme,
        convertEol: true,
      });

      // Observe theme changes on html tag
      const observer = new MutationObserver(() => {
        if (termRef.current) {
          const darkNow = document.documentElement.classList.contains("dark");
          termRef.current.options.theme = darkNow ? darkTheme : lightTheme;
        }
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

      fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);

      if (containerRef.current) {
        terminal.open(containerRef.current);
        fitAddon.fit();
      }

      termRef.current = terminal;
      fitAddonRef.current = fitAddon;

      // Handle user key input
      terminal.onData((data: string) => {
        sendInput(data);
      });

      // Handle window resize
      const handleResize = () => {
        try {
          if (fitAddonRef.current && termRef.current) {
            fitAddonRef.current.fit();
            sendResize(termRef.current.cols, termRef.current.rows);
          }
        } catch {}
      };

      window.addEventListener("resize", handleResize);

      // Connect SSE
      connectStream();
    }

    initXterm();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
      }
    };
  }, [isOpen, connectStream, sendInput, sendResize]);

  // Refit on maximize toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (fitAddonRef.current && termRef.current) {
          fitAddonRef.current.fit();
          sendResize(termRef.current.cols, termRef.current.rows);
        }
      } catch {}
    }, 100);
    return () => clearTimeout(timer);
  }, [isMaximized, sendResize]);

  if (!isOpen) return null;

  return (
    <div
      className={`border-t border-border bg-background text-foreground flex flex-col transition-all z-20 ${
        isMaximized
          ? "fixed inset-0 z-50 h-screen"
          : "h-64 sm:h-72 w-full shrink-0"
      }`}
    >
      {/* Terminal Title Bar */}
      <div className="flex h-9 items-center justify-between border-b border-border/60 bg-secondary/30 px-3 select-none">
        <div className="flex items-center gap-2">
          <TerminalIcon className="size-3.5 text-cyan-400" />
          <span className="text-xs font-semibold text-foreground tracking-wide">
            Interactive Terminal
          </span>

          {/* Connection status badge */}
          <div className="flex items-center gap-1.5 ml-2">
            {status === "connected" && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            )}
            {status === "connecting" && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-400 border border-amber-500/20">
                <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
                Connecting...
              </span>
            )}
            {status === "capacity" && (
              <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-mono text-rose-400 border border-rose-500/20">
                <AlertTriangle className="size-2.5" />
                At Capacity
              </span>
            )}
            {status === "disconnected" && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground border border-border">
                Disconnected
              </span>
            )}
          </div>

          {/* Security badge */}
          <div className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground/80 font-mono ml-2">
            <ShieldCheck className="size-3 text-emerald-500" />
            <span>Sandboxed & Scrubbed</span>
          </div>

          <div className="hidden lg:flex items-center gap-1 text-[10px] text-muted-foreground/60 font-mono">
            <Clock className="size-3" />
            <span>10m Idle Timeout</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (termRef.current) termRef.current.clear();
            }}
            className="size-6 text-muted-foreground hover:text-foreground"
            title="Clear Terminal"
          >
            <Trash2 className="size-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={restartSession}
            className="size-6 text-muted-foreground hover:text-foreground"
            title="Restart Session"
          >
            <RotateCw className="size-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMaximized((prev) => !prev)}
            className="size-6 text-muted-foreground hover:text-foreground"
            title={isMaximized ? "Restore Panel" : "Maximize Terminal"}
          >
            {isMaximized ? (
              <Minimize2 className="size-3" />
            ) : (
              <Maximize2 className="size-3" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-6 text-muted-foreground hover:text-foreground"
            title="Close Terminal"
          >
            <X className="size-3" />
          </Button>
        </div>
      </div>

      {/* Capacity Warning Banner */}
      {status === "capacity" && (
        <div className="bg-rose-950/70 border-b border-rose-500/30 p-2 text-center text-xs text-rose-200 flex items-center justify-center gap-2">
          <AlertTriangle className="size-3.5 text-rose-400" />
          <span>
            {errorMessage || "Terminal sessions are at capacity, try again shortly"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={restartSession}
            className="h-5 text-[10px] px-2 bg-rose-900/50 border-rose-400/40 text-rose-100 hover:bg-rose-800"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Terminal Canvas Container */}
      <div
        ref={containerRef}
        className="flex-1 w-full overflow-hidden p-2 select-text"
        style={{ minHeight: "120px" }}
      />
    </div>
  );
}
