/**
 * MINDSPACE — Multi-Language Code Execution Sandbox Client (Piston Integration)
 *
 * Communicates with isolated Piston instance (ghcr.io/engineer-man/piston)
 * Enforces:
 *   - 10-second hard execution timeout
 *   - 64KB output limit with clean truncation
 *   - Multi-file compilation & execution support
 *   - Automatic language & runtime detection
 */

import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export const PISTON_DEFAULT_URL = "http://localhost:2000/api/v2";
export const EXECUTION_TIMEOUT_MS = 10000;
export const MAX_OUTPUT_BYTES = 65536;

export interface PistonFile {
  name: string;
  content: string;
}

export interface PistonExecuteOptions {
  language: string;
  files: PistonFile[];
  stdin?: string;
  args?: string[];
  version?: string;
}

export interface ExecutionStageResult {
  stdout: string;
  stderr: string;
  output: string;
  code: number;
  signal: string | null;
}

export interface CodeRunResult {
  language: string;
  version: string;
  status: "success" | "error" | "timeout" | "compilation_error";
  run: ExecutionStageResult;
  compile?: ExecutionStageResult;
  executionTimeMs: number;
  engine: "piston" | "local_fallback";
  truncated: boolean;
  rawError?: string;
}

// Canonical language identifiers supported by Piston
const EXTENSION_MAP: Record<string, string> = {
  // Python
  py: "python",
  python: "python",
  // C / C++
  cpp: "c++",
  "c++": "c++",
  cc: "c++",
  cxx: "c++",
  hpp: "c++",
  h: "c",
  c: "c",
  // C#
  cs: "csharp",
  csharp: "csharp",
  // Java
  java: "java",
  // JavaScript & TypeScript
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  // Modern Systems
  go: "go",
  rs: "rust",
  rust: "rust",
  // Scripting & others
  rb: "ruby",
  ruby: "ruby",
  php: "php",
  sh: "bash",
  bash: "bash",
  kt: "kotlin",
  swift: "swift",
  r: "r",
  lua: "lua",
  pl: "perl",
  scala: "scala",
  dart: "dart",
};

/**
 * Resolves a file extension or language name to the Piston language identifier.
 */
export function resolvePistonLanguage(input: string): string | null {
  const clean = input.toLowerCase().trim();
  const ext = clean.includes(".") ? clean.split(".").pop() || clean : clean;
  const noDot = ext.replace(/^\./, "");
  return EXTENSION_MAP[noDot] || EXTENSION_MAP[clean] || null;
}

/**
 * Detects whether a file extension is web-only (HTML, CSS) which belongs in Live Preview.
 */
export function isWebPreviewFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase().replace(/^\./, "");
  return ["html", "htm", "css", "svg"].includes(ext);
}

/**
 * Truncates text output if it exceeds MAX_OUTPUT_BYTES to prevent memory/UI hangs.
 */
function truncateOutput(text: string): { text: string; truncated: boolean } {
  if (!text) return { text: "", truncated: false };
  if (Buffer.byteLength(text, "utf8") <= MAX_OUTPUT_BYTES) {
    return { text, truncated: false };
  }
  const slice = text.slice(0, MAX_OUTPUT_BYTES);
  return {
    text: `${slice}\n\n[MINDSPACE — Output truncated at ${MAX_OUTPUT_BYTES / 1024}KB limit]`,
    truncated: true,
  };
}

/**
 * Executes code via self-hosted Piston sandbox API.
 */
