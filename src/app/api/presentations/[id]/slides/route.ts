import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDefaultSlideContent } from "@/lib/presentations/defaults";
import { SlideLayoutType } from "@/lib/presentations/types";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/presentations/[id]/slides
 * Add a new slide to the presentation with the chosen layout template.
 */
export async function POST(req: Request, { params }: RouteProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // defaults
  }

  const layoutType: SlideLayoutType = [
    "title",
    "title-content",
    "two-column",
    "image-text",
  ].includes(body.layoutType)
    ? body.layoutType
    : "title-content";

  try {
    const presentation = await db.presentation.findFirst({
      where: { id, ownerId: session.user.id },
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

    const currentSlides = presentation.slides;
    const targetIndex =
      typeof body.atIndex === "number" &&
      body.atIndex >= 0 &&
      body.atIndex <= currentSlides.length
        ? body.atIndex
        : currentSlides.length;

    // Shift any slides at or after targetIndex
    if (targetIndex < currentSlides.length) {
      for (let i = currentSlides.length - 1; i >= targetIndex; i--) {
        await db.slide.update({
          where: { id: currentSlides[i].id },
          data: { order: currentSlides[i].order + 1 },
        });
      }
    }

    const speakerNotes =
      typeof body.speakerNotes === "string" ? body.speakerNotes : "";

    const newSlide = await db.slide.create({
      data: {
        presentationId: id,
        order: targetIndex,
        layoutType,
        contentJson: getDefaultSlideContent(layoutType),
        speakerNotes,
      },
    });

    // Touch presentation updatedAt
    await db.presentation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ slide: newSlide }, { status: 201 });
  } catch (err: any) {
    console.error(`[POST /api/presentations/${id}/slides] error:`, err);
    return NextResponse.json(
      { error: "Failed to create slide." },
      { status: 500 }
    );
  }
}
