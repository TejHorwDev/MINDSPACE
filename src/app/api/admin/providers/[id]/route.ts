import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  const { id } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const existing = await db.aiProvider.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Provider not found." }, { status: 404 });
  }

  const updateData: any = {};
  if (body.name !== undefined) updateData.name = body.name.trim();
  if (body.modelKey !== undefined) updateData.modelKey = body.modelKey.trim();
  if (body.provider !== undefined) updateData.provider = body.provider.trim();
  if (body.baseUrl !== undefined) {
    updateData.baseUrl = body.baseUrl && body.baseUrl.trim() !== "" ? body.baseUrl.trim() : null;
  }
  if (body.apiKey !== undefined) {
    updateData.apiKey = body.apiKey && body.apiKey.trim() !== "" ? body.apiKey.trim() : null;
  }
  if (body.notes !== undefined) {
    updateData.notes = body.notes && body.notes.trim() !== "" ? body.notes.trim() : null;
  }
  if (body.active !== undefined) updateData.active = Boolean(body.active);
  if (body.priority !== undefined) updateData.priority = Number(body.priority);
  if (body.inputCostPerMillion !== undefined) updateData.inputCostPerMillion = Number(body.inputCostPerMillion);
  if (body.outputCostPerMillion !== undefined) updateData.outputCostPerMillion = Number(body.outputCostPerMillion);

  const updated = await db.aiProvider.update({
    where: { id },
    data: updateData,
  });

  const { logAdminAction } = await import("@/lib/activity-log");
  await logAdminAction({
    adminUserId: session.user.id,
    action: "ai_provider_updated",
    targetType: "ai_provider",
    targetId: id,
    details: { name: updated.name, active: updated.active, modelKey: updated.modelKey },
  });

  return NextResponse.json({ provider: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  const { id } = await params;

  const existing = await db.aiProvider.findUnique({ where: { id } });

  await db.aiProvider.delete({
    where: { id },
  });

  const { logAdminAction } = await import("@/lib/activity-log");
  await logAdminAction({
    adminUserId: session.user.id,
    action: "ai_provider_deleted",
    targetType: "ai_provider",
    targetId: id,
    details: { name: existing?.name },
  });

  return NextResponse.json({ success: true });
}
