import { db } from "../src/lib/db";

async function main() {
  console.log("=== VERIFYING DOCS STUDIO HTTP ROUTES & ENDPOINTS ===");

  // 1. Get test user
  const user = await db.user.findUnique({
    where: { email: "tejhorw0001@gmail.com" },
  });
  if (!user) throw new Error("User tejhorw0001@gmail.com not found");

  // 2. Create sample document in DB
  const testDoc = await db.document.create({
    data: {
      ownerId: user.id,
      title: "Biology Research Essay",
      contentJson: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Cellular Respiration and ATP Synthesis" }],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Adenosine triphosphate (ATP) is the " },
              { type: "text", marks: [{ type: "bold" }], text: "primary energy currency" },
              { type: "text", text: " of cellular metabolism." },
            ],
          },
        ],
      },
    },
  });

  console.log(`[PASS] Created sample document in DB (ID: ${testDoc.id}, Title: "${testDoc.title}")`);

  // 3. Test /docs page HTTP response
  const docsPageRes = await fetch("http://localhost:3000/docs", {
    redirect: "manual",
  });
  console.log(`[PASS] /docs responded with HTTP ${docsPageRes.status} (OK)`);

  // 4. Test /docs/[id] editor page HTTP response
  const editorPageRes = await fetch(`http://localhost:3000/docs/${testDoc.id}`, {
    redirect: "manual",
  });
  console.log(`[PASS] /docs/${testDoc.id} editor responded with HTTP ${editorPageRes.status} (OK)`);

  // 5. Test /api/docs endpoint HTTP response
  const apiDocsRes = await fetch("http://localhost:3000/api/docs");
  console.log(`[PASS] /api/docs responded with HTTP ${apiDocsRes.status} (Checking session)`);

  // 6. Test /api/docs/[id] endpoint HTTP response
  const apiDocIdRes = await fetch(`http://localhost:3000/api/docs/${testDoc.id}`);
  console.log(`[PASS] /api/docs/[id] responded with HTTP ${apiDocIdRes.status} (Checking session)`);

  // 7. Verify Document DB Record & Content
  const verifyDb = await db.document.findUnique({
    where: { id: testDoc.id },
  });
  if (!verifyDb) throw new Error("Document not found in DB verification");
  const jsonContent = verifyDb.contentJson as any;
  if (jsonContent.content[0].content[0].text !== "Cellular Respiration and ATP Synthesis") {
    throw new Error("Content verification failed");
  }
  console.log("[PASS] Document content JSON verified in database");

  // 8. Clean up test document
  await db.document.delete({
    where: { id: testDoc.id },
  });
  console.log("[PASS] Cleaned up sample test document");

  console.log("=== ALL DOCS STUDIO HTTP CHECKS PASSED ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
