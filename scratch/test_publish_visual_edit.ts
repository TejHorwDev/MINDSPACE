import { db } from "../src/lib/db";
import { publishProject } from "../src/lib/publish-manager";
import fs from "fs";
import path from "path";

async function testPublish() {
  console.log("Testing project publish with visual edit engine integration...");
  const project = await db.project.findFirst({
    where: { name: "Visual Edit Demo" },
    include: { files: true },
  });

  if (!project) {
    throw new Error("Demo project not found!");
  }

  // 1. Simulate visual edit having been performed and stored in project
  const editedHtml = `<!DOCTYPE html>
<html>
<head>
  <title>MINDSPACE Demo</title>
  <link rel="stylesheet" href="style.css">
</head>
<body data-mindspace-id="ms-1">
  <div class="container" data-mindspace-id="ms-2">
    <h1 class="hero-title" style="color: rgb(139, 92, 246); font-size: 32px;" data-mindspace-id="ms-3">Visually Edited Title</h1>
    <p class="hero-desc" data-mindspace-id="ms-4">Visual editing writes directly back to ProjectFile.</p>
    <button class="cta-btn" style="background-color: rgb(16, 185, 129);" data-mindspace-id="ms-5">Visually Styled Button</button>
  </div>
</body>
</html>`;

  // Publish project with this clientFiles payload
  const result = await publishProject(project.id, project.ownerId, [
    { path: "index.html", content: editedHtml },
    { path: "style.css", content: project.files.find((f) => f.path === "style.css")?.content || "" },
  ]);

  console.log("Published project successfully! Public slug:", result.publicSlug);

  // 2. Read the actual published files written to disk
  const publishedDir = path.join(process.cwd(), "public", "p", result.publicSlug);
  const publishedIndexPath = path.join(publishedDir, "index.html");

  if (!fs.existsSync(publishedIndexPath)) {
    throw new Error("Published index.html was not written to disk!");
  }

  const publishedIndexHtml = fs.readFileSync(publishedIndexPath, "utf-8");

  // Check 1: Zero data-mindspace-id
  const hasMindspaceId = publishedIndexHtml.includes("data-mindspace-id");
  console.log("Assert: Zero data-mindspace-id in published file:", !hasMindspaceId);

  // Check 2: Zero visual editor script
  const hasEditorScript = publishedIndexHtml.includes("data-mindspace-visual-editor");
  console.log("Assert: Zero visual editor script in published file:", !hasEditorScript);

  // Check 3: Zero visual editor toolbar
  const hasToolbar = publishedIndexHtml.includes("mindspace-visual-toolbar");
  console.log("Assert: Zero visual toolbar in published file:", !hasToolbar);

  // Check 4: Student's edited inline styles and text are 100% preserved
  const retainsTitle = publishedIndexHtml.includes("Visually Edited Title");
  const retainsStyle = publishedIndexHtml.includes("color: rgb(139, 92, 246); font-size: 32px;");
  const retainsBtnStyle = publishedIndexHtml.includes("background-color: rgb(16, 185, 129);");
  console.log("Assert: Student's visually edited title is live in published HTML:", retainsTitle);
  console.log("Assert: Student's visually edited inline style is live in published HTML:", retainsStyle && retainsBtnStyle);

  if (hasMindspaceId || hasEditorScript || hasToolbar || !retainsTitle || !retainsStyle || !retainsBtnStyle) {
    throw new Error("Published output failed validation!");
  }

  console.log("\n=== PUBLISH PIPELINE SANITIZATION VERIFIED 100% CLEAN! ===");
}

testPublish().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
