import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { status, session } = await getStaffSession();
  if (!session) {
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Forbidden: staff access required." },
      { status }
    );
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") || "all";
  const search = searchParams.get("search")?.trim().toLowerCase() || "";

  try {
    const where: any = {};
    if (statusFilter !== "all") {
      where.status = statusFilter;
    }

    if (search) {
      where.OR = [
        { id: { contains: search } },
        { planName: { contains: search } },
        { contactHandle: { contains: search } },
        { notes: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
    }

    const [requests, counts] = await Promise.all([
      db.purchaseRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              planExpiresAt: true,
              accountPlan: {
                select: { id: true, name: true, dailyFreeCreditUSD: true },
              },
              freeCreditsBalance: true,
              purchasedCreditsBalance: true,
            },
          },
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
      }),
      Promise.all([
        db.purchaseRequest.count(),
        db.purchaseRequest.count({ where: { status: "pending" } }),
        db.purchaseRequest.count({ where: { status: "approved" } }),
        db.purchaseRequest.count({ where: { status: "rejected" } }),
      ]),
    ]);

    return NextResponse.json({
      requests,
      counts: {
        total: counts[0],
        pending: counts[1],
        approved: counts[2],
        rejected: counts[3],
      },
    });
  } catch (error) {
    console.error("Failed to load admin purchase requests:", error);
    return NextResponse.json(
      { error: "Failed to load purchase requests." },
      { status: 500 }
    );
  }
}