export async function executeCodeWithPiston(
  options: PistonExecuteOptions
): Promise<CodeRunResult> {
  const startTime = Date.now();
  const pistonBaseUrl = (
    process.env.PISTON_API_URL || PISTON_DEFAULT_URL
  ).replace(/\/+$/, "");

  const payload = {
    language: options.language,
    version: options.version || "*",
    files: options.files.map((f, i) => ({
      name: f.name || `file_${i}`,
      content: f.content,
    })),
    stdin: options.stdin || "",
    args: options.args || [],
    compile_timeout: EXECUTION_TIMEOUT_MS,
    run_timeout: EXECUTION_TIMEOUT_MS,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS + 2000);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (process.env.PISTON_API_KEY) {
      headers["Authorization"] = process.env.PISTON_API_KEY;
    }

    const res = await fetch(`${pistonBaseUrl}/execute`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const executionTimeMs = Date.now() - startTime;

      const runRaw = data.run || { stdout: "", stderr: "", output: "", code: 0, signal: null };
      const compileRaw = data.compile;

      const truncRunOut = truncateOutput(runRaw.output || `${runRaw.stdout || ""}${runRaw.stderr || ""}`);
      const truncRunErr = truncateOutput(runRaw.stderr || "");
      const truncRunStd = truncateOutput(runRaw.stdout || "");

      let status: CodeRunResult["status"] = "success";
      if (compileRaw && compileRaw.code !== 0) {
        status = "compilation_error";
      } else if (runRaw.code !== 0 || runRaw.signal) {
        status = runRaw.signal === "SIGKILL" || runRaw.signal === "SIGXCPU" ? "timeout" : "error";
      }

      return {
        language: data.language || options.language,
        version: data.version || "sandbox",
        status,
        run: {
          stdout: truncRunStd.text,
          stderr: truncRunErr.text,
          output: truncRunOut.text,
          code: runRaw.code ?? 0,
          signal: runRaw.signal ?? null,
        },
        compile: compileRaw
          ? {
              stdout: compileRaw.stdout || "",
              stderr: compileRaw.stderr || "",
              output: compileRaw.output || "",
              code: compileRaw.code ?? 0,
              signal: compileRaw.signal ?? null,
            }
          : undefined,
        executionTimeMs,
        engine: "piston",
        truncated: truncRunOut.truncated || truncRunErr.truncated,
      };
    } else {
      const errorText = await res.text();
      return await handleFallbackOrError(options, startTime, `Piston HTTP ${res.status}: ${errorText}`);
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === "AbortError";
    const msg = isTimeout
      ? `Execution timed out after ${EXECUTION_TIMEOUT_MS / 1000} seconds.`
      : `Cannot connect to Piston API at ${pistonBaseUrl}: ${err?.message || err}`;

    return await handleFallbackOrError(options, startTime, msg, isTimeout);
  }
}

// Judge0 open cloud sandbox mapping
const JUDGE0_LANGUAGE_MAP: Record<string, { id: number; name: string; version: string }> = {
  python: { id: 100, name: "Python", version: "3.12.5" },
  "c++": { id: 105, name: "C++", version: "GCC 14.1.0" },
  c: { id: 103, name: "C", version: "GCC 14.1.0" },
  java: { id: 91, name: "Java", version: "JDK 17.0.6" },
  csharp: { id: 51, name: "C#", version: "Mono 6.6" },
  rust: { id: 108, name: "Rust", version: "1.85.0" },
  go: { id: 107, name: "Go", version: "1.23.5" },
  javascript: { id: 102, name: "JavaScript", version: "Node.js 22.8" },
  typescript: { id: 101, name: "TypeScript", version: "5.6.2" },
  ruby: { id: 72, name: "Ruby", version: "2.7.0" },
  php: { id: 98, name: "PHP", version: "8.3.11" },
  kotlin: { id: 111, name: "Kotlin", version: "2.1.10" },
  swift: { id: 83, name: "Swift", version: "5.2.3" },
  bash: { id: 46, name: "Bash", version: "5.0.0" },
  lua: { id: 64, name: "Lua", version: "5.3.5" },
  r: { id: 99, name: "R", version: "4.4.1" },
  sql: { id: 82, name: "SQLite", version: "3.27.2" },
};

/**
 * Executes code using the Judge0 cloud sandbox.
 */
