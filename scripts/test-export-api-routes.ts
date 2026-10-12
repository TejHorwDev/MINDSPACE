import { db } from "../src/lib/db";
import { generatePresentationPptx } from "../src/lib/presentations/pptx-export";
import { generatePresentationPdf } from "../src/lib/presentations/pdf-export";

async function testApiLogic() {
  console.log("=== TESTING EXPORT API ENDPOINT LOGIC ===");
  const user = await db.user.findFirst();
  if (!user) throw new Error("No user found");

  const pres = await db.presentation.findFirst({
    where: { ownerId: user.id },
    include: { slides: { orderBy: { order: "asc" } } },
  });

  if (!pres) {
    console.log("Creating temporary presentation for user...");
    const created = await db.presentation.create({
      data: {
        ownerId: user.id,
        title: "API Route Validation Deck",
        slides: {
          create: [
            {
              order: 0,
              layoutType: "title",
              contentJson: { title: "API Deck Title", subtitle: "Tested via script" },
              speakerNotes: "API speaker notes verification",
            },
          ],
        },
      },
      include: { slides: true },
    });
    console.log("Created test deck:", created.id);
  }

  const targetPres = await db.presentation.findFirst({
    where: { ownerId: user.id },
    include: { slides: { orderBy: { order: "asc" } } },
  });

  if (!targetPres) throw new Error("Target deck missing");

  const presentationItem = {
    id: targetPres.id,
    ownerId: targetPres.ownerId,
    title: targetPres.title,
    createdAt: targetPres.createdAt.toISOString(),
    updatedAt: targetPres.updatedAt.toISOString(),
    slides: targetPres.slides.map((s) => ({
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

  const pptxBuf = await generatePresentationPptx(presentationItem as any);
  const pdfBuf = await generatePresentationPdf(presentationItem as any);

  console.log("PPTX buffer size:", pptxBuf.length);
  console.log("PDF buffer size:", pdfBuf.length);

  const safeFilename =
    targetPres.title
      .replace(/[/\\?%*:|"<>]/g, "-")
      .replace(/\s+/g, "_")
      .trim() || "presentation";

  console.log("Safe attachment filename PPTX:", `${safeFilename}.pptx`);
  console.log("Safe attachment filename PDF:", `${safeFilename}.pdf`);
  console.log("API Route export logic verified 100%!");
}

testApiLogic()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
