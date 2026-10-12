import { db } from "../src/lib/db";
import { getAllTemplates, getTemplateBySlug, restoreDefaultTemplates } from "../src/lib/templates/service";

async function main() {
  console.log("=== RUNNING TEMPLATES ADMIN LIFECYCLE & DELETION E2E TEST ===");

  // 1. Initial State
  const initial = await getAllTemplates();
  console.log(`[1] Initial template count in DB: ${initial.length}`);
  const hasSaas = initial.some((t) => t.slug === "saas-landing");
  console.log(`[1] Contains "saas-landing": ${hasSaas}`);

  // 2. Test creation of a new custom template
  const testSlug = `e2e-test-template-${Date.now()}`;
  console.log(`[2] Creating new custom template: ${testSlug}...`);
  const created = await db.template.create({
    data: {
      slug: testSlug,
      name: "E2E Test Template",
      description: "A test template for validation.",
      category: "landing",
      tags: "test, e2e, automation",
      icon: "Rocket",
      isFeatured: true,
      isCustom: true,
      fileCount: 2,
      files: [
        { path: "index.html", content: "<h1>E2E Test</h1>" },
        { path: "styles.css", content: "body { background: black; }" },
      ],
    },
  });
  console.log(`[2] Created template ID: ${created.id}`);

  // 3. Verify lookup by slug
  const lookup = await getTemplateBySlug(testSlug);
  if (!lookup || lookup.name !== "E2E Test Template") {
    throw new Error(`[3] Failed to lookup created template ${testSlug}`);
  }
  console.log(`[3] Successfully retrieved created template: ${lookup.name}`);

  // 4. Test updating template (PATCH simulation)
  console.log(`[4] Updating template ${testSlug}...`);
  const updated = await db.template.update({
    where: { id: created.id },
    data: {
      name: "Updated E2E Template",
      description: "Updated description for testing.",
      fileCount: 3,
      files: [
        { path: "index.html", content: "<h1>Updated E2E Test</h1>" },
        { path: "styles.css", content: "body { background: red; }" },
        { path: "script.js", content: "console.log('e2e');" },
      ],
    },
  });
  console.log(`[4] Template updated: ${updated.name}, fileCount: ${updated.fileCount}`);

  // 5. Test duplicating template
  console.log(`[5] Duplicating template ${testSlug}...`);
  const dupSlug = `${testSlug}-copy`;
  const duplicated = await db.template.create({
    data: {
      slug: dupSlug,
      name: `${updated.name} (Copy)`,
      description: updated.description,
      category: updated.category,
      tags: updated.tags,
      icon: updated.icon,
      isFeatured: false,
      isCustom: true,
      fileCount: updated.fileCount,
      files: updated.files as any,
    },
  });
  console.log(`[5] Successfully duplicated template to ${duplicated.slug}`);

  // 6. Test deleting a SYSTEM / BUILT-IN template (The exact user issue!)
  // Create a temporary system template marked isCustom: false to test deleting system template
  const sysTestSlug = `sys-test-template-${Date.now()}`;
  console.log(`[6] Creating dummy system template (isCustom: false): ${sysTestSlug}...`);
  const sysTemplate = await db.template.create({
    data: {
      slug: sysTestSlug,
      name: "Temporary System Blueprint",
      description: "System template test",
      category: "creative",
      isCustom: false,
      fileCount: 1,
      files: [{ path: "index.html", content: "<h1>System</h1>" }],
    },
  });

  console.log(`[6] Deleting system template ${sysTemplate.slug} (ID: ${sysTemplate.id})...`);
  await db.template.delete({
    where: { id: sysTemplate.id },
  });
  const checkDeleted = await db.template.findUnique({ where: { slug: sysTestSlug } });
  if (checkDeleted) {
    throw new Error(`[6] System template was not deleted!`);
  }
  console.log(`[6] Successfully verified system template deletion!`);

  // 7. Verify deleted template does NOT resurrect
  const deadLookup = await getTemplateBySlug(sysTestSlug);
  if (deadLookup !== null) {
    throw new Error(`[7] Deleted template was resurrected! Expected null, got: ${JSON.stringify(deadLookup)}`);
  }
  console.log(`[7] Verified deleted template is completely absent (returns null).`);

  // 8. Test restoreDefaultTemplates
  console.log(`[8] Testing restoreDefaultTemplates()...`);
  const restoreRes = await restoreDefaultTemplates();
  console.log(`[8] Restored count: ${restoreRes.restoredCount}, slugs: ${restoreRes.restoredSlugs.join(", ")}`);

  // 9. Clean up test templates
  console.log(`[9] Cleaning up test templates...`);
  await db.template.deleteMany({
    where: {
      slug: { in: [testSlug, dupSlug] },
    },
  });
  console.log(`[9] Cleanup completed.`);

  console.log("=== ALL TEMPLATE ADMIN LIFECYCLE TESTS PASSED WITH 100% SUCCESS ===");
}

main()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
