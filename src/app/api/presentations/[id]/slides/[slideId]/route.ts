import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string; slideId: string }>;
};

/**
 * PATCH /api/presentations/[id]/slides/[slideId]
 * Update a slide's content or layout.
 */
export async function PATCH(req: Request, { params }: RouteProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, slideId } = await params;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const slide = await db.slide.findFirst({
      where: {
        id: slideId,
        presentationId: id,
        presentation: { ownerId: session.user.id },
      },
    });

    if (!slide) {
      return NextResponse.json({ error: "Slide not found." }, { status: 404 });
    }

    const data: any = {};
    if (body.contentJson !== undefined) {
      data.contentJson = body.contentJson;
    }
    if (typeof body.layoutType === "string") {
      data.layoutType = body.layoutType;
    }
    if (typeof body.speakerNotes === "string") {
      data.speakerNotes = body.speakerNotes;
    }

    const updated = await db.slide.update({
      where: { id: slideId },
      data,
    });

    // Touch parent presentation
    await db.presentation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ slide: updated });
  } catch (err: any) {
    console.error(`[PATCH /api/presentations/${id}/slides/${slideId}] error:`, err);
    return NextResponse.json(
      { error: "Failed to update slide." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/presentations/[id]/slides/[slideId]
 * Delete a slide from the presentation and re-index orders.
 */
export async function DELETE(_req: Request, { params }: RouteProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, slideId } = await params;

  try {
    const slide = await db.slide.findFirst({
      where: {
        id: slideId,
        presentationId: id,
        presentation: { ownerId: session.user.id },
      },
    });

    if (!slide) {
      return NextResponse.json({ error: "Slide not found." }, { status: 404 });
    }

    // Check count of slides: deck must keep at least 1 slide
    const count = await db.slide.count({
      where: { presentationId: id },
    });

    if (count <= 1) {
      return NextResponse.json(
        { error: "A presentation must have at least one slide." },
        { status: 400 }
      );
    }

    await db.slide.delete({
      where: { id: slideId },
    });

    // Renumber remaining slides
    const remaining = await db.slide.findMany({
      where: { presentationId: id },
      orderBy: { order: "asc" },
    });

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].order !== i) {
        await db.slide.update({
          where: { id: remaining[i].id },
          data: { order: i },
        });
      }
    }

    await db.presentation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: "Slide deleted." });
  } catch (err: any) {
    console.error(`[DELETE /api/presentations/${id}/slides/${slideId}] error:`, err);
    return NextResponse.json(
      { error: "Failed to delete slide." },
      { status: 500 }
    );
  }
}
