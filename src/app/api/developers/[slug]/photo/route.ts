import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Check admin privileges
  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required to modify creator profiles." }, { status: 403 });
  }

  const { slug } = await context.params;

  let body: { photoUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!body.photoUrl || typeof body.photoUrl !== "string") {
    return NextResponse.json({ error: "Valid photoUrl is required" }, { status: 400 });
  }

  try {
    const updated = await db.developer.update({
      where: { slug },
      data: { photoUrl: body.photoUrl.trim() },
    });

    return NextResponse.json({ success: true, developer: updated });
  } catch (err: any) {
    console.error("Failed to update developer photo:", err);
    return NextResponse.json({ error: "Failed to update profile photo." }, { status: 500 });
  }
}
