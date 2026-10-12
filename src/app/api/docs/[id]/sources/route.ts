import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteProps = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/docs/[id]/sources
 * List all sources for a specific document.
 */
export async function GET(req: Request, { params }: RouteProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Ensure document exists and belongs to current user
    const document = await db.document.findFirst({
      where: { id, ownerId: session.user.id },
      select: { id: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const sources = await db.source.findMany({
      where: { documentId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ sources });
  } catch (err: any) {
    console.error(`[GET /api/docs/${id}/sources] error:`, err);
    return NextResponse.json(
      { error: "Failed to fetch document sources" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/docs/[id]/sources
 * Add a new source to the document.
 */
export async function POST(req: Request, { params }: RouteProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const document = await db.document.findFirst({
      where: { id, ownerId: session.user.id },
      select: { id: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const title = (body.title || "").trim();

    if (!title) {
      return NextResponse.json(
        { error: "Source title is required." },
        { status: 400 }
      );
    }

    const validTypes = ["website", "book", "journal", "other"];
    const rawType = (body.sourceType || "website").toLowerCase().trim();
    const sourceType = validTypes.includes(rawType) ? rawType : "website";

    const source = await db.source.create({
      data: {
        documentId: id,
        title,
        authors: body.authors ? String(body.authors).trim() : null,
        url: body.url ? String(body.url).trim() : null,
        publisher: body.publisher ? String(body.publisher).trim() : null,
        publishedDate: body.publishedDate ? String(body.publishedDate).trim() : null,
        accessedDate: body.accessedDate ? String(body.accessedDate).trim() : null,
        sourceType,
      },
    });

    return NextResponse.json({ source }, { status: 201 });
  } catch (err: any) {
    console.error(`[POST /api/docs/${id}/sources] error:`, err);
    return NextResponse.json(
      { error: "Failed to create source" },
      { status: 500 }
    );
  }
}
