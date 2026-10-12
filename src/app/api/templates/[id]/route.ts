import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const updateTemplateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").optional(),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters.")
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and dashes.")
    .optional(),
  category: z.string().trim().min(1, "Category is required.").optional(),
  description: z.string().trim().min(5, "Description must be at least 5 characters.").optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  icon: z.string().trim().optional(),
  isFeatured: z.boolean().optional(),
  files: z
    .array(
      z.object({
        path: z.string().trim().min(1, "File path is required."),
        content: z.string(),
      })
    )
    .min(1, "Template must include at least one starter file.")
    .optional(),
});

/**
 * PATCH /api/templates/[id]
 * Admin & Moderator: Edit an existing template.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getAuthSession();
  if (!session?.user?.id || (session.user.role !== "admin" && session.user.role !== "moderator")) {
    return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const template = await db.template.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid update payload." },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check slug collision if slug changed
    if (data.slug && data.slug !== template.slug) {
      const slugCollision = await db.template.findFirst({
        where: {
          slug: data.slug,
          NOT: { id: template.id },
        },
      });
      if (slugCollision) {
        return NextResponse.json(
          { error: `Slug "${data.slug}" is already in use by another template.` },
          { status: 409 }
        );
      }
    }

    const formattedTags =
      data.tags !== undefined
        ? Array.isArray(data.tags)
          ? data.tags.join(", ")
          : data.tags.trim()
        : undefined;

    const updated = await db.template.update({
      where: { id: template.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.description !== undefined && { description: data.description }),
        ...(formattedTags !== undefined && { tags: formattedTags }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
        ...(data.files !== undefined && {
          files: data.files,
          fileCount: data.files.length,
        }),
      },
    });

    // Record admin activity log
    try {
      await db.adminActivityLog.create({
        data: {
          adminUserId: session.user.id,
          action: "template_updated",
          targetType: "template",
          targetId: template.id,
          details: {
            slug: updated.slug,
            name: updated.name,
            fileCount: updated.fileCount,
          },
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      template: {
        id: updated.id,
        slug: updated.slug,
        name: updated.name,
        description: updated.description,
        category: updated.category,
        tags: updated.tags ? updated.tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
        icon: updated.icon || "Sparkles",
        isFeatured: updated.isFeatured,
        isCustom: updated.isCustom,
        fileCount: updated.fileCount,
        files: updated.files,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Update template error:", error);
    return NextResponse.json(
      { error: "Failed to update template." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates/[id]
 * Admin & Moderator: Delete ANY template (built-in or custom).
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getAuthSession();
  if (!session?.user?.id || (session.user.role !== "admin" && session.user.role !== "moderator")) {
    return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const template = await db.template.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }

    // Admins and moderators can delete ANY template without artificial "Protected" blocks.
    await db.template.delete({
      where: { id: template.id },
    });

    // Record admin activity log
    try {
      await db.adminActivityLog.create({
        data: {
          adminUserId: session.user.id,
          action: "template_deleted",
          targetType: "template",
          targetId: template.id,
          details: { slug: template.slug, name: template.name },
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Template "${template.name}" deleted successfully.`,
      deletedSlug: template.slug,
      deletedId: template.id,
    });
  } catch (error) {
    console.error("Delete template error:", error);
    return NextResponse.json(
      { error: "Failed to delete template." },
      { status: 500 }
    );
  }
}
