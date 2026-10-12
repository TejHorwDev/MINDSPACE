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

  const existing = await db.searchProvider.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Search provider not found." }, { status: 404 });
  }

  const updateData: any = {};
  if (body.name !== undefined) updateData.name = body.name.trim();
  if (body.provider !== undefined) updateData.provider = body.provider.trim().toLowerCase();
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
  if (body.searchDepth !== undefined) updateData.searchDepth = String(body.searchDepth).trim();
  if (body.maxResults !== undefined) updateData.maxResults = Number(body.maxResults);

  const updated = await db.searchProvider.update({
    where: { id },
    data: updateData,
  });

  const { logAdminAction } = await import("@/lib/activity-log");
  await logAdminAction({
    adminUserId: session.user.id,
    action: "search_provider_updated",
    targetType: "search_provider",
    targetId: id,
    details: { name: updated.name, active: updated.active, provider: updated.provider },
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

  const existing = await db.searchProvider.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Search provider not found." }, { status: 404 });
  }

  await db.searchProvider.delete({
    where: { id },
  });

  const { logAdminAction } = await import("@/lib/activity-log");
  await logAdminAction({
    adminUserId: session.user.id,
    action: "search_provider_deleted",
    targetType: "search_provider",
    targetId: id,
    details: { name: existing.name },
  });

  return NextResponse.json({ success: true });
}
