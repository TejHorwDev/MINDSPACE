import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

const planSchema = z.object({
  name: z.string().trim().min(1).max(60),
  priceNPR: z.number().int().min(1),
  creditsGrantedUSD: z.number().min(0.1),
  active: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

export async function GET() {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  const plans = await db.creditPlan.findMany({
    orderBy: { displayOrder: "asc" },
  });

  return NextResponse.json({ plans });
}

export async function POST(req: NextRequest) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid plan data." },
      { status: 400 }
    );
  }

  try {
    const plan = await db.creditPlan.create({
      data: parsed.data,
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create plan." }, { status: 500 });
  }
}
