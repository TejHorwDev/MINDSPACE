import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  priceNPR: z.number().int().min(1).optional(),
  creditsGrantedUSD: z.number().min(0.1).optional(),
  active: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data." },
      { status: 400 }
    );
  }

  try {
    const plan = await db.creditPlan.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ plan });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update plan." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  const { id } = await context.params;

  try {
    await db.creditPlan.delete({ where: { id } });
    return NextResponse.json({ message: "Plan deleted." });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete plan." }, { status: 500 });
  }
}
