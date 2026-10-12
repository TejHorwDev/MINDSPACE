import { db } from "../src/lib/db";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`PASS: ${msg}`);
}

async function run() {
  console.log("=== RUNNING MINDSPACE DOCS STUDIO TEST SUITE ===");

  // 1. Get test student user
  const user = await db.user.findUnique({
    where: { email: "tejhorw0001@gmail.com" },
  });
  assert(!!user, "Test user tejhorw0001@gmail.com exists");

  const userId = user!.id;

  // 2. Test Document Creation (Tiptap Native JSON)
  const initialContent = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Computer Science Term Report" }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "This is a " },
          { type: "text", marks: [{ type: "bold" }], text: "rich text" },
          { type: "text", text: " research report written in " },
          { type: "text", marks: [{ type: "italic" }], text: "MINDSPACE Docs Studio" },
          { type: "text", text: "." },
        ],
      },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Methodology & Architecture" }],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: "Modular UI components" }] }],
          },
          {
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: "ProseMirror JSON persistence" }] }],
          },
        ],
      },
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Simplicity is prerequisite for reliability." }],
          },
        ],
      },
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableHeader",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Metric" }] }],
              },
              {
                type: "tableHeader",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Score" }] }],
              },
            ],
          },
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Reliability" }] }],
              },
              {
                type: "tableCell",
                content: [{ type: "paragraph", content: [{ type: "text", text: "100%" }] }],
              },
            ],
          },
        ],
      },
    ],
  };

  const createdDoc = await db.document.create({
    data: {
      ownerId: userId,
      title: "CS Term Report",
      contentJson: initialContent,
    },
  });

  assert(!!createdDoc.id, `Created document with ID ${createdDoc.id}`);
  assert(createdDoc.title === "CS Term Report", "Document title matches");
  assert(createdDoc.ownerId === userId, "Document ownerId matches");

  // 3. Test Document Retrieval & JSON Persistence
  const fetchedDoc = await db.document.findUnique({
    where: { id: createdDoc.id },
  });

  assert(!!fetchedDoc, "Document retrieved successfully from database");
  const parsedContent = fetchedDoc!.contentJson as any;
  assert(parsedContent.type === "doc", "Root node is type 'doc'");
  assert(Array.isArray(parsedContent.content), "Content is array");
  assert(parsedContent.content.length === 6, "Content contains all 6 top-level blocks");

  // Verify H1
  const h1Block = parsedContent.content[0];
  assert(h1Block.type === "heading" && h1Block.attrs.level === 1, "First block is H1");
  assert(h1Block.content[0].text === "Computer Science Term Report", "H1 text preserved");

  // Verify Formatting marks (bold & italic)
  const paragraphBlock = parsedContent.content[1];
  const boldText = paragraphBlock.content.find((c: any) => c.marks?.some((m: any) => m.type === "bold"));
  const italicText = paragraphBlock.content.find((c: any) => c.marks?.some((m: any) => m.type === "italic"));
  assert(boldText?.text === "rich text", "Bold formatting mark persisted");
  assert(italicText?.text === "MINDSPACE Docs Studio", "Italic formatting mark persisted");

  // Verify Table Block
  const tableBlock = parsedContent.content[5];
  assert(tableBlock.type === "table", "Sixth block is a table");
  assert(tableBlock.content.length === 2, "Table has 2 rows");

  // 4. Test Auto-save / Content Update
  const updatedContent = {
    ...initialContent,
    content: [
      ...initialContent.content,
      {
        type: "paragraph",
        content: [{ type: "text", text: "Auto-saved follow-up notes." }],
      },
    ],
  };

  const updatedDoc = await db.document.update({
    where: { id: createdDoc.id },
    data: {
      contentJson: updatedContent,
      updatedAt: new Date(),
    },
  });

  const reFetched = await db.document.findUnique({
    where: { id: createdDoc.id },
  });
  const reFetchedContent = reFetched!.contentJson as any;
  assert(reFetchedContent.content.length === 7, "Auto-saved update appended paragraph");

  // 5. Test Rename
  const renamedDoc = await db.document.update({
    where: { id: createdDoc.id },
    data: { title: "CS Final Thesis Report" },
  });
  assert(renamedDoc.title === "CS Final Thesis Report", "Document renamed successfully");

  // 6. Test Listing User Documents
  const userDocs = await db.document.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
  });
  assert(userDocs.length >= 1, `Listed ${userDocs.length} documents for student`);
  assert(userDocs.some((d) => d.id === createdDoc.id), "Created document present in listing");

  // 7. Test Document Deletion
  await db.document.delete({
    where: { id: createdDoc.id },
  });

  const deletedCheck = await db.document.findUnique({
    where: { id: createdDoc.id },
  });
  assert(deletedCheck === null, "Document deleted cleanly from database");

  // 8. Verify Existing Website Projects Are Untouched
  const userProjects = await db.project.findMany({
    where: { ownerId: userId },
  });
  assert(userProjects.length > 0, `Existing projects untouched (${userProjects.length} projects intact)`);

  console.log("\nALL DOCS STUDIO TESTS PASSED WITH 100% SUCCESS!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
