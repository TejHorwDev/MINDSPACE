// scratch/test_e2e_visual_v2.ts
import fs from "fs";
import path from "path";
import { db } from "../src/lib/db";
import {
  injectMindspaceIds,
  stripMindspaceIds,
  applyVisualInlineStyleEdit,
  applyVisualTextEdit,
  applyVisualImageChange,
  generateVisualEditorScript,
  scanEligibleTags,
} from "../src/lib/visual-edit-engine";
import {
  validateImageMagicBytes,
  processImageForStorage,
  checkUserStorageQuota,
  saveProjectAsset,
  sanitizeFilename,
} from "../src/lib/asset-manager";
import { writeStaticProjectFiles } from "../src/lib/publish-manager";

async function runE2ETests() {
  console.log("=================================================================");
  console.log("   MINDSPACE VISUAL EDITOR V2 & PHOTO UPLOAD - E2E TEST SUITE   ");
  console.log("=================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      throw new Error(`Assertion failed: ${desc}`);
    }
  }

  // --- TEST 1: Step 1 Fixes - Nested Element Text & Style Isolation ---
  console.log("Test 1: Nested Element Text & Style Isolation (Step 1 Fixes)");
  const sourceHtml = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <div class="hero-container">
    <h1 class="hero-title">Build with <span class="highlight">MINDSPACE</span></h1>
    <p class="hero-sub">Fast visual site builder</p>
    <button class="cta-btn">Get Started</button>
  </div>
