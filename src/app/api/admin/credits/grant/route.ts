import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin";
import { grantCreditsToUser } from "@/lib/credits";
import { db } from "@/lib/db";

const grantSchema = z.object({
  userId: z.string().trim().min(1),
  amountUSD: z.number().min(0.01),
  reason: z.string().trim().min(1).max(200),
  planId: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = grantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid grant parameters." },
      { status: 400 }
    );
  }

  const { userId, amountUSD, reason, planId } = parsed.data;

  // If a planId was provided, verify price and grant amount from DB
  let verifiedAmount = amountUSD;
  let verifiedReason = reason;

  if (planId) {
    const plan = await db.creditPlan.findUnique({
      where: { id: planId },
    });
    if (plan) {
      verifiedAmount = plan.creditsGrantedUSD;
      verifiedReason = `${plan.name} (${plan.priceNPR} NPR) - ${reason}`;
    }
  }

  try {
    const result = await grantCreditsToUser(
      session.user.id,
      userId,
      verifiedAmount,
      verifiedReason,
      planId
    );

    const { logAdminAction } = await import("@/lib/activity-log");
    await logAdminAction({
      adminUserId: session.user.id,
      action: "credit_granted",
      targetType: "user",
      targetId: userId,
      details: {
        amountUSD: verifiedAmount,
        reason: verifiedReason,
        planId: planId || null,
      },
    });

    return NextResponse.json({
      success: true,
      user: result.user,
      transaction: result.transaction,
    });
  } catch (error: any) {
    console.error("Admin grant credits error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to grant credits." },
      { status: 500 }
    );
  }
}
