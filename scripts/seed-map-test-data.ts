import { db } from "../src/lib/db";

async function main() {
  const projectId = "cmv2p1pca0001uhmw9e0qlhk0";

  // 1. Update index.html to add broken references
  const indexFile = await db.projectFile.findFirst({
    where: { projectId, path: "index.html" },
  });

  if (indexFile && !indexFile.content?.includes("missing-banner.png")) {
    const updatedContent = indexFile.content?.replace(
      "</body>",
      '  <img src="missing-banner.png" alt="broken">\n  <script src="missing-analytics.js"></script>\n</body>'
    );
    await db.projectFile.update({
      where: { id: indexFile.id },
      data: { content: updatedContent },
    });
    console.log("Updated index.html with broken references (missing-banner.png, missing-analytics.js)");
  }

  // 2. Add an orphan file
  const orphan = await db.projectFile.findFirst({
    where: { projectId, path: "unused-notes.js" },
  });

  if (!orphan) {
    await db.projectFile.create({
      data: {
        projectId,
        path: "unused-notes.js",
        content: "// This file is not imported or linked anywhere in the project\nconsole.log('Orphan file');",
      },
    });
    console.log("Created orphan file: unused-notes.js");
  }

  // Also sync changes to standalone db copy if it exists
  console.log("Test data setup complete.");
}

main().catch(console.error);
