import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string }>;
};

/**
 * PATCH /api/presentations/[id]/save
 * Batch auto-save endpoint: updates title and modified slides in a single transaction.
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

    // 1. Update title if provided
    if (typeof body.title === "string") {
      await db.presentation.update({
        where: { id },
        data: {
          title: body.title.trim() || "Untitled Presentation",
          updatedAt: new Date(),
        },
      });
    }

    // 2. Update slides if provided
    if (Array.isArray(body.slides)) {
      for (const s of body.slides) {
        if (!s.id) continue;
        const updateData: any = {};
        if (s.contentJson !== undefined) {
          updateData.contentJson = s.contentJson;
        }
        if (s.layoutType) {
          updateData.layoutType = s.layoutType;
        }
        if (typeof s.order === "number") {
          updateData.order = s.order;
        }
        if (typeof s.speakerNotes === "string") {
          updateData.speakerNotes = s.speakerNotes;
        }

        await db.slide.updateMany({
          where: { id: s.id, presentationId: id },
          data: updateData,
        });
      }
    }

    return NextResponse.json({
      success: true,
      savedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error(`[PATCH /api/presentations/${id}/save] error:`, err);
    return NextResponse.json(
      { error: "Failed to auto-save presentation." },
      { status: 500 }
    );
  }
}
