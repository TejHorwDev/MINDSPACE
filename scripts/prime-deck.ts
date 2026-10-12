import { db } from "../src/lib/db";

async function primeDeck() {
  const user = await db.user.findFirst();
  if (!user) throw new Error("No user found");

  let pres = await db.presentation.findFirst({
    where: { ownerId: user.id },
  });

  if (!pres) {
    pres = await db.presentation.create({
      data: {
        ownerId: user.id,
        title: "Autonomous Engineering Systems",
      },
    });
  }

  await db.slide.deleteMany({ where: { presentationId: pres.id } });

  await db.slide.createMany({
    data: [
      {
        presentationId: pres.id,
        order: 0,
        layoutType: "title",
        contentJson: {
          title: {
            type: "doc",
            content: [
              {
                type: "heading",
                attrs: { level: 1 },
                content: [{ type: "text", text: "Autonomous Engineering Systems" }],
              },
            ],
          },
          subtitle: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Final capstone demonstration deck" }],
              },
            ],
          },
        },
        speakerNotes: "Welcome the evaluation committee and set the stage for our demo.",
      },
      {
        presentationId: pres.id,
        order: 1,
        layoutType: "title-content",
        contentJson: {
          heading: {
            type: "doc",
            content: [
              {
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "Key Achievements & Deliverables" }],
              },
            ],
          },
          body: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Here are the key achievements delivered in this cycle:" }],
              },
              {
                type: "bulletList",
                content: [
                  {
                    type: "listItem",
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "10x latency reduction in offline state" }],
                      },
                    ],
                  },
                  {
                    type: "listItem",
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "High-fidelity PPTX and PDF export engine" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
        speakerNotes: "Highlight the performance numbers directly.",
      },
      {
        presentationId: pres.id,
        order: 2,
        layoutType: "two-column",
        contentJson: {
          heading: {
            type: "doc",
            content: [
              {
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "Architecture Trade-offs" }],
              },
            ],
          },
          col1: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Monolith: Rapid feature delivery and direct transactions." }],
              },
            ],
          },
          col2: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Microservices: Independent scaling and isolated failure domains." }],
              },
            ],
          },
        },
        speakerNotes: "Explain why we started monolithic.",
      },
      {
        presentationId: pres.id,
        order: 3,
        layoutType: "image-text",
        contentJson: {
          heading: {
            type: "doc",
            content: [
              {
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "Visual System Diagram" }],
              },
            ],
          },
          imageUrl:
            "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
          imageAlt: "Microprocessor circuitry",
          body: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "The diagram shows the edge distribution node routing telemetry in real-time." }],
              },
            ],
          },
        },
        speakerNotes: "Reference the circuit node in the center.",
      },
    ],
  });

  await db.presentation.update({
    where: { id: pres.id },
    data: { title: "Autonomous Engineering Systems" },
  });

  console.log("Primed deck ID:", pres.id);
}

primeDeck().finally(() => db.$disconnect());