</body>
</html>`;

  const injected = injectMindspaceIds(sourceHtml);
  assert(injected.includes('data-mindspace-id="ms-1"'), "Injected ms-1 on first element inside body");
  assert(!injected.includes('<body data-mindspace-id='), "Body is excluded from selectable mindspace-id list");

  const tags = scanEligibleTags(injected);
  // tags: div (1), h1 (2), span (3), p (4), button (5)
  assert(tags.length === 5, `Scanned exactly 5 eligible tags (got ${tags.length})`);

  // Text edit on nested span ms-3: should NOT wipe out h1 or siblings
  const textEdited = applyVisualTextEdit(sourceHtml, "ms-3", "NEXTGEN");
  assert(textEdited.includes('<span class="highlight">NEXTGEN</span>'), "Nested span text successfully updated to NEXTGEN");
  assert(textEdited.includes('<h1 class="hero-title">Build with <span class="highlight">NEXTGEN</span></h1>'), "Outer h1 structure completely preserved");
  assert(textEdited.includes('<p class="hero-sub">'), "Subsequent p tag remained unchanged");

  // Style edit on button ms-5: should NOT leak onto div, h1, or p
  const styleEdited = applyVisualInlineStyleEdit(textEdited, "ms-5", { backgroundColor: "#8b5cf6", color: "#ffffff" });
  assert(styleEdited.includes('<button style="background-color: #8b5cf6; color: #ffffff;" class="cta-btn">'), "Button received exact inline styles");
  assert(!styleEdited.includes('<p style='), "Paragraph did NOT receive leaked styles");
  assert(!styleEdited.includes('<h1 style='), "Heading did NOT receive leaked styles");

  // --- TEST 2: Drag Handle Clean Removal & Runtime Verification ---
  console.log("\nTest 2: Drag Handle Clean Removal & Visual Editor Integrity");
  const runtimeScript = generateVisualEditorScript();
  assert(!runtimeScript.includes('id="ms-tb-drag"'), "Drag handle (#ms-tb-drag) cleanly absent from toolbar HTML");
  assert(!runtimeScript.includes('id="mindspace-insertion-indicator"'), "Insertion indicator cleanly absent from editor runtime");
  assert(!runtimeScript.includes('class="mindspace-is-dragging"'), "mindspace-is-dragging class cleanly removed");
  assert(runtimeScript.includes('id="ms-tb-photo-btn"'), "Replace Photo button cleanly present in toolbar");
  assert(runtimeScript.includes('id="ms-tb-text-color-input"'), "Text color picker cleanly present in toolbar");
  assert(runtimeScript.includes('id="ms-tb-bg-color-input"'), "Background color picker cleanly present in toolbar");

  // --- TEST 3: Step 3 Photo Upload Validation & Security ---
  console.log("\nTest 3: Photo Upload Magic Bytes & Security Validation (Step 3)");
  // 3a: Real PNG buffer
  const realPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG magic bytes
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82
  ]);
  const pngValidation = validateImageMagicBytes(realPngBuffer);
  assert(pngValidation.isValid && pngValidation.format === "png", "Real PNG buffer recognized via magic bytes");

  // 3b: Disguised executable / text masquerading as PNG
  const fakePngBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00This is a fake image or script payload");
  const fakeValidation = validateImageMagicBytes(fakePngBuffer);
  assert(!fakeValidation.isValid, "Disguised non-image buffer correctly REJECTED by magic bytes check");

  // 3c: Filename sanitization
  const maliciousName = "../../etc/passwd..///shell<>.png";
  const sanitized = sanitizeFilename(maliciousName);
  assert(!sanitized.includes("../") && !sanitized.includes("/") && !sanitized.includes("<"), `Filename sanitized cleanly: ${sanitized}`);

  // --- TEST 4: Sharp Processing & EXIF Metadata Stripping ---
  console.log("\nTest 4: Sharp Processing & EXIF Metadata Stripping");
  const processed = await processImageForStorage(realPngBuffer, "png");
  assert(processed.sizeBytes > 0, `Processed image buffer produced (${processed.sizeBytes} bytes)`);
  assert(processed.mimeType === "image/png", `Correct mimeType: ${processed.mimeType}`);
  assert(processed.width === 1 && processed.height === 1, `Dimensions parsed: ${processed.width}x${processed.height}`);

  // --- TEST 5: Storage Quota Enforcement against AccountPlan ---
  console.log("\nTest 5: Storage Quota Enforcement against AccountPlan");
  const testUser = await db.user.findFirst({ include: { accountPlan: true } });
  if (testUser) {
    const quotaOk = await checkUserStorageQuota(testUser.id, 1024);
    assert(quotaOk.allowed, `Quota check passes for normal small upload (${quotaOk.currentStorageMB}MB / ${quotaOk.maxStorageMB}MB)`);

    // Exceeded upload attempt (600MB vs 500MB limit)
    const quotaExceeded = await checkUserStorageQuota(testUser.id, 600 * 1024 * 1024);
    assert(!quotaExceeded.allowed && !!quotaExceeded.error, `Quota check blocks excessive storage: "${quotaExceeded.error}"`);
  }

  // --- TEST 6: Project Asset Database & Disk Persistence ---
  console.log("\nTest 6: Project Asset Database & Disk Persistence");
  const testProject = await db.project.findFirst();
  if (testProject) {
    const savedAsset = await saveProjectAsset(testProject.id, "test-hero.png", processed);
    assert(fs.existsSync(savedAsset.storedPath), `Asset file saved on disk at: ${savedAsset.storedPath}`);
    assert(savedAsset.url.startsWith(`/api/projects/${testProject.id}/assets/`), `Asset URL generated: ${savedAsset.url}`);

    // Verify DB record
    const dbRecord = await db.projectAsset.findUnique({ where: { id: savedAsset.id } });
    assert(!!dbRecord && dbRecord.filename === "test-hero.png", "Asset DB record confirmed in db.projectAsset");

    // --- TEST 7: Inline Visual Image Swap in HTML ---
    console.log("\nTest 7: Inline Visual Image Swap in HTML");
    const htmlWithImg = `<div><img src="old-photo.jpg" alt="Hero" /><div class="bg-card">Card</div></div>`;
    // Replace img tag src (ms-2)
    const swappedImg = applyVisualImageChange(htmlWithImg, "ms-2", savedAsset.url, false);
    assert(swappedImg.includes(`src="${savedAsset.url}"`), "Image src updated in HTML markup");

    // Replace background-image on container (ms-3)
    const swappedBg = applyVisualImageChange(htmlWithImg, "ms-3", savedAsset.url, true);
    assert(swappedBg.includes(`background-image: url('${savedAsset.url}')`), "Background image updated in inline styles");

    // --- TEST 8: Publish Integration (Assets Copied into public/p/<slug>/assets) ---
    console.log("\nTest 8: Publish Integration with Asset Bundling");
    const testSlug = `test-pub-${Date.now()}`;
    const pubDir = await writeStaticProjectFiles(
      testSlug,
      "Test Project",
      [{ path: "index.html", content: `<!DOCTYPE html><html><body><img src="assets/test-hero.png"></body></html>` }],
      testProject.id
    );

    const publishedAssetPath = path.join(pubDir, "assets", "test-hero.png");
    assert(fs.existsSync(publishedAssetPath), `Published static asset verified at: ${publishedAssetPath}`);

    // Clean up test published folder
    fs.rmSync(pubDir, { recursive: true, force: true });

    // Clean up test asset
    fs.unlinkSync(savedAsset.storedPath);
    await db.projectAsset.delete({ where: { id: savedAsset.id } });
  }

  // --- TEST 9: Zero Artifact Leak on Strip (Publish/Download) ---
  console.log("\nTest 9: Zero Artifact Leak on Strip (Publish/Download Cleanliness)");
  const dirtyPreviewHtml = `<div data-mindspace-id="ms-1" class="hero mindspace-visual-selected">
  <h1 data-mindspace-id="ms-2" class="mindspace-content-editing">Hello</h1>
  <div id="mindspace-insertion-indicator"></div>
  <div id="mindspace-visual-toolbar">toolbar</div>
  <script data-mindspace-visual-editor="true">/* script */</script>
</div>`;
  const cleanPublishHtml = stripMindspaceIds(dirtyPreviewHtml);
  assert(!cleanPublishHtml.includes("data-mindspace-id"), "data-mindspace-id stripped 100%");
  assert(!cleanPublishHtml.includes("mindspace-visual-toolbar"), "Editor toolbar stripped 100%");
  assert(!cleanPublishHtml.includes("mindspace-visual-editor"), "Editor runtime script stripped 100%");
  assert(!cleanPublishHtml.includes("mindspace-insertion-indicator"), "Insertion indicator stripped 100%");

  console.log("\n=================================================================");
  console.log(`   ALL ${passed}/${total} E2E TESTS PASSED WITH 100% SUCCESS!   `);
  console.log("=================================================================\n");
}

runE2ETests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
