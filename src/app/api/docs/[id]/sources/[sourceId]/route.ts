import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteProps = {
  params: Promise<{ id: string; sourceId: string }>;
};

/**
 * PATCH /api/docs/[id]/sources/[sourceId]
 * Update an existing source.
 */
export async function PATCH(req: Request, { params }: RouteProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, sourceId } = await params;

  try {
    // Verify document belongs to user
    const document = await db.document.findFirst({
      where: { id, ownerId: session.user.id },
      select: { id: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Verify source exists
    const existingSource = await db.source.findFirst({
      where: { id: sourceId, documentId: id },
    });

    if (!existingSource) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const updateData: {
      title?: string;
      authors?: string | null;
      url?: string | null;
      publisher?: string | null;
      publishedDate?: string | null;
      accessedDate?: string | null;
      sourceType?: string;
    } = {};

    if (body.title !== undefined) {
      const trimmed = String(body.title).trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
      }
      updateData.title = trimmed;
    }

    if (body.authors !== undefined) {
      updateData.authors = body.authors ? String(body.authors).trim() : null;
    }

    if (body.url !== undefined) {
      updateData.url = body.url ? String(body.url).trim() : null;
    }

    if (body.publisher !== undefined) {
      updateData.publisher = body.publisher ? String(body.publisher).trim() : null;
    }

    if (body.publishedDate !== undefined) {
      updateData.publishedDate = body.publishedDate ? String(body.publishedDate).trim() : null;
    }

    if (body.accessedDate !== undefined) {
      updateData.accessedDate = body.accessedDate ? String(body.accessedDate).trim() : null;
    }

    if (body.sourceType !== undefined) {
      const validTypes = ["website", "book", "journal", "other"];
      const rawType = String(body.sourceType).toLowerCase().trim();
      updateData.sourceType = validTypes.includes(rawType) ? rawType : existingSource.sourceType;
    }

    const updatedSource = await db.source.update({
      where: { id: sourceId },
      data: updateData,
    });

    return NextResponse.json({ source: updatedSource });
  } catch (err: any) {
    console.error(`[PATCH /api/docs/${id}/sources/${sourceId}] error:`, err);
    return NextResponse.json(
      { error: "Failed to update source" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/docs/[id]/sources/[sourceId]
 * Delete a source from the document.
 */
export async function DELETE(req: Request, { params }: RouteProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, sourceId } = await params;

  try {
    const document = await db.document.findFirst({
      where: { id, ownerId: session.user.id },
      select: { id: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const existingSource = await db.source.findFirst({
      where: { id: sourceId, documentId: id },
      select: { id: true },
    });

    if (!existingSource) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    await db.source.delete({
      where: { id: sourceId },
    });

    return NextResponse.json({ success: true, deletedId: sourceId });
  } catch (err: any) {
    console.error(`[DELETE /api/docs/${id}/sources/${sourceId}] error:`, err);
    return NextResponse.json(
      { error: "Failed to delete source" },
      { status: 500 }
    );
  }
}
