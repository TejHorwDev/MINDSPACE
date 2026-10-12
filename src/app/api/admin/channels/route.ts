import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

const channelSchema = z.object({
  name: z.string().trim().min(1).max(50),
  iconType: z.string().trim().min(1).max(30).default("message-circle"),
  contactLink: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine((val) => /^(https?:\/\/|mailto:)/i.test(val), {
      message: "Contact link must start with https://, http://, or mailto:",
    }),
  instructions: z.string().trim().min(1).max(500),
  active: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

export async function GET() {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  const channels = await db.contactChannel.findMany({
    orderBy: { displayOrder: "asc" },
  });

  return NextResponse.json({ channels });
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

  const parsed = channelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data." },
      { status: 400 }
    );
  }

  try {
    const channel = await db.contactChannel.create({
      data: parsed.data,
    });
    return NextResponse.json({ channel }, { status: 201 });
  } catch (error: any) {
    console.error("Create channel error:", error);
    return NextResponse.json({ error: "Failed to create channel." }, { status: 500 });
  }
}
