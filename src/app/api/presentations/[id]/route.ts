import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/presentations/[id]
 * Fetch presentation with all slides in correct order.
 */
export async function GET(_req: Request, { params }: RouteProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const presentation = await db.presentation.findFirst({
      where: {
        id,
        ownerId: session.user.id,
      },
      include: {
        slides: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!presentation) {
      return NextResponse.json(
        { error: "Presentation not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ presentation });
  } catch (err: any) {
    console.error(`[GET /api/presentations/${id}] error:`, err);
    return NextResponse.json(
      { error: "Failed to fetch presentation." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/presentations/[id]
 * Update presentation title.
 */
export async function PATCH(req: Request, { params }: RouteProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const existing = await db.presentation.findFirst({
      where: { id, ownerId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Presentation not found." },
        { status: 404 }
      );
    }

    const data: any = {};
    if (typeof body.title === "string") {
      data.title = body.title.trim() || "Untitled Presentation";
    }

    const updated = await db.presentation.update({
      where: { id },
      data,
      include: {
        slides: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({ presentation: updated });
  } catch (err: any) {
    console.error(`[PATCH /api/presentations/${id}] error:`, err);
    return NextResponse.json(
      { error: "Failed to update presentation." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/presentations/[id]
 * Delete a presentation and cascade all slides.
 */
export async function DELETE(_req: Request, { params }: RouteProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await db.presentation.findFirst({
      where: { id, ownerId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Presentation not found." },
        { status: 404 }
      );
    }

    await db.presentation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Presentation deleted." });
  } catch (err: any) {
    console.error(`[DELETE /api/presentations/${id}] error:`, err);
    return NextResponse.json(
      { error: "Failed to delete presentation." },
      { status: 500 }
    );
  }
}
