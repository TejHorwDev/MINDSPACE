import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getStaffSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/activity-log";
import { z } from "zod";

const createPlanSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required").max(50),
  priceNPR: z.number().int().min(0, "Price must be >= 0 NPR").default(0),
  dailyFreeCreditUSD: z.number().min(0, "Daily credit must be >= 0"),
  maxProjects: z.number().int().min(1, "Max projects must be >= 1"),
  maxStorageMB: z.number().int().min(1, "Max storage must be >= 1"),
  isDefault: z.boolean().default(false),
  active: z.boolean().default(true),
});

/**
 * GET: List all account plans with member counts
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
    const plans = await db.accountPlan.findMany({
      orderBy: [{ isDefault: "desc" }, { dailyFreeCreditUSD: "asc" }],
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Admin list account plans error:", error);
    return NextResponse.json(
      { error: "Failed to load account plans." },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new account plan (Admin only)
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
    const parsed = createPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 }
      );
    }

    // Check unique name
    const existing = await db.accountPlan.findUnique({
      where: { name: parsed.data.name },
    });
    if (existing) {
      return NextResponse.json(
        { error: `An account plan named "${parsed.data.name}" already exists.` },
        { status: 409 }
      );
    }

    // If isDefault is true, unset default on other plans
    if (parsed.data.isDefault) {
      await db.accountPlan.updateMany({
        data: { isDefault: false },
      });
    }

    const created = await db.accountPlan.create({
      data: parsed.data,
    });

    await logAdminAction({
      adminUserId: session.user.id,
      action: "account_plan_created",
      targetType: "account_plan",
      targetId: created.id,
      details: {
        name: created.name,
        priceNPR: created.priceNPR,
        dailyFreeCreditUSD: created.dailyFreeCreditUSD,
        maxProjects: created.maxProjects,
        maxStorageMB: created.maxStorageMB,
        isDefault: created.isDefault,
      },
    });

    return NextResponse.json({ plan: created }, { status: 201 });
  } catch (error) {
    console.error("Admin create account plan error:", error);
    return NextResponse.json(
      { error: "Failed to create account plan." },
      { status: 500 }
    );
  }
}
