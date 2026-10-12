import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/templates/[id]/duplicate
 * Admin & Moderator: Duplicate any existing template as a new custom template.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getAuthSession();
  if (!session?.user?.id || (session.user.role !== "admin" && session.user.role !== "moderator")) {
    return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const source = await db.template.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Source template not found." }, { status: 404 });
    }

    // Generate unique slug
    let newSlug = `${source.slug}-copy`;
    let counter = 1;
    while (await db.template.findUnique({ where: { slug: newSlug } })) {
      counter++;
      newSlug = `${source.slug}-copy-${counter}`;
    }

    const newName = counter === 1 ? `${source.name} (Copy)` : `${source.name} (Copy ${counter})`;

    const created = await db.template.create({
      data: {
        slug: newSlug,
        name: newName,
        description: source.description,
        category: source.category,
        tags: source.tags,
        icon: source.icon,
        isFeatured: false,
        isCustom: true,
        fileCount: source.fileCount,
        files: source.files as any,
      },
    });

    // Activity log
    try {
      await db.adminActivityLog.create({
        data: {
          adminUserId: session.user.id,
          action: "template_duplicated",
          targetType: "template",
          targetId: created.id,
          details: {
            sourceSlug: source.slug,
            newSlug: created.slug,
            name: created.name,
          },
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Template duplicated as "${created.name}".`,
      template: {
        id: created.id,
        slug: created.slug,
        name: created.name,
        description: created.description,
        category: created.category,
        tags: created.tags ? created.tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
        icon: created.icon || "Sparkles",
        isFeatured: created.isFeatured,
        isCustom: created.isCustom,
        fileCount: created.fileCount,
        files: created.files,
        createdAt: created.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Duplicate template error:", error);
    return NextResponse.json(
      { error: "Failed to duplicate template." },
      { status: 500 }
    );
  }
}
