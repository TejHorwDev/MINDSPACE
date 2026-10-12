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
  const action = searchParams.get("action") || "all";
  const targetType = searchParams.get("targetType") || "all";
  const adminId = searchParams.get("adminId") || "all";
  const search = searchParams.get("search")?.trim() || "";

  try {
    const where: any = {};

    if (action !== "all") {
      where.action = action;
    }

    if (targetType !== "all") {
      where.targetType = targetType;
    }

    if (adminId !== "all") {
      where.adminUserId = adminId;
    }

    if (search) {
      where.OR = [
        { action: { contains: search } },
        { targetType: { contains: search } },
        { adminUser: { email: { contains: search } } },
        { adminUser: { name: { contains: search } } },
      ];
    }

    const logs = await db.adminActivityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        adminUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const staffMembers = await db.user.findMany({
      where: { role: { in: ["admin", "moderator"] } },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ logs, staff: staffMembers });
  } catch (error) {
    console.error("Admin list activity logs error:", error);
    return NextResponse.json(
      { error: "Failed to load activity logs." },
      { status: 500 }
    );
  }
}
