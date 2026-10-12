import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requests = await db.purchaseRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        targetPlan: {
          select: {
            id: true,
            name: true,
            dailyFreeCreditUSD: true,
            maxProjects: true,
            maxStorageMB: true,
          },
        },
        creditPlan: {
          select: {
            id: true,
            name: true,
            creditsGrantedUSD: true,
            priceNPR: true,
          },
        },
      },
    });

    const channels = await db.contactChannel.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        name: true,
        iconType: true,
        contactLink: true,
        instructions: true,
      },
    });

    return NextResponse.json({ requests, channels });
  } catch (error) {
    console.error("Failed to load purchase requests:", error);
    return NextResponse.json(
      { error: "Failed to load purchase requests." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const { type, targetPlanId, creditPlanId, contactHandle, notes } = body;

    if (!type || (type !== "plan_upgrade" && type !== "credit_topup")) {
      return NextResponse.json(
        { error: "Invalid request type. Must be 'plan_upgrade' or 'credit_topup'." },
        { status: 400 }
      );
    }

    let planName = "";
    let amountUSD: number | null = null;
    let priceNPR: number | null = null;

    if (type === "plan_upgrade") {
      if (!targetPlanId) {
        return NextResponse.json(
          { error: "Target plan ID is required for a plan upgrade." },
          { status: 400 }
        );
      }

      const targetPlan = await db.accountPlan.findUnique({
        where: { id: targetPlanId },
      });

      if (!targetPlan || !targetPlan.active) {
        return NextResponse.json(
          { error: "Requested Account Plan does not exist or is inactive." },
          { status: 404 }
        );
      }

      // Check user's current plan
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { planId: true },
      });

      if (user?.planId === targetPlan.id) {
        return NextResponse.json(
          { error: `You are already subscribed to the ${targetPlan.name} Plan.` },
          { status: 400 }
        );
      }

      planName = `${targetPlan.name} Tier`;
      amountUSD = targetPlan.dailyFreeCreditUSD;
      priceNPR = targetPlan.priceNPR ?? (targetPlan.name.toLowerCase().includes("pro") ? 1500 : 0);
    } else {
      // credit_topup
      if (!creditPlanId) {
        return NextResponse.json(
          { error: "Credit plan ID is required for top-up purchases." },
          { status: 400 }
        );
      }

      const creditPlan = await db.creditPlan.findUnique({
        where: { id: creditPlanId },
      });

      if (!creditPlan || !creditPlan.active) {
        return NextResponse.json(
          { error: "Requested credit plan does not exist or is inactive." },
          { status: 404 }
        );
      }

      planName = creditPlan.name;
      amountUSD = creditPlan.creditsGrantedUSD;
      priceNPR = creditPlan.priceNPR;
    }

    // Check if there is already an identical pending request to avoid spam
    const existingPending = await db.purchaseRequest.findFirst({
      where: {
        userId,
        type,
        status: "pending",
        targetPlanId: type === "plan_upgrade" ? targetPlanId : undefined,
        creditPlanId: type === "credit_topup" ? creditPlanId : undefined,
      },
    });

    if (existingPending) {
      const channels = await db.contactChannel.findMany({
        where: { active: true },
        orderBy: { displayOrder: "asc" },
      });

      return NextResponse.json({
        success: true,
        alreadyPending: true,
        message: "You already have a pending request for this package. Message support to complete payment.",
        request: existingPending,
        channels,
      });
    }

    // Create the purchase request
    const newRequest = await db.purchaseRequest.create({
      data: {
        userId,
        type,
        targetPlanId: type === "plan_upgrade" ? targetPlanId : null,
        creditPlanId: type === "credit_topup" ? creditPlanId : null,
        planName,
        amountUSD,
        priceNPR,
        contactHandle: contactHandle?.trim() || null,
        notes: notes?.trim() || null,
        status: "pending",
      },
      include: {
        targetPlan: true,
        creditPlan: true,
      },
    });

    const channels = await db.contactChannel.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json({
      success: true,
      message: "Purchase request created successfully.",
      request: newRequest,
      channels,
    });
  } catch (error) {
    console.error("Failed to create purchase request:", error);
    return NextResponse.json(
      { error: "Failed to create purchase request." },
      { status: 500 }
    );
  }
}