async function executeWithJudge0(
  options: PistonExecuteOptions,
  startTime: number
): Promise<CodeRunResult> {
  const judge0Lang = JUDGE0_LANGUAGE_MAP[options.language];
  if (!judge0Lang) {
    throw new Error(`Cloud sandbox does not support language "${options.language}"`);
  }

  const primaryFile = options.files[0] || { name: "main", content: "" };
  let sourceCode = primaryFile.content;

  // Inlining for multi-file C/C++ projects if headers are present
  if (options.language === "c++" || options.language === "c") {
    const headers = options.files.filter((f) => f.name.endsWith(".h") || f.name.endsWith(".hpp"));
    if (headers.length > 0) {
      const headerBlocks = headers
        .map((h) => `// --- Header: ${h.name} ---\n${h.content}\n`)
        .join("\n");
      sourceCode = `${headerBlocks}\n${sourceCode}`;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS + 2000);

  const res = await fetch("https://ce.judge0.com/submissions?wait=true", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language_id: judge0Lang.id,
      source_code: sourceCode,
      stdin: options.stdin || "",
    }),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`Judge0 HTTP ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const executionTimeMs = Math.round(parseFloat(data.time || "0") * 1000) || (Date.now() - startTime);

  let status: CodeRunResult["status"] = "success";
  const statusId = data.status?.id;
  if (statusId === 6) {
    status = "compilation_error";
  } else if (statusId === 5) {
    status = "timeout";
  } else if (statusId !== 3) {
    status = "error";
  }

  const stdout = data.stdout || "";
  const stderr = data.stderr || (statusId === 5 ? `Execution timed out after ${EXECUTION_TIMEOUT_MS / 1000}s limit.` : "");
  const compileOut = data.compile_output || "";
  const combined = `${stdout}${stderr ? (stdout ? "\n" : "") + stderr : ""}`;

  const truncOut = truncateOutput(combined);

  return {
    language: judge0Lang.name,
    version: judge0Lang.version,
    status,
    run: {
      stdout: truncateOutput(stdout).text,
      stderr: truncateOutput(stderr).text,
      output: truncOut.text,
      code: status === "success" ? 0 : 1,
      signal: statusId === 5 ? "SIGKILL" : null,
    },
    compile: compileOut
      ? {
          stdout: "",
          stderr: compileOut,
          output: compileOut,
          code: status === "compilation_error" ? 1 : 0,
          signal: null,
        }
      : undefined,
    executionTimeMs,
    engine: "piston",
    truncated: truncOut.truncated,
  };
}

/**
 * Fallback execution handler when local Piston container is offline.
 * Automatically fails over to Cloud Sandbox (Judge0) or local Node runner.
 */
async function handleFallbackOrError(
  options: PistonExecuteOptions,
  startTime: number,
  diagnosticError: string,
  isTimeout = false
): Promise<CodeRunResult> {
  const executionTimeMs = Date.now() - startTime;

  if (isTimeout) {
    return {
      language: options.language,
      version: "sandbox",
      status: "timeout",
      run: {
        stdout: "",
        stderr: `Execution timed out after ${EXECUTION_TIMEOUT_MS / 1000}s.`,
        output: `Execution timed out after ${EXECUTION_TIMEOUT_MS / 1000}s.`,
        code: 124,
        signal: "SIGKILL",
      },
      executionTimeMs,
      engine: "piston",
      truncated: false,
    };
  }

  // Tier 2 Fallback: Cloud Sandbox (Judge0) for Python, C++, Java, Rust, Go, etc.
  if (JUDGE0_LANGUAGE_MAP[options.language]) {
    try {
      return await executeWithJudge0(options, startTime);
    } catch (judge0Err: any) {
      console.warn("Judge0 cloud fallback failed, trying next runner:", judge0Err?.message);
    }
  }

  // Tier 3 Fallback: If language is JavaScript / TypeScript, execute via local Node.js process
  if (options.language === "javascript" || options.language === "typescript") {
    try {
      const primaryFile = options.files[0];
      const result = await runNodeLocally(primaryFile?.content || "", options.stdin);
      return {
        language: options.language,
        version: process.version,
        status: result.code === 0 ? "success" : "error",
        run: result,
        executionTimeMs: Date.now() - startTime,
        engine: "local_fallback",
        truncated: false,
      };
    } catch (nodeErr: any) {
      // Fall through to error report
    }
  }

  // If all sandboxes are offline, provide clear setup instructions
  const pistonUrl = process.env.PISTON_API_URL || PISTON_DEFAULT_URL;
  const helpMessage = [
    `[MINDSPACE Code Execution Engine]`,
    `Execution Sandbox Error: Unable to reach Piston container at ${pistonUrl}`,
    ``,
    `Details: ${diagnosticError}`,
    ``,
    `To run the isolated Piston Docker container on your machine:`,
    `  1. docker compose -f docker-compose.piston.yml up -d`,
    `  2. ./scripts/setup-piston.sh`,
    ``,
    `Supported languages: Python, C++, C#, Java, JavaScript, Rust, Go, PHP, etc.`,
  ].join("\n");

  return {
    language: options.language,
    version: "offline",
    status: "error",
    run: {
      stdout: "",
      stderr: helpMessage,
      output: helpMessage,
      code: 1,
      signal: null,
    },
    executionTimeMs,
    engine: "piston",
    truncated: false,
    rawError: diagnosticError,
  };
}

/**
 * Runs a snippet in Node.js locally with timeout limit.
 */
function runNodeLocally(
  code: string,
  stdinInput?: string
): Promise<ExecutionStageResult> {
  return new Promise((resolve) => {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `mindspace_run_${Date.now()}_${Math.random().toString(36).slice(2)}.js`);

    try {
      fs.writeFileSync(tmpFile, code, "utf8");
    } catch (err: any) {
      return resolve({
        stdout: "",
        stderr: `Failed to write temporary script: ${err.message}`,
        output: `Failed to write temporary script: ${err.message}`,
        code: 1,
        signal: null,
      });
    }

    const child = exec(
      `node "${tmpFile}"`,
      {
        timeout: EXECUTION_TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT_BYTES,
      },
      (error, stdout, stderr) => {
        try {
          fs.unlinkSync(tmpFile);
        } catch {}

        const out = stdout || "";
        const err = stderr || "";
        const combined = `${out}${err ? (out ? "\n" : "") + err : ""}`;

        resolve({
          stdout: out,
          stderr: err,
          output: combined,
          code: error ? (typeof error.code === "number" ? error.code : 1) : 0,
          signal: error?.signal ?? null,
        });
      }
    );

    if (stdinInput && child.stdin) {
      child.stdin.write(stdinInput);
      child.stdin.end();
    }
  });
}
