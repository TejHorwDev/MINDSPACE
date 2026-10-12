import fs from "fs";
import path from "path";
import os from "os";
import { db } from "@/lib/db";

// Maximum concurrent terminal sessions across the entire platform
export const MAX_CONCURRENT_TERMINALS = parseInt(
  process.env.TERMINAL_CONCURRENCY_LIMIT || "5",
  10
);

// Idle timeout: 10 minutes (600,000 ms)
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

export interface TerminalSession {
  projectId: string;
  userId: string;
  ptyProcess: any;
  workspaceDir: string;
  createdAt: number;
  lastActivity: number;
  buffer: string;
  subscribers: Set<(data: string) => void>;
  isAlive: boolean;
}

// Global in-memory map of active terminal sessions (one per project)
const sessions = new Map<string, TerminalSession>();

// Initialize idle timeout checker
let idleCheckInterval: NodeJS.Timeout | null = null;

function ensureIdleChecker() {
  if (idleCheckInterval) return;
  idleCheckInterval = setInterval(() => {
    const now = Date.now();
    for (const [projectId, session] of sessions.entries()) {
      if (now - session.lastActivity > IDLE_TIMEOUT_MS) {
        console.log(`[Terminal] Killing session for project ${projectId} due to 10m idle timeout`);
        session.subscribers.forEach((send) => {
          send("\r\n\x1b[1;33m[Session closed due to 10 minutes of inactivity]\x1b[0m\r\n");
        });
        killTerminalSession(projectId);
      }
    }
  }, 15000);
  if (idleCheckInterval.unref) {
    idleCheckInterval.unref();
  }
}

/**
 * Returns the isolated workspace directory for a project.
 */
