"use client";

import {
  Code,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
  File,
  Terminal,
  Database,
  Cpu,
  Coffee,
} from "lucide-react";

/**
 * Returns Monaco language ID based on file path or extension.
 */
export function getLanguageFromPath(path: string): string {
  const clean = path.split("/").pop() || path;
  if (clean.toLowerCase() === "dockerfile") return "dockerfile";

  const ext = clean.split(".").pop()?.toLowerCase();
  switch (ext) {
    // Python
    case "py":
    case "pyw":
    case "ipynb":
      return "python";

    // C / C++
    case "cpp":
    case "cc":
    case "cxx":
    case "hpp":
    case "hxx":
      return "cpp";
    case "c":
    case "h":
      return "c";

    // C#
    case "cs":
      return "csharp";

    // Java
    case "java":
    case "jar":
      return "java";

    // Go
    case "go":
      return "go";

    // Rust
    case "rs":
      return "rust";

    // Web & JS
    case "html":
    case "htm":
      return "html";
    case "css":
    case "scss":
    case "less":
      return "css";
    case "js":
    case "mjs":
    case "cjs":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "json":
      return "json";

    // Scripting & Systems
    case "sh":
    case "bash":
    case "zsh":
      return "shell";
    case "php":
      return "php";
    case "rb":
      return "ruby";
    case "sql":
      return "sql";
    case "yml":
    case "yaml":
      return "yaml";
    case "xml":
    case "svg":
      return "xml";
    case "md":
    case "markdown":
      return "markdown";

    default:
      return "plaintext";
  }
}

export function FileIcon({
  path,
  className = "size-4",
}: {
  path: string;
  className?: string;
}) {
  const clean = path.split("/").pop() || path;
  if (clean.toLowerCase() === "dockerfile") {
    return <Terminal className={`${className} text-cyan-500 shrink-0`} aria-hidden="true" />;
  }

  const ext = clean.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "py":
    case "pyw":
      return <Code className={`${className} text-blue-400 dark:text-blue-300 shrink-0`} aria-hidden="true" />;

    case "cpp":
    case "cc":
    case "cxx":
    case "hpp":
      return <Cpu className={`${className} text-indigo-400 dark:text-indigo-300 shrink-0`} aria-hidden="true" />;

    case "c":
    case "h":
      return <Cpu className={`${className} text-slate-400 shrink-0`} aria-hidden="true" />;

    case "cs":
      return <Code className={`${className} text-purple-400 shrink-0`} aria-hidden="true" />;

    case "java":
      return <Coffee className={`${className} text-amber-600 dark:text-amber-500 shrink-0`} aria-hidden="true" />;

    case "go":
      return <Code className={`${className} text-cyan-400 shrink-0`} aria-hidden="true" />;

    case "rs":
      return <Code className={`${className} text-orange-400 shrink-0`} aria-hidden="true" />;

    case "html":
    case "htm":
      return (
        <FileCode2
          className={`${className} text-amber-500 dark:text-amber-400 shrink-0`}
          aria-hidden="true"
        />
      );

    case "css":
    case "scss":
      return (
        <FileSpreadsheet
          className={`${className} text-sky-500 dark:text-sky-400 shrink-0`}
          aria-hidden="true"
        />
      );

    case "js":
    case "mjs":
    case "cjs":
    case "jsx":
      return (
        <Code
          className={`${className} text-yellow-500 dark:text-yellow-400 shrink-0`}
          aria-hidden="true"
        />
      );

    case "ts":
    case "tsx":
      return (
        <Code
          className={`${className} text-blue-500 dark:text-blue-400 shrink-0`}
          aria-hidden="true"
        />
      );

    case "json":
      return (
        <FileJson
          className={`${className} text-emerald-500 dark:text-emerald-400 shrink-0`}
          aria-hidden="true"
        />
      );

    case "sh":
    case "bash":
      return <Terminal className={`${className} text-emerald-400 shrink-0`} aria-hidden="true" />;

    case "sql":
      return <Database className={`${className} text-pink-400 shrink-0`} aria-hidden="true" />;

    case "md":
    case "markdown":
      return (
        <FileText
          className={`${className} text-purple-500 dark:text-purple-400 shrink-0`}
          aria-hidden="true"
        />
      );

    default:
      return (
        <File
          className={`${className} text-muted-foreground shrink-0`}
          aria-hidden="true"
        />
      );
  }
}
