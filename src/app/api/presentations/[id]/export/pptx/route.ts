import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { generatePresentationPptx } from "@/lib/presentations/pptx-export";
import { PresentationItem } from "@/lib/presentations/types";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/presentations/[id]/export/pptx
 * Generates and downloads a real .pptx PowerPoint presentation.
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

    const presentationItem: PresentationItem = {
      id: presentation.id,
      ownerId: presentation.ownerId,
      title: presentation.title,
      createdAt: presentation.createdAt.toISOString(),
      updatedAt: presentation.updatedAt.toISOString(),
      slides: presentation.slides.map((s) => ({
        id: s.id,
        presentationId: s.presentationId,
        order: s.order,
        layoutType: s.layoutType as any,
        contentJson: s.contentJson as any,
        speakerNotes: s.speakerNotes || "",
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    };

    const buffer = await generatePresentationPptx(presentationItem);

    const safeFilename =
      presentation.title
        .replace(/[/\\?%*:|"<>]/g, "-")
        .replace(/\s+/g, "_")
        .trim() || "presentation";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${safeFilename}.pptx"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error(`[GET /api/presentations/${id}/export/pptx] error:`, err);
    return NextResponse.json(
      { error: "Failed to generate PowerPoint file." },
      { status: 500 }
    );
  }
}
