import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStaffSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { logAdminAction } from "@/lib/activity-log";

type RouteContext = { params: Promise<{ id: string }> };

const updateReportSchema = z.object({
  status: z.enum(["pending", "resolved", "dismissed"]),
});

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { session, status } = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Staff access required." }, { status });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid status" },
      { status: 400 }
    );
  }

  const existing = await db.report.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const updated = await db.report.update({
    where: { id },
    data: {
      status: parsed.data.status,
    },
  });

  await logAdminAction({
    adminUserId: session.user.id,
    action: `report_${parsed.data.status}`,
    targetType: "report",
    targetId: id,
    details: {
      projectId: existing.projectId,
      reason: existing.reason,
      status: parsed.data.status,
    },
  });

  return NextResponse.json({
    success: true,
    report: updated,
  });
}
