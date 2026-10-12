import { db } from "../src/lib/db";
import { generatePresentationPptx } from "../src/lib/presentations/pptx-export";
import { generatePresentationPdf } from "../src/lib/presentations/pdf-export";
import { getDefaultSlideContent } from "../src/lib/presentations/defaults";
import fs from "fs";
import path from "path";

async function runExportTests() {
  console.log("=== PHASE 3: PPTX & PDF EXPORT TEST SUITE ===");

  // 1. Fetch test user
  const user = await db.user.findFirst();
  if (!user) {
    throw new Error("No user found in database to attach presentation to.");
  }
  console.log("Testing with user:", user.email);

  // 2. Create test presentation with ALL 4 layout types + image + speaker notes
  const testDeck = await db.presentation.create({
    data: {
      ownerId: user.id,
      title: "Phase 3 Comprehensive Export Test Deck",
      slides: {
        create: [
          // Slide 1: Title
          {
            order: 0,
            layoutType: "title",
            contentJson: {
              title: {
                type: "doc",
                content: [
                  {
                    type: "heading",
                    attrs: { level: 1 },
                    content: [
                      {
                        type: "text",
                        text: "Autonomous Multi-Agent Architecture",
                      },
                    ],
                  },
                ],
              },
              subtitle: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Final Engineering Capstone · December 2026",
                      },
                    ],
                  },
                ],
              },
            },
            speakerNotes:
              "Welcome everyone to this presentation. Today we are presenting our engineering capstone.",
          },
          // Slide 2: Title + Content with bullets
          {
            order: 1,
            layoutType: "title-content",
            contentJson: {
              heading: {
                type: "doc",
                content: [
                  {
                    type: "heading",
                    attrs: { level: 2 },
                    content: [{ type: "text", text: "Core System Highlights" }],
                  },
                ],
              },
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Key architectural achievements delivered in this cycle:",
                      },
                    ],
                  },
                  {
                    type: "bulletList",
                    content: [
                      {
                        type: "listItem",
                        content: [
                          {
                            type: "paragraph",
                            content: [
                              {
                                type: "text",
                                text: "10x throughput with localized SQLite caching",
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: "listItem",
                        content: [
                          {
                            type: "paragraph",
                            content: [
                              {
                                type: "text",
                                text: "Full PPTX & PDF high-fidelity export capabilities",
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: "listItem",
                        content: [
                          {
                            type: "paragraph",
                            content: [
                              {
                                type: "text",
                                text: "Integrated private speaker notes sync",
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
            speakerNotes:
              "Emphasize the 10x throughput metric and how offline caching eliminated remote latency.",
          },
          // Slide 3: Two-Column
          {
            order: 2,
            layoutType: "two-column",
            contentJson: {
              heading: {
                type: "doc",
                content: [
                  {
                    type: "heading",
                    attrs: { level: 2 },
                    content: [{ type: "text", text: "Monolith vs Microservices" }],
                  },
                ],
              },
              col1: {
                type: "doc",
                content: [
                  {
                    type: "heading",
                    attrs: { level: 3 },
                    content: [{ type: "text", text: "Monolithic Core" }],
                  },
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Single codebase, instant atomic deployments, zero inter-service network overhead.",
                      },
                    ],
                  },
                ],
              },
              col2: {
                type: "doc",
                content: [
                  {
                    type: "heading",
                    attrs: { level: 3 },
                    content: [{ type: "text", text: "Microservices" }],
                  },
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Independent horizontal scaling, domain isolation, but introduces complex RPC latency.",
                      },
                    ],
                  },
                ],
              },
            },
            speakerNotes:
              "Explain the trade-offs clearly: we opted for the modular monolith pattern for speed of development.",
          },
          // Slide 4: Image + Text
          {
            order: 3,
            layoutType: "image-text",
            contentJson: {
              heading: {
                type: "doc",
                content: [
                  {
                    type: "heading",
                    attrs: { level: 2 },
                    content: [{ type: "text", text: "Visual Architecture Diagram" }],
                  },
                ],
              },
              // 1x1 transparent/amber PNG data url to test image placement
              imageUrl:
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVNFLPAADlTQD5Y5N6nAAAAABJRU5ErkJggg==",
              imageAlt: "System Flowchart",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Data streams enter via the Next.js API router and fan out to background task runners.",
                      },
                    ],
                  },
                ],
              },
            },
            speakerNotes:
              "Direct their attention to the data flow arrow pointing from the client to the worker queue.",
          },
        ],
      },
    },
    include: {
      slides: {
        orderBy: { order: "asc" },
      },
    },
  });

  console.log(`Created test deck: ${testDeck.title} (ID: ${testDeck.id})`);
  console.log(`Total slides created: ${testDeck.slides.length}`);

  const presentationItem = {
    id: testDeck.id,
    ownerId: testDeck.ownerId,
    title: testDeck.title,
    createdAt: testDeck.createdAt.toISOString(),
    updatedAt: testDeck.updatedAt.toISOString(),
    slides: testDeck.slides.map((s) => ({
      id: s.id,
      presentationId: s.presentationId,
      order: s.order,
      layoutType: s.layoutType as any,
      contentJson: s.contentJson as any,
      speakerNotes: s.speakerNotes || "",
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
  };

  // 3. Test PPTX Generation
  console.log("\n--- Testing PPTX Export ---");
  const pptxBuffer = await generatePresentationPptx(presentationItem as any);
  console.log(`PPTX generated successfully! Size: ${pptxBuffer.length} bytes`);

  // Verify PPTX ZIP signature (PK\x03\x04)
  const isZip =
    pptxBuffer[0] === 0x50 &&
    pptxBuffer[1] === 0x4b &&
    pptxBuffer[2] === 0x03 &&
    pptxBuffer[3] === 0x04;
  console.log(`PPTX file has valid OpenXML PK signature: ${isZip}`);
  if (!isZip) throw new Error("Generated PPTX does not have valid ZIP/OpenXML signature!");

  // Save PPTX sample
  const outDir = path.join(process.cwd(), "public", "uploads", "test-exports");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const pptxPath = path.join(outDir, "test-exported-deck.pptx");
  fs.writeFileSync(pptxPath, pptxBuffer);
  console.log(`Saved sample PPTX to: ${pptxPath}`);

  // 4. Test PDF Generation
  console.log("\n--- Testing PDF Export ---");
  const pdfBuffer = await generatePresentationPdf(presentationItem as any);
  console.log(`PDF generated successfully! Size: ${pdfBuffer.length} bytes`);

  // Verify PDF signature (%PDF)
  const isPdf =
    pdfBuffer[0] === 0x25 &&
    pdfBuffer[1] === 0x50 &&
    pdfBuffer[2] === 0x44 &&
    pdfBuffer[3] === 0x46;
  console.log(`PDF file has valid %PDF signature: ${isPdf}`);
  if (!isPdf) throw new Error("Generated PDF does not have valid %PDF signature!");

  const pdfPath = path.join(outDir, "test-exported-deck.pdf");
  fs.writeFileSync(pdfPath, pdfBuffer);
  console.log(`Saved sample PDF to: ${pdfPath}`);

  // 5. Clean up test database deck
  console.log("\n--- Cleaning up test records ---");
  await db.presentation.delete({ where: { id: testDeck.id } });
  console.log("Cleaned up test presentation record from SQLite.");

  console.log("\n🎉 ALL PHASE 3 EXPORT TESTS PASSED SUCCESSFULLY!");
}

runExportTests()
  .catch((e) => {
    console.error("Test error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
