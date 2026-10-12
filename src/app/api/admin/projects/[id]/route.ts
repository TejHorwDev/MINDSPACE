import { NextRequest, NextResponse } from "next/server";
import { getStaffSession, getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/activity-log";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET: Detail view for a project (files, publish status, activity, owner, chat sessions)
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { status, session } = await getStaffSession();
  if (!session) {
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Staff access required." },
      { status }
    );
  }

  const { id } = await context.params;

  try {
    const project = await db.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            accountPlan: true,
          },
        },
        files: {
          select: {
            id: true,
            path: true,
            updatedAt: true,
          },
          orderBy: { path: "asc" },
        },
        activity: {
          orderBy: { createdAt: "desc" },
          take: 25,
        },
        chatSessions: {
          orderBy: { updatedAt: "desc" },
          include: {
            _count: { select: { messages: true } },
          },
        },
        reports: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Admin get project detail error:", error);
    return NextResponse.json({ error: "Failed to load project details." }, { status: 500 });
  }
}

/**
 * DELETE: Delete a project (Admin only)
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Admin access required." },
      { status }
    );
  }

  const { id } = await context.params;

  try {
    const project = await db.project.findUnique({
      where: { id },
      select: { id: true, name: true, owner: { select: { email: true } } },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    // Cascades to ProjectFile, ProjectActivity, ChatSession, AiChatMessage
    await db.project.delete({ where: { id } });

    await logAdminAction({
      adminUserId: session.user.id,
      action: "project_deleted",
      targetType: "project",
      targetId: id,
      details: {
        name: project.name,
        ownerEmail: project.owner.email,
      },
    });

    return NextResponse.json({
      message: `Deleted “${project.name}” (owned by ${project.owner.email}).`,
    });
  } catch (error) {
    console.error("Admin delete project error:", error);
    return NextResponse.json(
      { error: "Failed to delete the project. Please try again." },
      { status: 500 }
    );
  }
}
