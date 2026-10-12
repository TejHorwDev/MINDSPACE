import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

const DEFAULT_TIPTAP_DOC = {
  type: "doc",
  content: [
    {
      type: "paragraph",
    },
  ],
};

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const documents = await db.document.findMany({
      where: { ownerId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        contentJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ documents });
  } catch (err: any) {
    console.error("[GET /api/docs] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawTitle = typeof body?.title === "string" ? body.title.trim() : "";
    const title = rawTitle || "Untitled Document";

    const document = await db.document.create({
      data: {
        ownerId: session.user.id,
        title,
        contentJson: body?.contentJson || DEFAULT_TIPTAP_DOC,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/docs] error:", err);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}
