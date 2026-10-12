import { NextRequest, NextResponse } from "next/server";
import { getStaffSession, getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/activity-log";

/**
 * GET: Search, filter, and sort projects (Admins & Moderators)
 */
export async function GET(request: NextRequest) {
  const { status, session } = await getStaffSession();
  if (!session) {
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Staff access required." },
      { status }
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const template = searchParams.get("template") || "all";
  const publishStatus = searchParams.get("publishStatus") || "all";
  const sortBy = searchParams.get("sortBy") || "updatedAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  try {
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { owner: { email: { contains: search } } },
        { owner: { name: { contains: search } } },
      ];
    }

    if (template !== "all") {
      where.templateUsed = template;
    }

    if (publishStatus === "published") {
      where.isPublished = true;
    } else if (publishStatus === "draft") {
      where.isPublished = false;
    }

    let orderBy: any = {};
    if (sortBy === "name") {
      orderBy = { name: sortOrder };
    } else if (sortBy === "createdAt") {
      orderBy = { createdAt: sortOrder };
    } else {
      orderBy = { updatedAt: sortOrder };
    }

    const projects = await db.project.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
        templateUsed: true,
        isPublished: true,
        publicSlug: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            files: true,
            chatSessions: true,
            reports: true,
          },
        },
      },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Admin list projects error:", error);
    return NextResponse.json(
      { error: "Failed to load projects." },
      { status: 500 }
    );
  }
}

/**
 * POST: Bulk actions on projects (delete, unpublish) - Admin only
 */
export async function POST(request: NextRequest) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Admin access required." },
      { status }
    );
  }

  try {
    const body = await request.json();
    const { action, projectIds } = body;

    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({ error: "No projects selected." }, { status: 400 });
    }

    if (action === "delete") {
      const deleteResult = await db.project.deleteMany({
        where: { id: { in: projectIds } },
      });

      await logAdminAction({
        adminUserId: session.user.id,
        action: "bulk_projects_deleted",
        targetType: "project",
        details: { count: deleteResult.count, projectIds },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${deleteResult.count} projects.`,
      });
    }

    if (action === "unpublish") {
      const updateResult = await db.project.updateMany({
        where: { id: { in: projectIds } },
        data: { isPublished: false },
      });

      await logAdminAction({
        adminUserId: session.user.id,
        action: "bulk_projects_unpublished",
        targetType: "project",
        details: { count: updateResult.count, projectIds },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully unpublished ${updateResult.count} projects.`,
      });
    }

    return NextResponse.json({ error: "Unknown bulk action." }, { status: 400 });
  } catch (error) {
    console.error("Bulk projects action error:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk action." },
      { status: 500 }
    );
  }
}
