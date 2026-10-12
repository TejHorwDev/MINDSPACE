import { SlideLayoutType } from "./types";

export function createTiptapDoc(text: string, headingLevel?: 1 | 2 | 3): any {
  if (headingLevel) {
    return {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: headingLevel },
          content: [{ type: "text", text }],
        },
      ],
    };
  }

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

export function createEmptyTiptapDoc(): any {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
      },
    ],
  };
}

export function getDefaultSlideContent(layoutType: SlideLayoutType): Record<string, any> {
  switch (layoutType) {
    case "title":
      return {
        title: createTiptapDoc("Presentation Title", 1),
        subtitle: createTiptapDoc("Subtitle, presenter name, or date"),
      };

    case "title-content":
      return {
        heading: createTiptapDoc("Slide Heading", 2),
        body: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Key takeaway or core thesis statement for this section of your talk.",
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
                      content: [{ type: "text", text: "First essential observation or supporting fact" }],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Second critical point with qualitative evidence" }],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Forward-looking conclusion or transition" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

    case "two-column":
      return {
        heading: createTiptapDoc("Comparative Analysis", 2),
        col1: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 3 },
              content: [{ type: "text", text: "Perspective A" }],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Primary advantages, strengths, and initial parameters of this option.",
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
              content: [{ type: "text", text: "Perspective B" }],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Alternative trade-offs, considerations, and counter-perspectives to evaluate.",
                },
              ],
            },
          ],
        },
      };

    case "image-text":
      return {
        heading: createTiptapDoc("Visual Evidence & Insights", 2),
        imageUrl: "",
        imageAlt: "Presentation diagram or figure",
        body: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Describe the key chart, prototype mockup, or photograph shown alongside. Connect the visual evidence directly to your audience's takeaways.",
                },
              ],
            },
          ],
        },
      };

    default:
      return {
        heading: createTiptapDoc("Slide Heading", 2),
        body: createTiptapDoc("Slide content"),
      };
  }
}
