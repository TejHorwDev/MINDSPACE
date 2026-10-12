import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string }>;
};

/**
 * PATCH /api/presentations/[id]/reorder
 * Atomically reorder the list of slides according to slideIds array.
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

  const slideIds: string[] = Array.isArray(body.slideIds) ? body.slideIds : [];

  if (slideIds.length === 0) {
    return NextResponse.json(
      { error: "slideIds array is required." },
      { status: 400 }
    );
  }

  try {
    const presentation = await db.presentation.findFirst({
      where: { id, ownerId: session.user.id },
      select: { id: true },
    });

    if (!presentation) {
      return NextResponse.json(
        { error: "Presentation not found." },
        { status: 404 }
      );
    }

    // Update order for each slide
    for (let index = 0; index < slideIds.length; index++) {
      const slideId = slideIds[index];
      await db.slide.updateMany({
        where: { id: slideId, presentationId: id },
        data: { order: index },
      });
    }

    await db.presentation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    const updatedSlides = await db.slide.findMany({
      where: { presentationId: id },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({
      success: true,
      slides: updatedSlides,
    });
  } catch (err: any) {
    console.error(`[PATCH /api/presentations/${id}/reorder] error:`, err);
    return NextResponse.json(
      { error: "Failed to reorder slides." },
      { status: 500 }
    );
  }
}
