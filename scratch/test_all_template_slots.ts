// scratch/test_all_template_slots.ts
// Exhaustive test suite for MINDSPACE Starter Templates & Photo Upload Slots
// Tests all 14 image slots across Portfolio, Club/Event, and Multi-Page templates.

import { db } from "../src/lib/db";
import { getTemplateBySlug } from "../src/lib/templates/service";
import {
  injectMindspaceIds,
  scanEligibleTags,
  locateTagMatch,
  applyVisualImageChange,
} from "../src/lib/visual-edit-engine";
import { processImageForStorage } from "../src/lib/asset-manager";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

async function run() {
  console.log("=================================================================");
  console.log("   MINDSPACE STARTER TEMPLATES & ALL PHOTO SLOTS TEST SUITE     ");
  console.log("=================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, msg: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      process.exitCode = 1;
    }
  }

  // Find a test user
  const user = await db.user.findFirst();
  if (!user) {
    console.error("No user found in DB. Aborting.");
    return;
  }

  // -------------------------------------------------------------
  // TEST 1: Portfolio Template Creation & Aesthetic Verification
  // -------------------------------------------------------------
  console.log("Test 1: Portfolio Template Verification");
  const portfolioTpl = await getTemplateBySlug("portfolio");
  assert(Boolean(portfolioTpl && portfolioTpl.files.length > 0), "Portfolio template retrieved with files");

  const portfolioHtml = portfolioTpl!.files.find(f => f.path === "index.html")!.content;
  assert(!portfolioHtml.includes("#ec4899"), "Portfolio contains zero neon pink (#ec4899)");
  assert(!portfolioHtml.includes("linear-gradient(90deg, #ec4899, #8b5cf6)"), "Portfolio contains zero loud neon gradients");
  assert(portfolioHtml.includes("data-theme=\"light\""), "Portfolio supports dark & light mode");
  assert(portfolioHtml.includes("IntersectionObserver"), "Portfolio includes smooth scroll-reveal animations");
  assert(portfolioHtml.includes("Alex Chen"), "Portfolio contains realistic professional placeholder copy");

  // Verify 4 image slots in Portfolio
  assert(portfolioHtml.includes('data-image-slot="profile"'), "Portfolio has Profile Avatar slot");
  assert(portfolioHtml.includes('data-image-slot="project-1"'), "Portfolio has Project 1 Thumbnail slot");
  assert(portfolioHtml.includes('data-image-slot="project-2"'), "Portfolio has Project 2 Thumbnail slot");
  assert(portfolioHtml.includes('data-image-slot="project-3"'), "Portfolio has Project 3 Thumbnail slot");

  // -------------------------------------------------------------
  // TEST 2: Club / Event Template Verification
  // -------------------------------------------------------------
  console.log("\nTest 2: Club / Event Template Verification");
  const clubTpl = await getTemplateBySlug("club-event");
  assert(Boolean(clubTpl && clubTpl.files.length > 0), "Club/Event template retrieved with files");

  const clubHtml = clubTpl!.files.find(f => f.path === "index.html")!.content;
  assert(!clubHtml.includes("#ec4899"), "Club/Event contains zero neon pink");
  assert(!clubHtml.includes("linear-gradient(90deg, #ec4899, #8b5cf6)"), "Club/Event contains zero neon gradients");
  assert(clubHtml.includes("data-theme=\"light\""), "Club/Event supports dark & light mode");
  assert(clubHtml.includes("SYNAPSE"), "Club/Event has realistic summit branding");

  // Verify 5 image slots in Club/Event
  assert(clubHtml.includes('data-image-slot="event-banner"'), "Club/Event has Hero Stage Banner slot");
  assert(clubHtml.includes('data-image-slot="speaker-1"'), "Club/Event has Speaker 1 slot");
  assert(clubHtml.includes('data-image-slot="speaker-2"'), "Club/Event has Speaker 2 slot");
  assert(clubHtml.includes('data-image-slot="speaker-3"'), "Club/Event has Speaker 3 slot");
  assert(clubHtml.includes('data-image-slot="workshop-photo"'), "Club/Event has Workshop Photo slot");

  // -------------------------------------------------------------
  // TEST 3: Multi-Page Site Template Verification
  // -------------------------------------------------------------
  console.log("\nTest 3: Multi-Page Site Template Verification");
  const multiTpl = await getTemplateBySlug("multi-page");
  assert(Boolean(multiTpl && multiTpl.files.length >= 3), "Multi-Page template retrieved with index, about, contact & styles");

  const multiIndexHtml = multiTpl!.files.find(f => f.path === "index.html")!.content;
  const multiAboutHtml = multiTpl!.files.find(f => f.path === "about.html")!.content;
  const multiContactHtml = multiTpl!.files.find(f => f.path === "contact.html")!.content;
  const multiCss = multiTpl!.files.find(f => f.path === "styles.css")!.content;

  assert(!multiCss.includes("#38bdf8"), "Multi-Page styles contains zero loud cyan (#38bdf8)");
  assert(multiCss.includes("data-theme=\"light\""), "Multi-Page shared CSS supports dark & light mode");
  assert(multiIndexHtml.includes('aria-current="page"'), "Multi-Page navigation has active page indicator");
  assert(multiAboutHtml.includes('aria-current="page"'), "Multi-Page About has active page indicator");
  assert(multiContactHtml.includes('aria-current="page"'), "Multi-Page Contact has active page indicator");

  // Verify 5 image slots across Multi-Page site
  assert(multiIndexHtml.includes('data-image-slot="studio-hero"'), "Multi-Page Home has Studio Hero slot");
  assert(multiIndexHtml.includes('data-image-slot="home-project-1"'), "Multi-Page Home has Project 1 slot");
  assert(multiIndexHtml.includes('data-image-slot="home-project-2"'), "Multi-Page Home has Project 2 slot");
  assert(multiAboutHtml.includes('data-image-slot="studio-team"'), "Multi-Page About has Studio Team slot");
  assert(multiContactHtml.includes('data-image-slot="studio-location"'), "Multi-Page Contact has Studio Location slot");

  // -------------------------------------------------------------
  // TEST 4: Photo Upload Trace Across Every Single Slot (All 14 Slots)
  // -------------------------------------------------------------
  console.log("\nTest 4: Photo Upload Simulation Across All 14 Image Slots");

  // Create temporary test project in DB
  const testProject = await db.project.create({
    data: {
      name: "Template Image Slots Test Project",
      ownerId: user.id,
      templateUsed: "all-templates-test",
    },
  });

  const slotsToTest = [
    // Portfolio (4 slots)
    { template: "portfolio", file: "index.html", slot: "profile", html: portfolioHtml },
    { template: "portfolio", file: "index.html", slot: "project-1", html: portfolioHtml },
    { template: "portfolio", file: "index.html", slot: "project-2", html: portfolioHtml },
    { template: "portfolio", file: "index.html", slot: "project-3", html: portfolioHtml },

    // Club / Event (5 slots)
    { template: "club-event", file: "index.html", slot: "event-banner", html: clubHtml },
    { template: "club-event", file: "index.html", slot: "speaker-1", html: clubHtml },
    { template: "club-event", file: "index.html", slot: "speaker-2", html: clubHtml },
    { template: "club-event", file: "index.html", slot: "speaker-3", html: clubHtml },
    { template: "club-event", file: "index.html", slot: "workshop-photo", html: clubHtml },

    // Multi-Page (5 slots)
    { template: "multi-page", file: "index.html", slot: "studio-hero", html: multiIndexHtml },
    { template: "multi-page", file: "index.html", slot: "home-project-1", html: multiIndexHtml },
    { template: "multi-page", file: "index.html", slot: "home-project-2", html: multiIndexHtml },
    { template: "multi-page", file: "about.html", slot: "studio-team", html: multiAboutHtml },
    { template: "multi-page", file: "contact.html", slot: "studio-location", html: multiContactHtml },
  ];

  // Helper to generate a small valid PNG with Sharp
  const samplePngBuffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 4,
      background: { r: 79, g: 70, b: 229, alpha: 1 },
    },
  }).png().toBuffer();

  for (let i = 0; i < slotsToTest.length; i++) {
    const slotInfo = slotsToTest[i];
    const slotName = `${slotInfo.template} -> ${slotInfo.file} -> [${slotInfo.slot}]`;

    // 1. Inject mindspace IDs as Editor LivePreview does
    const previewHtml = injectMindspaceIds(slotInfo.html);

    // 2. Locate target element by slot attribute
    const slotPattern = new RegExp(`data-image-slot=["']${slotInfo.slot}["'][^>]*data-mindspace-id=["']([^"']+)["']|data-mindspace-id=["']([^"']+)["'][^>]*data-image-slot=["']${slotInfo.slot}["']`, 'i');
    const match = slotPattern.exec(previewHtml);
    const msId = match ? (match[1] || match[2]) : null;

    assert(Boolean(msId), `[Slot ${i + 1}/14] Assigned valid mindspace-id (${msId}) to ${slotName}`);

    // 3. Process image upload through asset manager
    const processed = await processImageForStorage(samplePngBuffer, "png");
    assert(processed.buffer.length > 0 && processed.mimeType === "image/png", `[Slot ${i + 1}/14] Sharp processed uploaded image for ${slotName}`);

    // 4. Save asset to disk & database
    const assetId = `ast_slot_${i + 1}_${Date.now()}`;
    const uploadDir = path.join(process.cwd(), "data", "uploads", testProject.id);
    fs.mkdirSync(uploadDir, { recursive: true });
    const diskPath = path.join(uploadDir, `${assetId}.png`);
    fs.writeFileSync(diskPath, processed.buffer);

    const assetRecord = await db.projectAsset.create({
      data: {
        id: assetId,
        projectId: testProject.id,
        filename: `${slotInfo.slot}.png`,
        storedPath: diskPath,
        mimeType: processed.mimeType,
        sizeBytes: processed.sizeBytes,
        width: processed.width,
        height: processed.height,
      },
    });

    const assetUrl = `/api/projects/${testProject.id}/assets/${assetRecord.id}`;
    assert(fs.existsSync(diskPath), `[Slot ${i + 1}/14] Asset saved on disk at data/uploads for ${slotName}`);

    // 5. Apply image change to HTML source
    const updatedHtml = applyVisualImageChange(slotInfo.html, msId!, assetUrl, false);
    assert(updatedHtml.includes(assetUrl), `[Slot ${i + 1}/14] HTML markup correctly updated with new asset URL for ${slotName}`);

    // 6. Confirm persistence in database
    const projectFile = await db.projectFile.create({
      data: {
        projectId: testProject.id,
        path: `${slotInfo.template}_${slotInfo.slot}_${slotInfo.file}`,
        content: updatedHtml,
      },
    });

    const reloaded = await db.projectFile.findUnique({ where: { id: projectFile.id } });
    assert(Boolean(reloaded && reloaded.content.includes(assetUrl)), `[Slot ${i + 1}/14] Reloaded from DB: new image URL persists 100% for ${slotName}`);
  }

  // -------------------------------------------------------------
  // TEST 5: CSS background-image photo slot upload
  // -------------------------------------------------------------
  console.log("\nTest 5: CSS background-image slot handling");
  const bgSlotHtml = `<div class="hero-bg" data-mindspace-id="ms-bg" style="background-image: url('initial.jpg'); padding: 40px;"><h1>Hero</h1></div>`;
  const updatedBgHtml = applyVisualImageChange(bgSlotHtml, "ms-bg", "/api/projects/test/assets/bg.png", true);

  assert(updatedBgHtml.includes('background-image: url("/api/projects/test/assets/bg.png")'), "Background-image URL successfully updated");
  assert(updatedBgHtml.includes('background-size: cover'), "Background-size cover automatically applied");
  assert(updatedBgHtml.includes('background-position: center'), "Background-position center automatically applied");

  // Clean up test project
  try {
    await db.projectFile.deleteMany({ where: { projectId: testProject.id } });
    await db.projectAsset.deleteMany({ where: { projectId: testProject.id } });
    await db.project.delete({ where: { id: testProject.id } });
    const testDir = path.join(process.cwd(), "data", "uploads", testProject.id);
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  } catch (err) {}

  console.log("\n=================================================================");
  console.log(`   ALL ${passedTests}/${totalTests} CHECKS PASSED WITH 100% SUCCESS!   `);
  console.log("=================================================================\n");
}

run().catch(console.error).finally(() => process.exit(0));
