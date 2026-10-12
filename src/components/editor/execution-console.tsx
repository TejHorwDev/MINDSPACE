"use client";

import { useState } from "react";
import {
  Terminal,
  Play,
  RotateCw,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CodeRunResult } from "@/lib/piston";

type ExecutionConsoleProps = {
  isOpen: boolean;
  isRunning: boolean;
  result: CodeRunResult | null;
  activeFilePath: string;
  onRun: (stdin?: string) => void;
  onClose: () => void;
  onClear: () => void;
};

export function ExecutionConsole({
  isOpen,
  isRunning,
  result,
  activeFilePath,
  onRun,
  onClose,
  onClear,
}: ExecutionConsoleProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [stdinInput, setStdinInput] = useState("");

  if (!isOpen) return null;

  const handleSendStdin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRunning) return;
    onRun(stdinInput);
  };

  const getStatusBadge = () => {
    if (isRunning) {
      return (
        <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">
          <RotateCw className="size-3 animate-spin" />
          Running...
        </span>
      );
    }
    if (!result) {
      return (
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          Ready
        </span>
      );
    }
    if (result.status === "success") {
      return (
        <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
          <CheckCircle2 className="size-3" />
          Exited ({result.run.code})
        </span>
      );
    }
    if (result.status === "timeout") {
      return (
        <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20">
          <Clock className="size-3" />
          Timeout (10s limit)
        </span>
      );
    }
    if (result.status === "compilation_error") {
      return (
        <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive ring-1 ring-inset ring-destructive/20">
          <AlertCircle className="size-3" />
          Compilation Error
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive ring-1 ring-inset ring-destructive/20">
        <AlertCircle className="size-3" />
        Exit Code {result.run.code}
      </span>
    );
  };

  return (
    <div className="flex flex-col border-t border-border bg-[#0d1117] text-[#c9d1d9] transition-all">
      {/* Console Header Bar */}
      <div className="flex h-9 items-center justify-between border-b border-border/80 px-3 bg-[#161b22]">
        <div className="flex items-center gap-2 text-xs">
          <Terminal className="size-3.5 text-primary" />
          <span className="font-semibold text-foreground">Console Output</span>
          {activeFilePath && (
            <span className="hidden sm:inline font-mono text-[11px] text-muted-foreground">
              ({activeFilePath})
            </span>
          )}
          {getStatusBadge()}
          {result && (
            <span className="font-mono text-[11px] text-muted-foreground">
              {result.executionTimeMs}ms • {result.language} {result.version}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRun(stdinInput)}
            disabled={isRunning}
            title="Re-run code"
            className="size-6 text-muted-foreground hover:text-emerald-400"
          >
            <Play className="size-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            title="Clear output"
            className="size-6 text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="size-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expand console" : "Minimize console"}
            className="size-6 text-muted-foreground hover:text-foreground"
          >
            {isMinimized ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            title="Close console"
            className="size-6 text-muted-foreground hover:text-destructive"
          >
            <X className="size-3" />
          </Button>
        </div>
      </div>

      {/* Console Content */}
      {!isMinimized && (
        <div className="flex flex-col h-48 sm:h-56">
          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed select-text space-y-1">
            {isRunning && (
              <div className="flex items-center gap-2 text-blue-400">
                <RotateCw className="size-3.5 animate-spin" />
                <span>Executing program in isolated sandbox...</span>
              </div>
            )}

            {!isRunning && !result && (
              <div className="text-muted-foreground py-2 italic">
                Press "Run" to execute this file in the sandboxed multi-language engine.
              </div>
            )}

            {result?.compile && result.compile.output && (
              <div className="rounded border border-amber-500/20 bg-amber-500/5 p-2 mb-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 mb-1">
                  Compiler Output:
                </div>
                <pre className="whitespace-pre-wrap text-amber-200">
                  {result.compile.output}
                </pre>
              </div>
            )}

            {result?.run.stdout && (
              <pre className="whitespace-pre-wrap text-emerald-300">
                {result.run.stdout}
              </pre>
            )}

            {result?.run.stderr && (
              <pre className="whitespace-pre-wrap text-rose-400">
                {result.run.stderr}
              </pre>
            )}

            {!isRunning && result && !result.run.stdout && !result.run.stderr && (
              <div className="text-muted-foreground italic">
                (Program finished with exit code {result.run.code} and produced no output)
              </div>
            )}
          </div>

          {/* Stdin Interactive Input Bar */}
          <form
            onSubmit={handleSendStdin}
            className="flex items-center gap-2 border-t border-border/60 bg-[#161b22] px-2.5 py-1.5"
          >
            <span className="font-mono text-[11px] text-muted-foreground shrink-0">
              stdin &gt;
            </span>
            <Input
              value={stdinInput}
              onChange={(e) => setStdinInput(e.target.value)}
              placeholder="Program input (arguments or stdin), press Run or Enter"
              className="h-6 text-xs font-mono bg-[#0d1117] border-border/80 text-foreground"
              disabled={isRunning}
            />
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              disabled={isRunning}
              className="h-6 px-2 text-[11px] gap-1"
            >
              <Send className="size-2.5" />
              Run with Input
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