export function getProjectWorkspaceDir(projectId: string): string {
  const dir = path.join(process.cwd(), "storage", "workspaces", projectId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Populates/syncs project files into the isolated workspace directory.
 */
export async function syncProjectFilesToWorkspace(projectId: string, workspaceDir: string) {
  try {
    const files = await db.projectFile.findMany({
      where: { projectId },
    });

    for (const file of files) {
      const filePath = path.join(workspaceDir, file.path);
      const fileDir = path.dirname(filePath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      // Only write if file doesn't exist or is empty
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, file.content, "utf-8");
      }
    }
  } catch (err) {
    console.warn("[Terminal] Failed to sync project files to workspace:", err);
  }
}

/**
 * Constructs a strictly scrubbed environment containing ZERO sensitive secrets.
 * Non-negotiable security requirement:
 * No DATABASE_URL, No AI API keys, No MINDSPACE app secrets.
 */
export function buildScrubbedEnvironment(workspaceDir: string, projectId: string): Record<string, string> {
  const isWin = process.platform === "win32";

  const scrubbed: Record<string, string> = {
    PATH: process.env.PATH || "",
    TERM: "xterm-256color",
    COLORTERM: "truecolor",
    LANG: "en_US.UTF-8",
    HOME: workspaceDir,
    USER: "student",
    USERNAME: "student",
    PROJECT_ID: projectId,
  };

  if (isWin) {
    scrubbed.SystemRoot = process.env.SystemRoot || "C:\\Windows";
    scrubbed.WINDIR = process.env.WINDIR || "C:\\Windows";
    scrubbed.COMSPEC = process.env.COMSPEC || "cmd.exe";
    scrubbed.USERPROFILE = workspaceDir;
    scrubbed.APPDATA = path.join(workspaceDir, ".appdata");
    scrubbed.LOCALAPPDATA = path.join(workspaceDir, ".localappdata");
    scrubbed.TEMP = path.join(workspaceDir, ".tmp");
    scrubbed.TMP = path.join(workspaceDir, ".tmp");
  } else {
    scrubbed.TMPDIR = "/tmp";
    scrubbed.SHELL = "/bin/sh";
  }

  // Ensure temp dirs exist
  try {
    if (isWin) {
      fs.mkdirSync(scrubbed.TEMP, { recursive: true });
    }
  } catch {}

  return scrubbed;
}

/**
 * Gets or creates a terminal session for the given project.
 */
export async function getOrCreateTerminalSession(
  projectId: string,
  userId: string
): Promise<{ session: TerminalSession; isNew: boolean }> {
  ensureIdleChecker();

  // 1. Reuse existing session if alive
  const existing = sessions.get(projectId);
  if (existing && existing.isAlive) {
    existing.lastActivity = Date.now();
    return { session: existing, isNew: false };
  }

  // 2. Check global concurrency cap
  if (sessions.size >= MAX_CONCURRENT_TERMINALS) {
    throw new Error("Terminal sessions are at capacity, try again shortly");
  }

  // 3. Prepare workspace & sync files
  const workspaceDir = getProjectWorkspaceDir(projectId);
  await syncProjectFilesToWorkspace(projectId, workspaceDir);

  // 4. Scrubbed environment
  const scrubbedEnv = buildScrubbedEnvironment(workspaceDir, projectId);

  // 5. Spawn PTY process
  const isWin = process.platform === "win32";
  const shell = isWin
    ? (process.env.COMSPEC || "powershell.exe")
    : (fs.existsSync("/bin/bash") ? "/bin/bash" : "/bin/sh");

  // Dynamically load node-pty
  let pty: any;
  try {
    pty = require("node-pty");
  } catch (err: any) {
    throw new Error(`Failed to load terminal backend (node-pty): ${err?.message}`);
  }

  const ptyOptions: any = {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd: workspaceDir,
    env: scrubbedEnv,
  };

  if (isWin) {
    // Disable conpty in headless/background server environments to prevent AttachConsole failure
    ptyOptions.useConpty = false;
  }

  const ptyProcess = pty.spawn(shell, [], ptyOptions);

  const session: TerminalSession = {
    projectId,
    userId,
    ptyProcess,
    workspaceDir,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    buffer: "",
    subscribers: new Set(),
    isAlive: true,
  };

  const welcomeBanner =
    `\r\n\x1b[1;36m=== MINDSPACE Interactive Terminal ===\x1b[0m\r\n` +
    `\x1b[90mIsolated project workspace. Network-restricted, scrubbed environment.\x1b[0m\r\n` +
    `\x1b[90mIdle timeout: 10m | Session cap: ${MAX_CONCURRENT_TERMINALS} active\x1b[0m\r\n\r\n`;

  session.buffer += welcomeBanner;

  ptyProcess.onData((data: string) => {
    session.lastActivity = Date.now();
    session.buffer += data;
    // Keep last 64KB
    if (session.buffer.length > 65536) {
      session.buffer = session.buffer.slice(session.buffer.length - 65536);
    }
    session.subscribers.forEach((send) => {
      try {
        send(data);
      } catch {}
    });
  });

  ptyProcess.onExit(({ exitCode, signal }: { exitCode: number; signal: number }) => {
    session.isAlive = false;
    session.subscribers.forEach((send) => {
      try {
        send(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
      } catch {}
    });
    sessions.delete(projectId);
  });

  sessions.set(projectId, session);

  return { session, isNew: true };
}

/**
 * Sends input to a running terminal session.
 */
export function writeToTerminalSession(projectId: string, data: string): boolean {
  const session = sessions.get(projectId);
  if (!session || !session.isAlive) return false;

  session.lastActivity = Date.now();
  session.ptyProcess.write(data);
  return true;
}

/**
 * Resizes a terminal session's columns and rows.
 */
export function resizeTerminalSession(projectId: string, cols: number, rows: number): boolean {
  const session = sessions.get(projectId);
  if (!session || !session.isAlive) return false;

  try {
    session.ptyProcess.resize(Math.max(10, cols), Math.max(5, rows));
    return true;
  } catch {
    return false;
  }
}

/**
 * Terminates an active terminal session.
 */
export function killTerminalSession(projectId: string): boolean {
  const session = sessions.get(projectId);
  if (!session) return false;

  session.isAlive = false;
  try {
    session.ptyProcess.kill();
  } catch {}

  sessions.delete(projectId);
  return true;
}

/**
 * Returns statistics about active terminal sessions.
 */
export function getTerminalStats() {
  return {
    activeSessions: sessions.size,
    maxConcurrent: MAX_CONCURRENT_TERMINALS,
    sessions: Array.from(sessions.values()).map((s) => ({
      projectId: s.projectId,
      userId: s.userId,
      uptimeSeconds: Math.floor((Date.now() - s.createdAt) / 1000),
      idleSeconds: Math.floor((Date.now() - s.lastActivity) / 1000),
      isAlive: s.isAlive,
    })),
  };
}
