// scripts/sync-templates.ts
import { db } from "../src/lib/db";
import { PORTFOLIO_FILES } from "../src/lib/templates/portfolio";
import { CLUB_EVENT_FILES } from "../src/lib/templates/club-event";
import { MULTI_PAGE_FILES } from "../src/lib/templates/multi-page";

async function main() {
  console.log("=== MINDSPACE TEMPLATE SYNCHRONIZATION ===");

  const templatesToUpdate = [
    {
      slug: "developer-portfolio",
      name: "Simple Portfolio",
      description: "Hero, about, work showcase with interactive photo slots, and contact — clean, classic professional aesthetic.",
      category: "portfolio",
      tags: "developer, portfolio, projects, classic, minimal",
      icon: "User",
      isFeatured: true,
      fileCount: PORTFOLIO_FILES.length,
      files: PORTFOLIO_FILES,
    },
    {
      slug: "portfolio",
      name: "Simple Portfolio",
      description: "Hero, about, work showcase with interactive photo slots, and contact — clean, classic professional aesthetic.",
      category: "portfolio",
      tags: "developer, portfolio, projects, classic, minimal",
      icon: "User",
      isFeatured: true,
      fileCount: PORTFOLIO_FILES.length,
      files: PORTFOLIO_FILES,
    },
    {
      slug: "club-event",
      name: "Club / Event Landing",
      description: "Banner, keynote speakers, interactive schedule, and RSVP form — restrained summit design.",
      category: "club",
      tags: "club, event, summit, rsvp, schedule",
      icon: "LayoutTemplate",
      isFeatured: false,
      fileCount: CLUB_EVENT_FILES.length,
      files: CLUB_EVENT_FILES,
    },
    {
      slug: "multi-page-studio",
      name: "Multi-Page Site",
      description: "Home, about, and contact pages sharing a unified stylesheet, navigation, and studio photo slots.",
      category: "multi-page",
      tags: "multi-page, agency, portfolio, studio, clean",
      icon: "Layers",
      isFeatured: true,
      fileCount: MULTI_PAGE_FILES.length,
      files: MULTI_PAGE_FILES,
    },
    {
      slug: "multi-page",
      name: "Multi-Page Site",
      description: "Home, about, and contact pages sharing a unified stylesheet, navigation, and studio photo slots.",
      category: "multi-page",
      tags: "multi-page, agency, portfolio, studio, clean",
      icon: "Layers",
      isFeatured: true,
      fileCount: MULTI_PAGE_FILES.length,
      files: MULTI_PAGE_FILES,
    },
  ];

  for (const t of templatesToUpdate) {
    const existing = await db.template.findUnique({ where: { slug: t.slug } });
    if (existing) {
      await db.template.update({
        where: { slug: t.slug },
        data: {
          name: t.name,
          description: t.description,
          fileCount: t.fileCount,
          files: t.files,
        },
      });
      console.log(`[DB] Updated template slug: ${t.slug} (${t.fileCount} files)`);
    } else {
      await db.template.create({
        data: {
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
        },
      });
      console.log(`[DB] Created template slug: ${t.slug} (${t.fileCount} files)`);
    }
  }

  console.log("=== TEMPLATE SYNCHRONIZATION COMPLETE ===");
}

main()
  .catch((err) => {
    console.error("Failed to sync templates:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
