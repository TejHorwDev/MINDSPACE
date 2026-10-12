import { NextRequest, NextResponse } from "next/server";
import { getStaffSession, getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/activity-log";

/**
 * GET: Search, filter, and sort users (Admins & Moderators)
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
  const role = searchParams.get("role") || "all";
  const planId = searchParams.get("planId") || "all";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  try {
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (role !== "all") {
      where.role = role;
    }

    if (planId !== "all") {
      where.planId = planId;
    }

    let orderBy: any = {};
    if (sortBy === "name") {
      orderBy = { name: sortOrder };
    } else if (sortBy === "email") {
      orderBy = { email: sortOrder };
    } else if (sortBy === "credits") {
      orderBy = { freeCreditsBalance: sortOrder };
    } else {
      orderBy = { createdAt: sortOrder };
    }

    const users = await db.user.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        planId: true,
        freeCreditsBalance: true,
        purchasedCreditsBalance: true,
        createdAt: true,
        accountPlan: {
          select: {
            id: true,
            name: true,
            dailyFreeCreditUSD: true,
            maxProjects: true,
            maxStorageMB: true,
          },
        },
        _count: {
          select: {
            projects: true,
            creditTransactions: true,
          },
        },
      },
    });

    const allPlans = await db.accountPlan.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, dailyFreeCreditUSD: true },
    });

    return NextResponse.json({ users, plans: allPlans });
  } catch (error) {
    console.error("Admin list users error:", error);
    return NextResponse.json(
      { error: "Failed to load users." },
      { status: 500 }
    );
  }
}

/**
 * POST: Bulk user actions (Admin only)
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
    const { action, userIds, targetValue } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "No users selected." }, { status: 400 });
    }

    // Safety: prevent admin from bulk deleting or modifying themselves
    const filteredIds = userIds.filter((id: string) => id !== session.user.id);

    if (action === "delete") {
      const deleteResult = await db.user.deleteMany({
        where: { id: { in: filteredIds } },
      });

      await logAdminAction({
        adminUserId: session.user.id,
        action: "bulk_users_deleted",
        targetType: "user",
        details: { count: deleteResult.count, userIds: filteredIds },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${deleteResult.count} users.`,
      });
    }

    if (action === "change_plan") {
      if (!targetValue) {
        return NextResponse.json({ error: "Target plan required." }, { status: 400 });
      }

      const plan = await db.accountPlan.findUnique({
        where: { id: targetValue },
      });
      if (!plan) {
        return NextResponse.json({ error: "Account plan not found." }, { status: 404 });
      }

      const updateResult = await db.user.updateMany({
        where: { id: { in: userIds } },
        data: { planId: targetValue },
      });

      await logAdminAction({
        adminUserId: session.user.id,
        action: "bulk_users_plan_changed",
        targetType: "account_plan",
        targetId: targetValue,
        details: {
          planName: plan.name,
          count: updateResult.count,
          userIds,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Updated ${updateResult.count} users to ${plan.name} plan.`,
      });
    }

    if (action === "change_role") {
      if (!["student", "moderator", "admin"].includes(targetValue)) {
        return NextResponse.json({ error: "Invalid role." }, { status: 400 });
      }

      const updateResult = await db.user.updateMany({
        where: { id: { in: filteredIds } },
        data: { role: targetValue },
      });

      await logAdminAction({
        adminUserId: session.user.id,
        action: "bulk_users_role_changed",
        targetType: "user",
        details: {
          newRole: targetValue,
          count: updateResult.count,
          userIds: filteredIds,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Updated ${updateResult.count} users to ${targetValue} role.`,
      });
    }

    return NextResponse.json({ error: "Unknown bulk action." }, { status: 400 });
  } catch (error) {
    console.error("Bulk users action error:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk action." },
      { status: 500 }
    );
  }
}
