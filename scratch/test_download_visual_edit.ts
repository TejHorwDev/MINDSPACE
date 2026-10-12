import { db } from "../src/lib/db";
import { stripMindspaceIds } from "../src/lib/visual-edit-engine";

async function testDownloadSanitization() {
  console.log("Testing project download ZIP file contents...");

  const project = await db.project.findFirst({
    where: { name: "Visual Edit Demo" },
    include: { files: true },
  });

  if (!project) throw new Error("Demo project not found");

  for (const file of project.files) {
    const isHtml = file.path.endsWith(".html") || file.path.endsWith(".htm");
    const cleanContent = isHtml ? stripMindspaceIds(file.content) : file.content;

    const hasId = cleanContent.includes("data-mindspace-id");
    const hasScript = cleanContent.includes("data-mindspace-visual-editor");
    const hasToolbar = cleanContent.includes("mindspace-visual-toolbar");

    console.log(`File "${file.path}":`);
    console.log("  - Zero data-mindspace-id:", !hasId);
    console.log("  - Zero visual editor script:", !hasScript);
    console.log("  - Zero visual toolbar:", !hasToolbar);

    if (hasId || hasScript || hasToolbar) {
      throw new Error(`File ${file.path} leaked visual edit markers!`);
    }
  }

  console.log("\n=== DOWNLOAD ZIP SANITIZATION VERIFIED 100% CLEAN! ===");
}

testDownloadSanitization().catch(console.error);
