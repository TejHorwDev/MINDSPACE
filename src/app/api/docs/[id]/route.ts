import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(req: Request, { params }: RouteProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const document = await db.document.findFirst({
      where: { id, ownerId: session.user.id },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (err: any) {
    console.error(`[GET /api/docs/${id}] error:`, err);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await db.document.findFirst({
      where: { id, ownerId: session.user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const updateData: { title?: string; contentJson?: any } = {};

    if (typeof body.title === "string") {
      const trimmed = body.title.trim();
      updateData.title = trimmed || "Untitled Document";
    }

    if (body.contentJson !== undefined) {
      updateData.contentJson = body.contentJson;
    }

    const updated = await db.document.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ document: updated });
  } catch (err: any) {
    console.error(`[PATCH /api/docs/${id}] error:`, err);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await db.document.findFirst({
      where: { id, ownerId: session.user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await db.document.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(`[DELETE /api/docs/${id}] error:`, err);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
