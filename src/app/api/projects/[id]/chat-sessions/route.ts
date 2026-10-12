import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const createSessionSchema = z.object({
  title: z.string().trim().max(100).optional(),
});

/**
 * GET: List all chat sessions for a project
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await context.params;

  const project = await db.project.findFirst({
    where: { id: projectId, ownerId: session.user.id },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let chatSessions = await db.chatSession.findMany({
    where: { projectId, userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { messages: true },
      },
    },
  });

  // If no session exists yet, create an initial one
  if (chatSessions.length === 0) {
    const initialSession = await db.chatSession.create({
      data: {
        projectId,
        userId: session.user.id,
        title: "Initial Chat",
      },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });
    chatSessions = [initialSession];
  }

  return NextResponse.json({ sessions: chatSessions });
}

/**
 * POST: Create a fresh new chat session (+ New Chat)
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await context.params;

  const project = await db.project.findFirst({
    where: { id: projectId, ownerId: session.user.id },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let title = "New Chat";
  try {
    const body = await req.json();
    const parsed = createSessionSchema.safeParse(body);
    if (parsed.success && parsed.data.title) {
      title = parsed.data.title;
    }
  } catch {
    // Body is optional
  }

  const newSession = await db.chatSession.create({
    data: {
      projectId,
      userId: session.user.id,
      title,
    },
    include: {
      _count: {
        select: { messages: true },
      },
    },
  });

  return NextResponse.json({ session: newSession }, { status: 201 });
}
