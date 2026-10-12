import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string; sessionId: string }> };

const updateSessionSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").max(100),
});

/**
 * PATCH: Rename a chat session
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, sessionId } = await context.params;

  const chatSession = await db.chatSession.findFirst({
    where: {
      id: sessionId,
      projectId,
      userId: session.user.id,
    },
  });

  if (!chatSession) {
    return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = updateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid title." },
      { status: 400 }
    );
  }

  const updated = await db.chatSession.update({
    where: { id: sessionId },
    data: {
      title: parsed.data.title,
    },
  });

  return NextResponse.json({ session: updated });
}

/**
 * DELETE: Delete a chat session and its messages (never touches project files)
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, sessionId } = await context.params;

  const chatSession = await db.chatSession.findFirst({
    where: {
      id: sessionId,
      projectId,
      userId: session.user.id,
    },
  });

  if (!chatSession) {
    return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
  }

  // Deleting the session cascades to its messages in SQLite/Prisma schema
  await db.chatSession.delete({
    where: { id: sessionId },
  });

  return NextResponse.json({ success: true, deletedId: sessionId });
}
