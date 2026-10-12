import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/activity-log";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const updatePlanSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  priceNPR: z.number().int().min(0, "Price must be >= 0 NPR").optional(),
  dailyFreeCreditUSD: z.number().min(0).optional(),
  maxProjects: z.number().int().min(1).optional(),
  maxStorageMB: z.number().int().min(1).optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
});

/**
 * PATCH: Edit an account plan (Admin only)
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
    const existing = await db.accountPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Account plan not found." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updatePlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 }
      );
    }

    if (parsed.data.name && parsed.data.name !== existing.name) {
      const duplicate = await db.accountPlan.findUnique({
        where: { name: parsed.data.name },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `An account plan named "${parsed.data.name}" already exists.` },
          { status: 409 }
        );
      }
    }

    if (parsed.data.isDefault) {
      await db.accountPlan.updateMany({
        where: { id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await db.accountPlan.update({
      where: { id },
      data: parsed.data,
    });

    await logAdminAction({
      adminUserId: session.user.id,
      action: "account_plan_updated",
      targetType: "account_plan",
      targetId: id,
      details: {
        previous: existing,
        updated: parsed.data,
      },
    });

    return NextResponse.json({ plan: updated });
  } catch (error) {
    console.error("Admin update account plan error:", error);
    return NextResponse.json({ error: "Failed to update account plan." }, { status: 500 });
  }
}

/**
 * DELETE: Delete an account plan (Admin only)
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
    const existing = await db.accountPlan.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Account plan not found." }, { status: 404 });
    }

    const totalPlans = await db.accountPlan.count();
    if (totalPlans <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the only remaining account plan." },
        { status: 400 }
      );
    }

    // Find fallback plan
    let fallbackPlan = await db.accountPlan.findFirst({
      where: { id: { not: id }, isDefault: true },
    });

    if (!fallbackPlan) {
      fallbackPlan = await db.accountPlan.findFirst({
        where: { id: { not: id } },
      });
    }

    if (fallbackPlan && existing._count.users > 0) {
      // Reassign users to fallback plan
      await db.user.updateMany({
        where: { planId: id },
        data: { planId: fallbackPlan.id },
      });
    }

    // If deleting the default plan, set fallback plan as default
    if (existing.isDefault && fallbackPlan) {
      await db.accountPlan.update({
        where: { id: fallbackPlan.id },
        data: { isDefault: true },
      });
    }

    await db.accountPlan.delete({ where: { id } });

    await logAdminAction({
      adminUserId: session.user.id,
      action: "account_plan_deleted",
      targetType: "account_plan",
      targetId: id,
      details: {
        planName: existing.name,
        reassignedUsersCount: existing._count.users,
        fallbackPlanId: fallbackPlan?.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Account plan "${existing.name}" deleted. Reassigned ${existing._count.users} users to ${fallbackPlan?.name}.`,
    });
  } catch (error) {
    console.error("Admin delete account plan error:", error);
    return NextResponse.json({ error: "Failed to delete account plan." }, { status: 500 });
  }
}
