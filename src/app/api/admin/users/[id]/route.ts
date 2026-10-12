import { NextRequest, NextResponse } from "next/server";
import { getStaffSession, getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/activity-log";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET: Detail view for a single user (projects, balance, transactions, plan)
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
    const user = await db.user.findUnique({
      where: { id },
      include: {
        accountPlan: true,
        projects: {
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            name: true,
            isPublished: true,
            publicSlug: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { files: true, aiChatMessages: true } },
          },
        },
        creditTransactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const availablePlans = await db.accountPlan.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ user, availablePlans });
  } catch (error) {
    console.error("Admin get user detail error:", error);
    return NextResponse.json({ error: "Failed to load user details." }, { status: 500 });
  }
}

/**
 * PATCH: Update an individual user's Account Plan or Role (Admin only)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Admin access required." },
      { status }
    );
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const { planId, role } = body;

    const existingUser = await db.user.findUnique({
      where: { id },
      include: { accountPlan: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const updateData: any = {};

    if (planId !== undefined) {
      const plan = await db.accountPlan.findUnique({ where: { id: planId } });
      if (!plan) {
        return NextResponse.json({ error: "Account plan not found." }, { status: 404 });
      }
      updateData.planId = planId;
      // If upgrading to a plan with higher daily allowance, top up immediately
      if (plan.dailyFreeCreditUSD > existingUser.freeCreditsBalance) {
        updateData.freeCreditsBalance = plan.dailyFreeCreditUSD;
      }

      await logAdminAction({
        adminUserId: session.user.id,
        action: "user_plan_updated",
        targetType: "user",
        targetId: id,
        details: {
          previousPlan: existingUser.accountPlan?.name || "None",
          newPlan: plan.name,
          userEmail: existingUser.email,
        },
      });
    }

    if (role !== undefined) {
      if (!["student", "moderator", "admin"].includes(role)) {
        return NextResponse.json({ error: "Invalid role." }, { status: 400 });
      }
      // Safety: Cannot demote yourself if you are an admin
      if (id === session.user.id && role !== "admin") {
        return NextResponse.json(
          { error: "You cannot change your own admin role." },
          { status: 400 }
        );
      }
      updateData.role = role;

      await logAdminAction({
        adminUserId: session.user.id,
        action: "user_role_updated",
        targetType: "user",
        targetId: id,
        details: {
          previousRole: existingUser.role,
          newRole: role,
          userEmail: existingUser.email,
        },
      });
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      include: { accountPlan: true },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Admin update user error:", error);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}

/**
 * DELETE: Delete a user account (Admin only)
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

  // Safety: an admin cannot delete the account they are signed in with.
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account while signed in." },
      { status: 400 }
    );
  }

  try {
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, _count: { select: { projects: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    await db.user.delete({ where: { id } });

    await logAdminAction({
      adminUserId: session.user.id,
      action: "user_deleted",
      targetType: "user",
      targetId: id,
      details: {
        email: user.email,
        projectsCount: user._count.projects,
      },
    });

    return NextResponse.json({
      message: `Deleted ${user.email} and ${user._count.projects} ${
        user._count.projects === 1 ? "project" : "projects"
      }.`,
    });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return NextResponse.json(
      { error: "Failed to delete the user. Please try again." },
      { status: 500 }
    );
  }
}
