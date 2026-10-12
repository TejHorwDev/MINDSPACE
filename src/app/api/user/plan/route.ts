import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserAccountPlan, checkCanCreateProject, checkStorageQuota } from "@/lib/account-plans";

/**
 * GET: Current user's Account Plan, quota utilization, and all available public tiers
 */
export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const [currentPlan, projectQuota, storageQuota, availablePlans, user] = await Promise.all([
      getUserAccountPlan(userId),
      checkCanCreateProject(userId),
      checkStorageQuota(userId, 0),
      db.accountPlan.findMany({
        where: { active: true },
        orderBy: { dailyFreeCreditUSD: "asc" },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: {
          freeCreditsBalance: true,
          purchasedCreditsBalance: true,
          creditsResetAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      currentPlan,
      userBalances: {
        freeCreditsBalance: user?.freeCreditsBalance ?? 20,
        purchasedCreditsBalance: user?.purchasedCreditsBalance ?? 0,
        creditsResetAt: user?.creditsResetAt ?? new Date(),
      },
      quotas: {
        projects: {
          used: projectQuota.currentCount,
          max: projectQuota.maxProjects,
          allowed: projectQuota.allowed,
        },
        storage: {
          usedMB: Number((storageQuota.usedBytes / (1024 * 1024)).toFixed(2)),
          maxMB: storageQuota.maxStorageMB,
          allowed: storageQuota.allowed,
        },
      },
      availablePlans,
    });
  } catch (error) {
    console.error("Failed to fetch user account plan:", error);
    return NextResponse.json({ error: "Failed to load account plan" }, { status: 500 });
  }
}

/**
 * POST: Self-serve upgrade / tier switch for testing and seamless onboarding
 */
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { targetPlanName } = body; // e.g. "Pro" or "Free"

    if (!targetPlanName) {
      return NextResponse.json({ error: "Target plan name is required." }, { status: 400 });
    }

    const targetPlan = await db.accountPlan.findFirst({
      where: { name: { equals: targetPlanName }, active: true },
    });

    if (!targetPlan) {
      return NextResponse.json({ error: `Plan '${targetPlanName}' not found.` }, { status: 404 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { freeCreditsBalance: true },
    });

    const updateData: any = {
      planId: targetPlan.id,
    };

    // If upgrading to a tier with higher allowance, top up immediately
    if (user && targetPlan.dailyFreeCreditUSD > user.freeCreditsBalance) {
      updateData.freeCreditsBalance = targetPlan.dailyFreeCreditUSD;
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: updateData,
      include: { accountPlan: true },
    });

    // Record audit transaction
    await db.creditTransaction.create({
      data: {
        userId: session.user.id,
        amount: targetPlan.dailyFreeCreditUSD,
        type: "plan_changed",
        reason: `Account upgraded to ${targetPlan.name} Tier ($${targetPlan.dailyFreeCreditUSD.toFixed(2)}/day, ${targetPlan.maxProjects} projects)`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully switched to ${targetPlan.name} Tier!`,
      plan: updatedUser.accountPlan,
      freeCreditsBalance: updatedUser.freeCreditsBalance,
    });
  } catch (error) {
    console.error("Failed to change user plan:", error);
    return NextResponse.json({ error: "Failed to change plan." }, { status: 500 });
  }
}
