import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getOrCreateTerminalSession,
  writeToTerminalSession,
  resizeTerminalSession,
  killTerminalSession,
  getTerminalStats,
} from "@/lib/terminal-session";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/projects/[id]/terminal
 * Establishes an SSE stream for real-time terminal output.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Verify project ownership or admin rights
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      ...(user.role === "admin" ? {} : { userId: user.id }),
    },
    select: { id: true, name: true },
  });

  if (!project) {
    return new NextResponse("Project not found", { status: 404 });
  }

  try {
    const { session, isNew } = await getOrCreateTerminalSession(projectId, user.id);

    const encoder = new TextEncoder();
    let isClosed = false;

    const stream = new ReadableStream({
      start(controller) {
        // 1. Send recent buffer history
        if (session.buffer) {
          controller.enqueue(
            encoder.encode(`event: output\ndata: ${JSON.stringify(session.buffer)}\n\n`)
          );
        }

        // 2. Subscribe to real-time PTY chunks
        const listener = (chunk: string) => {
          if (isClosed) return;
          try {
            controller.enqueue(
              encoder.encode(`event: output\ndata: ${JSON.stringify(chunk)}\n\n`)
            );
          } catch {
            isClosed = true;
            session.subscribers.delete(listener);
          }
        };

        session.subscribers.add(listener);

        // Heartbeat keep-alive every 15s
        const pingInterval = setInterval(() => {
          if (isClosed) {
            clearInterval(pingInterval);
            return;
          }
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            isClosed = true;
            clearInterval(pingInterval);
            session.subscribers.delete(listener);
          }
        }, 15000);

        req.signal.addEventListener("abort", () => {
          isClosed = true;
          clearInterval(pingInterval);
          session.subscribers.delete(listener);
        });
      },
      cancel() {
        isClosed = true;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    const message = err?.message || "Failed to start terminal";
    const status = message.includes("capacity") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/projects/[id]/terminal
 * Sends keystroke input, resize, or control signals to the terminal.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      ...(user.role === "admin" ? {} : { userId: user.id }),
    },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, data, cols, rows } = body;

  if (action === "input") {
    if (typeof data !== "string") {
      return NextResponse.json({ error: "Data must be a string" }, { status: 400 });
    }
    const success = writeToTerminalSession(projectId, data);
    return NextResponse.json({ success });
  }

  if (action === "resize") {
    const success = resizeTerminalSession(projectId, cols || 80, rows || 24);
    return NextResponse.json({ success });
  }

  if (action === "terminate") {
    const success = killTerminalSession(projectId);
    return NextResponse.json({ success });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

/**
 * DELETE /api/projects/[id]/terminal
 * Kills the active terminal session.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  killTerminalSession(projectId);
  return NextResponse.json({ success: true, message: "Terminal session ended" });
}
