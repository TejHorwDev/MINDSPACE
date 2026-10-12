import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAllTemplates } from "@/lib/templates/service";

const createTemplateSchema = z.object({
  name: z.string().trim().min(2, "Name is required (min 2 chars)."),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required.")
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and dashes."),
  category: z.string().trim().min(1, "Category is required."),
  description: z.string().trim().min(5, "Description must be at least 5 characters."),
  tags: z.string().trim().default(""),
  icon: z.string().trim().default("Sparkles"),
  isFeatured: z.boolean().default(false),
  files: z
    .array(
      z.object({
        path: z.string().trim().min(1, "File path is required."),
        content: z.string(),
      })
    )
    .min(1, "Template must include at least one starter file."),
});

/**
 * GET /api/templates
 * Returns all templates (including custom admin templates) with optional category and search filters.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.toLowerCase().trim();

    let templates = await getAllTemplates();

    if (category && category !== "all") {
      templates = templates.filter(
        (t) => t.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (search) {
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          t.description.toLowerCase().includes(search) ||
          t.tags.some((tag) => tag.toLowerCase().includes(search)) ||
          t.category.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Fetch templates error:", error);
    return NextResponse.json(
      { error: "Failed to load templates." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates
 * Admin only: Create a new custom template in the database.
 */
export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id || (session.user.role !== "admin" && session.user.role !== "moderator")) {
    return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid template data." },
        { status: 400 }
      );
    }

    const { slug, name, description, category, tags, icon, isFeatured, files } = parsed.data;

    const existing = await db.template.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "A template with this slug already exists." },
        { status: 409 }
      );
    }

    const created = await db.template.create({
      data: {
        slug,
        name,
        description,
        category,
        tags,
        icon,
        isFeatured,
        isCustom: true,
        fileCount: files.length,
        files,
      },
    });

    try {
      await db.adminActivityLog.create({
        data: {
          adminUserId: session.user.id,
          action: "template_created",
          targetType: "template",
          targetId: created.id,
          details: { slug: created.slug, name: created.name, fileCount: created.fileCount },
        },
      });
    } catch {}

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create template error:", error);
    return NextResponse.json(
      { error: "Failed to create template." },
      { status: 500 }
    );
  }
}
