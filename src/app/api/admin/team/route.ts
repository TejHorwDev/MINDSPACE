import { NextRequest, NextResponse } from "next/server";
import { getStaffSession, getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/activity-log";
import { z } from "zod";

const updateRoleSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(["student", "moderator", "admin"]),
});

/**
 * GET: List all staff members (Admins and Moderators)
 */
export async function GET() {
  const { status, session } = await getStaffSession();
  if (!session) {
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Staff access required." },
      { status }
    );
  }

  try {
    const staff = await db.user.findMany({
      where: {
        role: { in: ["admin", "moderator"] },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            adminLogs: true,
          },
        },
      },
    });

    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Admin list team error:", error);
    return NextResponse.json(
      { error: "Failed to load admin team." },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Promote or demote a staff member (Admin only)
 */
export async function PATCH(request: NextRequest) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Admin access required." },
      { status }
    );
  }

  try {
    const body = await request.json();
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 }
      );
    }

    const { userId, role } = parsed.data;

    // Safety: Admin cannot demote themselves
    if (userId === session.user.id && role !== "admin") {
      return NextResponse.json(
        { error: "You cannot change or remove your own admin access." },
        { status: 400 }
      );
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const previousRole = targetUser.role;

    const updated = await db.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    await logAdminAction({
      adminUserId: session.user.id,
      action: "staff_role_changed",
      targetType: "user",
      targetId: userId,
      details: {
        targetEmail: targetUser.email,
        previousRole,
        newRole: role,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Updated ${targetUser.email} from ${previousRole} to ${role}.`,
      user: updated,
    });
  } catch (error) {
    console.error("Admin update team role error:", error);
    return NextResponse.json(
      { error: "Failed to update team role." },
      { status: 500 }
    );
  }
}
