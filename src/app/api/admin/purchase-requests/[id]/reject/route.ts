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
    const body = await req.json().catch(() => ({}));
    const rejectionReason = body.reason?.trim() || null;

    const request = await db.purchaseRequest.findUnique({
      where: { id },
      include: { user: true },
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

    const updatedRequest = await db.$transaction(async (tx) => {
      const updated = await tx.purchaseRequest.update({
        where: { id },
        data: {
          status: "rejected",
          rejectionReason,
          reviewedById: session.user.id,
          reviewedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          targetPlan: true,
          creditPlan: true,
        },
      });

      await tx.adminActivityLog.create({
        data: {
          adminUserId: session.user.id,
          action: "purchase_request_rejected",
          targetType: "purchase_request",
          targetId: id,
          details: {
            studentEmail: request.user.email,
            requestType: request.type,
            planName: request.planName,
            rejectionReason,
          },
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: `Request #${id.slice(-6)} has been rejected.`,
      request: updatedRequest,
    });
  } catch (error: any) {
    console.error("Failed to reject purchase request:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to reject purchase request." },
      { status: 500 }
    );
  }
}
