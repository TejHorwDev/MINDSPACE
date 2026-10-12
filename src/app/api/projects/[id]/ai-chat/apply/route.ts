import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await context.params;

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      ownerId: session.user.id,
    },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let body: {
    messageId?: string;
    path?: string;
    content?: string;
    action?: "apply" | "reject";
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { messageId, path, content, action } = body;

  if (!path || !action || (action === "apply" && content === undefined)) {
    return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
  }

  try {
    let updatedFile: any = null;

    if (action === "apply" && content !== undefined) {
      // 1. Update ProjectFile
      updatedFile = await db.projectFile.upsert({
        where: {
          projectId_path: {
            projectId,
            path,
          },
        },
        update: {
          content,
          updatedAt: new Date(),
        },
        create: {
          projectId,
          path,
          content,
        },
      });

      // 2. Log activity
      await db.projectActivity.create({
        data: {
          projectId,
          action: "modified_by_ai",
          detail: `Applied AI change to ${path}`,
        },
      });
    }

    // 3. If messageId provided, update the status in AiChatMessage diffs array
    if (messageId) {
      const msg = await db.aiChatMessage.findUnique({
        where: { id: messageId },
        select: { diffs: true },
      });

      if (msg?.diffs && Array.isArray(msg.diffs)) {
        const updatedDiffs = (msg.diffs as any[]).map((d) => {
          if (d.path === path) {
            return { ...d, status: action === "apply" ? "applied" : "rejected" };
          }
          return d;
        });

        await db.aiChatMessage.update({
          where: { id: messageId },
          data: { diffs: updatedDiffs },
        });
      }
    }

    return NextResponse.json({
      success: true,
      action,
      file: updatedFile,
    });
  } catch (error: any) {
    console.error("Apply AI diff error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update project file." },
      { status: 500 }
    );
  }
}
