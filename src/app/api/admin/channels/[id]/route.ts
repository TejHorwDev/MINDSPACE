import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  iconType: z.string().trim().min(1).max(30).optional(),
  contactLink: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine((val) => /^(https?:\/\/|mailto:)/i.test(val), {
      message: "Contact link must start with https://, http://, or mailto:",
    })
    .optional(),
  instructions: z.string().trim().min(1).max(500).optional(),
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
    const channel = await db.contactChannel.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ channel });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update channel." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  const { id } = await context.params;

  try {
    await db.contactChannel.delete({ where: { id } });
    return NextResponse.json({ message: "Channel deleted." });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete channel." }, { status: 500 });
  }
}
