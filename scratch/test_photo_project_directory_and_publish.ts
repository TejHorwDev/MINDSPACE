// scratch/test_photo_project_directory_and_publish.ts
import { db } from "../src/lib/db";
import { bundleProjectFiles } from "../src/lib/preview-bundler";
import { writeStaticProjectFiles, getPublishedFolderPath } from "../src/lib/publish-manager";
import { applyVisualImageChange } from "../src/lib/visual-edit-engine";
import sharp from "sharp";
import fs from "fs";
import path from "path";

async function run() {
  console.log("=================================================================");
  console.log("   TESTING PHOTO UPLOAD -> PROJECT DIRECTORY & PUBLISH PIPELINE ");
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
      process.exit(1);
    }
  }

  // 1. Setup a test project
  const testUserId = "usr_photo_test_" + Date.now();
  await db.user.create({
    data: {
      id: testUserId,
      email: `test_photo_${Date.now()}@mindspace.local`,
      passwordHash: "test",
      name: "Test Developer",
    },
  });

  const testProjectId = "proj_photo_test_" + Date.now();
  const testProject = await db.project.create({
    data: {
      id: testProjectId,
      ownerId: testUserId,
      name: "Photo Test Project",
      publicSlug: "test-photo-" + Date.now(),
    },
  });

  const initialHtml = `<!DOCTYPE html><html><head><title>Test</title></head><body><div id="hero"><img id="avatar-img" data-mindspace-id="ms-1" src="placeholder.png"/></div></body></html>`;
  const initialHtmlFile = await db.projectFile.create({
    data: {
      projectId: testProjectId,
      path: "index.html",
      content: initialHtml,
    },
  });

  // 2. Generate a test 100x100 PNG image buffer
  const samplePngBuffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 4,
      background: { r: 79, g: 70, b: 229, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const sampleDataUrl = `data:image/png;base64,${samplePngBuffer.toString("base64")}`;
  const uploadedFilename = "my-avatar.png";

  console.log("Step 1: Simulate photo upload in visual design...");

  // Simulate what POST /api/projects/[id]/assets now does:
  // Creates ProjectFile with path: uploadedFilename and content: sampleDataUrl
  const createdProjectFile = await db.projectFile.create({
    data: {
      projectId: testProjectId,
      path: uploadedFilename,
      content: sampleDataUrl,
    },
  });

  assert(Boolean(createdProjectFile.id), "Project file created in DB");
  assert(createdProjectFile.path === "my-avatar.png", `Project file path is clean filename: ${createdProjectFile.path}`);
  assert(createdProjectFile.content.startsWith("data:image/png;base64,"), "Project file stores base64 image dataUrl");

  console.log("\nStep 2: Update HTML with only the clean filename (no API url)...");
  // Simulate what ProjectEditor now does:
  const updatedHtml = applyVisualImageChange(initialHtml, "ms-1", uploadedFilename, false);
  assert(updatedHtml.includes(`src="${uploadedFilename}"`), `HTML src updated with ONLY the clean name: src="${uploadedFilename}"`);
  assert(!updatedHtml.includes("/api/projects/"), "HTML contains NO long /api/projects/ URL");

  await db.projectFile.update({
    where: { id: initialHtmlFile.id },
    data: { content: updatedHtml },
  });

  console.log("\nStep 3: Live Preview bundling with clean filename...");
  // Simulate what Live Preview bundling does:
  const filesList = [
    { id: initialHtmlFile.id, projectId: testProjectId, path: "index.html", content: updatedHtml, createdAt: new Date(), updatedAt: new Date() },
    { id: createdProjectFile.id, projectId: testProjectId, path: uploadedFilename, content: sampleDataUrl, createdAt: new Date(), updatedAt: new Date() },
  ];
  const fileContentsMap = {
    [initialHtmlFile.id]: updatedHtml,
    [createdProjectFile.id]: sampleDataUrl,
  };

  const bundledPreview = bundleProjectFiles("index.html", filesList as any, fileContentsMap, { isEditorPreview: true });
  assert(bundledPreview.includes(`src="${sampleDataUrl}"`), "Live preview bundle successfully rewrote src='my-avatar.png' to the real dataUrl in real time!");
  assert(bundledPreview.includes(`data-mindspace-file="${uploadedFilename}"`), "Live preview retained clean file origin attribute");

  console.log("\nStep 4: Publish to static public site...");
  // Simulate what writeStaticProjectFiles does:
  const publicSlug = testProject.publicSlug || "test-photo-slug";
  const publishedDir = await writeStaticProjectFiles(
    publicSlug,
    testProject.name,
    [
      { path: "index.html", content: updatedHtml },
      { path: uploadedFilename, content: sampleDataUrl },
    ],
    testProjectId
  );

  const publishedImagePath = path.join(publishedDir, uploadedFilename);
  assert(fs.existsSync(publishedImagePath), `Real binary image file exists at published path: ${publishedImagePath}`);

  const diskFileStat = fs.statSync(publishedImagePath);
  assert(diskFileStat.size === samplePngBuffer.length, `Published disk image size matches original binary PNG buffer (${diskFileStat.size} bytes)`);

  const verifiedMeta = await sharp(publishedImagePath).metadata();
  assert(verifiedMeta.format === "png", `Published image verified by Sharp as real PNG (format: ${verifiedMeta.format})`);
  assert(verifiedMeta.width === 100 && verifiedMeta.height === 100, `Published image dimensions verified (100x100)`);

  const publishedIndexHtml = fs.readFileSync(path.join(publishedDir, "index.html"), "utf-8");
  assert(publishedIndexHtml.includes(`<base href="/p/${publicSlug}/">`), "Published index.html has base href pointing to published slug");
  assert(publishedIndexHtml.includes(`src="${uploadedFilename}"`), "Published index.html has src='my-avatar.png'");

  // Clean up test data
  fs.rmSync(publishedDir, { recursive: true, force: true });
  await db.projectFile.deleteMany({ where: { projectId: testProjectId } });
  await db.project.delete({ where: { id: testProjectId } });
  await db.user.delete({ where: { id: testUserId } });

  console.log(`\n=================================================================`);
  console.log(`   ALL ${passedTests}/${totalTests} CHECKS PASSED WITH 100% SUCCESS!`);
  console.log(`=================================================================\n`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
