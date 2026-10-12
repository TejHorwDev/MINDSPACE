import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Forbidden: admin access required." },
      { status }
    );
  }

  const { id } = await context.params;

  try {
    const request = await db.purchaseRequest.findUnique({
      where: { id },
      include: {
        user: true,
        targetPlan: true,
        creditPlan: true,
      },
    });

    if (!request) {
      return NextResponse.json(
        { error: "Purchase request not found." },
        { status: 404 }
      );
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { error: `This request has already been ${request.status}.` },
        { status: 400 }
      );
    }

    // Execute atomic approval inside a transaction
    const result = await db.$transaction(async (tx) => {
      const now = new Date();

      if (request.type === "plan_upgrade") {
        if (!request.targetPlanId) {
          throw new Error("Missing target plan for upgrade request.");
        }

        const targetPlan = await tx.accountPlan.findUnique({
          where: { id: request.targetPlanId },
        });

        if (!targetPlan) {
          throw new Error("Target account plan not found.");
        }

        // Set 30 days subscription duration
        const existingExpires = request.user.planExpiresAt;
        const baseDate = existingExpires && existingExpires > now ? existingExpires : now;
        const newExpiresAt = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Update student account plan & daily allowance
        await tx.user.update({
          where: { id: request.userId },
          data: {
            planId: targetPlan.id,
            planExpiresAt: newExpiresAt,
            freeCreditsBalance: targetPlan.dailyFreeCreditUSD,
            creditsResetAt: now,
          },
        });

        // Audit credit transaction
        await tx.creditTransaction.create({
          data: {
            userId: request.userId,
            amount: targetPlan.dailyFreeCreditUSD,
            type: "plan_changed",
            reason: `Account upgraded to ${targetPlan.name} Tier ($${targetPlan.dailyFreeCreditUSD.toFixed(2)}/day, ${targetPlan.maxProjects} projects) [Approved Request #${request.id.slice(-6)}]`,
            metadata: {
              requestId: request.id,
              planName: targetPlan.name,
              planExpiresAt: newExpiresAt.toISOString(),
              dailyAllowance: targetPlan.dailyFreeCreditUSD,
              approvedBy: session.user.id,
            },
          },
        });
      } else if (request.type === "credit_topup") {
        if (!request.creditPlanId) {
          throw new Error("Missing credit plan for top-up request.");
        }

        const creditPlan = await tx.creditPlan.findUnique({
          where: { id: request.creditPlanId },
        });

        if (!creditPlan) {
          throw new Error("Credit plan not found.");
        }

        // Atomically increment purchasedCreditsBalance
        await tx.user.update({
          where: { id: request.userId },
          data: {
            purchasedCreditsBalance: {
              increment: creditPlan.creditsGrantedUSD,
            },
          },
        });

        // Audit credit transaction
        await tx.creditTransaction.create({
          data: {
            userId: request.userId,
            amount: creditPlan.creditsGrantedUSD,
            type: "purchase",
            reason: `Purchased ${creditPlan.name} (+$${creditPlan.creditsGrantedUSD.toFixed(2)} top-up) [Approved Request #${request.id.slice(-6)}]`,
            metadata: {
              requestId: request.id,
              creditPlanId: creditPlan.id,
              priceNPR: creditPlan.priceNPR,
              creditsGrantedUSD: creditPlan.creditsGrantedUSD,
              approvedBy: session.user.id,
            },
          },
        });
      }

      // Mark request as approved
      const updatedRequest = await tx.purchaseRequest.update({
        where: { id: request.id },
        data: {
          status: "approved",
          reviewedById: session.user.id,
          reviewedAt: now,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              planExpiresAt: true,
              accountPlan: true,
              freeCreditsBalance: true,
              purchasedCreditsBalance: true,
            },
          },
          targetPlan: true,
          creditPlan: true,
        },
      });

      // Log admin activity
      await tx.adminActivityLog.create({
        data: {
          adminUserId: session.user.id,
          action: "purchase_request_approved",
          targetType: "purchase_request",
          targetId: request.id,
          details: {
            studentEmail: request.user.email,
            requestType: request.type,
            planName: request.planName,
            amountUSD: request.amountUSD,
            priceNPR: request.priceNPR,
          },
        },
      });

      return updatedRequest;
    });

    return NextResponse.json({
      success: true,
      message: `Request #${id.slice(-6)} approved! Plan and credits applied automatically.`,
      request: result,
    });
  } catch (error: any) {
    console.error("Failed to approve purchase request:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to approve purchase request." },
      { status: 500 }
    );
  }
}
