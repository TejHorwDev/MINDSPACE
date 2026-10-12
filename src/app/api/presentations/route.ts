import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDefaultSlideContent } from "@/lib/presentations/defaults";

export const dynamic = "force-dynamic";

/**
 * GET /api/presentations
 * List all presentations owned by the current user.
 */
export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const presentations = await db.presentation.findMany({
      where: { ownerId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { slides: true },
        },
      },
    });

    return NextResponse.json({ presentations });
  } catch (err: any) {
    console.error("[GET /api/presentations] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch presentations." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/presentations
 * Create a new presentation with 1 default Title Slide.
 */
export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Body is optional
  }

  const title = (body.title || "Untitled Presentation").trim();

  try {
    const presentation = await db.presentation.create({
      data: {
        ownerId: session.user.id,
        title: title || "Untitled Presentation",
        slides: {
          create: {
            order: 0,
            layoutType: "title",
            contentJson: getDefaultSlideContent("title"),
          },
        },
      },
      include: {
        slides: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({ presentation }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/presentations] error:", err);
    return NextResponse.json(
      { error: "Failed to create presentation." },
      { status: 500 }
    );
  }
}
