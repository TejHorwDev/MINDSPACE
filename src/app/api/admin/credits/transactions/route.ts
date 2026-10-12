import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { status, session } = await getStaffSession();
  if (!session) {
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Staff access required." },
      { status }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all";
  const search = searchParams.get("search")?.trim() || "";
  const take = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)));

  try {
    const where: any = {};

    if (type !== "all") {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { reason: { contains: search } },
        { user: { email: { contains: search } } },
        { user: { name: { contains: search } } },
      ];
    }

    const transactions = await db.creditTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Admin list credit transactions error:", error);
    return NextResponse.json(
      { error: "Failed to load transactions." },
      { status: 500 }
    );
  }
}
