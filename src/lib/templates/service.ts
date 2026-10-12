import { db } from "@/lib/db";
import { BUILT_IN_TEMPLATES, type StarterFile } from "./catalog";

export type UnifiedTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  icon: string;
  isFeatured: boolean;
  isCustom: boolean;
  fileCount: number;
  files: StarterFile[];
  createdAt?: string;
};

let hasCheckedInitialization = false;

/**
 * Ensures built-in templates are seeded in the database only once on initial setup.
 */
export async function ensureTemplatesInitialized(): Promise<void> {
  if (hasCheckedInitialization) return;
  try {
    const count = await db.template.count();
    if (count === 0) {
      await seedBuiltInTemplates();
    }
    hasCheckedInitialization = true;
  } catch (err) {
    console.error("Error checking template initialization:", err);
  }
}

/**
 * Seeds missing built-in templates into the database.
 */
export async function seedBuiltInTemplates(): Promise<string[]> {
  const seededSlugs: string[] = [];
  try {
    for (const t of BUILT_IN_TEMPLATES) {
      const exists = await db.template.findUnique({ where: { slug: t.slug } });
      if (!exists) {
        await db.template.create({
          data: {
            slug: t.slug,
            name: t.name,
            description: t.description,
            category: t.category,
            tags: t.tags.join(", "),
            icon: t.icon,
            isFeatured: t.isFeatured,
            isCustom: false,
            fileCount: t.fileCount,
            files: t.files,
          },
        });
        seededSlugs.push(t.slug);
      }
    }
  } catch (err) {
    console.error("Failed to seed built-in templates:", err);
  }
  return seededSlugs;
}

/**
 * Restores any missing default system templates into the database.
 * Does not overwrite existing or custom templates.
 */
export async function restoreDefaultTemplates(): Promise<{ restoredCount: number; restoredSlugs: string[] }> {
  const restoredSlugs = await seedBuiltInTemplates();
  return {
    restoredCount: restoredSlugs.length,
    restoredSlugs,
  };
}

/**
 * Returns all available templates from the database (including custom admin templates).
 * Falls back to in-memory built-ins only if DB is completely unavailable.
 */
export async function getAllTemplates(): Promise<UnifiedTemplate[]> {
  try {
    await ensureTemplatesInitialized();

    const dbTemplates = await db.template.findMany({
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    });

    return dbTemplates.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      category: t.category,
      tags: t.tags ? t.tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
      icon: t.icon || "Sparkles",
      isFeatured: t.isFeatured,
      isCustom: t.isCustom,
      fileCount: t.fileCount,
      files: (t.files as StarterFile[]) || [],
      createdAt: t.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error("Error fetching templates from DB:", err);
    // Fallback to built-ins only on DB error
    return BUILT_IN_TEMPLATES.map((t) => ({
      id: t.slug,
      slug: t.slug,
      name: t.name,
      description: t.description,
      category: t.category,
      tags: t.tags,
      icon: t.icon,
      isFeatured: t.isFeatured,
      isCustom: false,
      fileCount: t.fileCount,
      files: t.files,
    }));
  }
}

/**
 * Gets a single template by its slug (checks DB first).
 * Does not revive deleted templates unless DB is unreachable.
 */
export async function getTemplateBySlug(slug: string): Promise<UnifiedTemplate | null> {
  if (slug === "blank") {
    return {
      id: "blank",
      slug: "blank",
      name: "Start Blank",
      description: "An empty project — start from nothing and shape it yourself.",
      category: "blank",
      tags: ["blank", "empty"],
      icon: "Sparkles",
      isFeatured: false,
      isCustom: false,
      fileCount: 0,
      files: [],
    };
  }

  try {
    const dbTemplate = await db.template.findUnique({
      where: { slug },
    });
    if (dbTemplate) {
      return {
        id: dbTemplate.id,
        slug: dbTemplate.slug,
        name: dbTemplate.name,
        description: dbTemplate.description,
        category: dbTemplate.category,
        tags: dbTemplate.tags ? dbTemplate.tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
        icon: dbTemplate.icon || "Sparkles",
        isFeatured: dbTemplate.isFeatured,
        isCustom: dbTemplate.isCustom,
        fileCount: dbTemplate.fileCount,
        files: (dbTemplate.files as StarterFile[]) || [],
        createdAt: dbTemplate.createdAt.toISOString(),
      };
    }

    // Also support legacy aliases (e.g. "portfolio" -> "developer-portfolio", "multi-page" -> "multi-page-studio")
    if (slug === "portfolio") return getTemplateBySlug("developer-portfolio");
    if (slug === "multi-page") return getTemplateBySlug("multi-page-studio");

    return null;
  } catch (err) {
    console.error(`Error looking up template ${slug}:`, err);
    // Fallback to built-ins only on connection failure
    const matchedBuiltIn = BUILT_IN_TEMPLATES.find((t) => t.slug === slug);
    if (matchedBuiltIn) {
      return {
        id: matchedBuiltIn.slug,
        slug: matchedBuiltIn.slug,
        name: matchedBuiltIn.name,
        description: matchedBuiltIn.description,
        category: matchedBuiltIn.category,
        tags: matchedBuiltIn.tags,
        icon: matchedBuiltIn.icon,
        isFeatured: matchedBuiltIn.isFeatured,
        isCustom: false,
        fileCount: matchedBuiltIn.fileCount,
        files: matchedBuiltIn.files,
      };
    }
    return null;
  }
}
