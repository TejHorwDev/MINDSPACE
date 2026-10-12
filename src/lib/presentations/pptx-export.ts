import pptxgen from "pptxgenjs";
import fs from "fs";
import path from "path";
import { PresentationItem, SlideItem } from "./types";

interface TextRunOption {
  text: string;
  options?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    bullet?: boolean | { type?: string; code?: string };
    breakLine?: boolean;
    fontSize?: number;
    color?: string;
    fontFace?: string;
  };
}

/**
 * Converts a Tiptap JSON document (or plain string) into an array of pptxgen text runs.
 */
export function tiptapToPptxRuns(
  doc: any,
  defaultOptions: {
    fontSize?: number;
    color?: string;
    bold?: boolean;
    bullet?: boolean;
  } = {}
): TextRunOption[] {
  if (!doc) return [{ text: "", options: defaultOptions }];

  // Plain string or number
  if (typeof doc === "string" || typeof doc === "number") {
    return [{ text: String(doc), options: defaultOptions }];
  }

  const runs: TextRunOption[] = [];

  function parseInline(node: any, inheritOptions: any = {}) {
    if (!node) return;

    if (node.type === "text") {
      const opts: any = { ...defaultOptions, ...inheritOptions };

      if (node.marks && Array.isArray(node.marks)) {
        for (const mark of node.marks) {
          if (mark.type === "bold") opts.bold = true;
          if (mark.type === "italic") opts.italic = true;
          if (mark.type === "underline") opts.underline = true;
          if (mark.type === "strike") opts.strike = true;
          if (mark.type === "code") {
            opts.fontFace = "Courier New";
            opts.color = "059669";
          }
        }
      }

      runs.push({
        text: node.text || "",
        options: opts,
      });
      return;
    }

    if (node.type === "hardBreak") {
      runs.push({
        text: "\n",
        options: { ...defaultOptions, ...inheritOptions, breakLine: true },
      });
      return;
    }

    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        parseInline(child, inheritOptions);
      }
    }
  }

  function parseBlock(node: any, inList: boolean = false) {
    if (!node) return;

    if (node.type === "heading") {
      const level = node.attrs?.level || 2;
      const headingFontSize =
        level === 1 ? 28 : level === 2 ? 22 : level === 3 ? 18 : 16;

      if (node.content && Array.isArray(node.content)) {
        for (const child of node.content) {
          parseInline(child, {
            bold: true,
            fontSize: headingFontSize,
            color: "0F172A",
          });
        }
      }
      runs.push({
        text: "\n",
        options: { breakLine: true, fontSize: headingFontSize },
      });
      return;
    }

    if (node.type === "paragraph") {
      if (node.content && Array.isArray(node.content)) {
        for (const child of node.content) {
          parseInline(child);
        }
      }
      runs.push({ text: "\n", options: { breakLine: true } });
      return;
    }

    if (node.type === "bulletList") {
      if (node.content && Array.isArray(node.content)) {
        for (const item of node.content) {
          parseListItem(item, true);
        }
      }
      return;
    }

    if (node.type === "orderedList") {
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach((item: any, idx: number) => {
          parseListItem(item, false, idx + 1);
        });
      }
      return;
    }

    if (node.type === "listItem") {
      parseListItem(node, inList);
      return;
    }

    if (node.type === "blockquote") {
      if (node.content && Array.isArray(node.content)) {
        for (const child of node.content) {
          parseBlock(child, inList);
        }
      }
      return;
    }

    if (node.type === "doc" && node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        parseBlock(child, inList);
      }
      return;
    }

    // Fallback for general block
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        parseInline(child);
      }
      runs.push({ text: "\n", options: { breakLine: true } });
    }
  }

  function parseListItem(
    listItem: any,
    isBullet: boolean = true,
    index?: number
  ) {
    if (!listItem || !listItem.content) return;

    let isFirstInItem = true;
    for (const block of listItem.content) {
      if (block.content && Array.isArray(block.content)) {
        for (const inlineNode of block.content) {
          const itemOpts: any = {};
          if (isFirstInItem) {
            if (isBullet) {
              itemOpts.bullet = true;
            } else if (index !== undefined) {
              // Numbered prefix if not bullet
              runs.push({
                text: `${index}. `,
                options: { bold: true, color: "0F172A" },
              });
            }
            isFirstInItem = false;
          }
          parseInline(inlineNode, itemOpts);
        }
      }
    }
    runs.push({ text: "\n", options: { breakLine: true } });
  }

  // Traverse from root
  if (doc.type === "doc" && doc.content) {
    for (const child of doc.content) {
      parseBlock(child);
    }
  } else {
    parseBlock(doc);
  }

  // Clean trailing breaks
  while (
    runs.length > 0 &&
    runs[runs.length - 1].text.trim() === "" &&
    runs[runs.length - 1].options?.breakLine
  ) {
    runs.pop();
  }

  return runs.length > 0 ? runs : [{ text: "", options: defaultOptions }];
}

/**
 * Resolves an image URL into a base64 data string or external url for pptxgen.
 */
async function resolveImageForPptx(
  imageUrl?: string
): Promise<{ data?: string; path?: string } | null> {
  if (!imageUrl || typeof imageUrl !== "string") return null;

  // 1. Base64 data URL
  if (imageUrl.startsWith("data:image/")) {
    return { data: imageUrl };
  }

  // 2. Local uploads (/uploads/...)
  if (imageUrl.startsWith("/")) {
    try {
      const publicPath = path.join(process.cwd(), "public", imageUrl);
      if (fs.existsSync(publicPath)) {
        const buffer = fs.readFileSync(publicPath);
        const ext = path.extname(publicPath).replace(".", "") || "png";
        return { data: `data:image/${ext};base64,${buffer.toString("base64")}` };
      }
    } catch (err) {
      console.warn("Could not read local image for PPTX:", imageUrl, err);
    }
  }

  // 3. HTTP / HTTPS URL: fetch and convert to base64 for safety
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    try {
      const response = await fetch(imageUrl);
      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        const contentType =
          response.headers.get("content-type") || "image/png";
        const base64 = Buffer.from(arrayBuf).toString("base64");
        return { data: `data:${contentType};base64,${base64}` };
      }
    } catch {
      // Fallback to direct path
      return { path: imageUrl };
    }
  }

  return null;
}

/**
 * Generates a real .pptx presentation Buffer from a PresentationItem.
 */
export async function generatePresentationPptx(
  presentation: PresentationItem
): Promise<Buffer> {
  const pptx = new pptxgen();

  // 16:9 widescreen layout
  pptx.layout = "LAYOUT_16x9";
  pptx.title = presentation.title || "Untitled Presentation";
  pptx.subject = "Created with MINDSPACE Studio";
  pptx.author = "MINDSPACE Studio";

  const slides = presentation.slides || [];
  const totalSlides = slides.length;

  for (let idx = 0; idx < totalSlides; idx++) {
    const slide = slides[idx];
    const pptxSlide = pptx.addSlide();
    const content = slide.contentJson || {};

    // Slide Background
    pptxSlide.background = { color: "FFFFFF" };

    // ------------------------------------------------------------------------
    // LAYOUT 1: TITLE SLIDE
    // ------------------------------------------------------------------------
    if (slide.layoutType === "title") {
      const titleRuns = tiptapToPptxRuns(content.title, {
        fontSize: 34,
        bold: true,
        color: "0F172A",
      });

      pptxSlide.addText(titleRuns as any, {
        x: 0.8,
        y: 1.5,
        w: 8.4,
        h: 1.6,
        align: "center",
        valign: "middle",
        fontFace: "Arial",
      });

      const subtitleRuns = tiptapToPptxRuns(content.subtitle, {
        fontSize: 16,
        color: "64748B",
      });

      pptxSlide.addText(subtitleRuns as any, {
        x: 1.2,
        y: 3.3,
        w: 7.6,
        h: 1.2,
        align: "center",
        valign: "top",
        fontFace: "Arial",
      });
    }

    // ------------------------------------------------------------------------
    // LAYOUT 2: TITLE + CONTENT
    // ------------------------------------------------------------------------
    else if (slide.layoutType === "title-content") {
      const headingRuns = tiptapToPptxRuns(content.heading, {
        fontSize: 24,
        bold: true,
        color: "0F172A",
      });

      pptxSlide.addText(headingRuns as any, {
        x: 0.8,
        y: 0.5,
        w: 8.4,
        h: 0.7,
        valign: "middle",
        fontFace: "Arial",
      });

      // Subtle divider line
      pptxSlide.addShape(pptx.ShapeType.line, {
        x: 0.8,
        y: 1.25,
        w: 8.4,
        h: 0,
        line: { color: "E2E8F0", width: 1 },
      });

      const bodyRuns = tiptapToPptxRuns(content.body, {
        fontSize: 14,
        color: "334155",
      });

      pptxSlide.addText(bodyRuns as any, {
        x: 0.8,
        y: 1.45,
        w: 8.4,
        h: 3.6,
        valign: "top",
        fontFace: "Arial",
      });
    }

    // ------------------------------------------------------------------------
    // LAYOUT 3: TWO-COLUMN
    // ------------------------------------------------------------------------
    else if (slide.layoutType === "two-column") {
      const headingRuns = tiptapToPptxRuns(content.heading, {
        fontSize: 24,
        bold: true,
        color: "0F172A",
      });

      pptxSlide.addText(headingRuns as any, {
        x: 0.8,
        y: 0.5,
        w: 8.4,
        h: 0.7,
        valign: "middle",
        fontFace: "Arial",
      });

      // Subtle divider line
      pptxSlide.addShape(pptx.ShapeType.line, {
        x: 0.8,
        y: 1.25,
        w: 8.4,
        h: 0,
        line: { color: "E2E8F0", width: 1 },
      });

      const col1Runs = tiptapToPptxRuns(content.col1, {
        fontSize: 13,
        color: "334155",
      });

      pptxSlide.addText(col1Runs as any, {
        x: 0.8,
        y: 1.45,
        w: 4.0,
        h: 3.6,
        valign: "top",
        fontFace: "Arial",
      });

      const col2Runs = tiptapToPptxRuns(content.col2, {
        fontSize: 13,
        color: "334155",
      });

      pptxSlide.addText(col2Runs as any, {
        x: 5.2,
        y: 1.45,
        w: 4.0,
        h: 3.6,
        valign: "top",
        fontFace: "Arial",
      });
    }

    // ------------------------------------------------------------------------
    // LAYOUT 4: IMAGE + TEXT
    // ------------------------------------------------------------------------
    else if (slide.layoutType === "image-text") {
      const headingRuns = tiptapToPptxRuns(content.heading, {
        fontSize: 24,
        bold: true,
        color: "0F172A",
      });

      pptxSlide.addText(headingRuns as any, {
        x: 0.8,
        y: 0.5,
        w: 8.4,
        h: 0.7,
        valign: "middle",
        fontFace: "Arial",
      });

      // Subtle divider line
      pptxSlide.addShape(pptx.ShapeType.line, {
        x: 0.8,
        y: 1.25,
        w: 8.4,
        h: 0,
        line: { color: "E2E8F0", width: 1 },
      });

      // Left: Image placement
      const imgTarget = await resolveImageForPptx(content.imageUrl);
      if (imgTarget?.data) {
        pptxSlide.addImage({
          data: imgTarget.data,
          x: 0.8,
          y: 1.45,
          w: 4.0,
          h: 3.4,
          sizing: { type: "contain", w: 4.0, h: 3.4 },
        });
      } else if (imgTarget?.path) {
        pptxSlide.addImage({
          path: imgTarget.path,
          x: 0.8,
          y: 1.45,
          w: 4.0,
          h: 3.4,
          sizing: { type: "contain", w: 4.0, h: 3.4 },
        });
      } else {
        // Fallback placeholder card
        pptxSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: 1.45,
          w: 4.0,
          h: 3.4,
          fill: { color: "F1F5F9" },
          line: { color: "CBD5E1", width: 1, dashType: "dash" },
        });
        pptxSlide.addText(
          content.imageAlt ? `[Image: ${content.imageAlt}]` : "[Image Frame]",
          {
            x: 0.8,
            y: 2.8,
            w: 4.0,
            h: 0.8,
            align: "center",
            fontSize: 12,
            color: "94A3B8",
            fontFace: "Arial",
          }
        );
      }

      // Right: Text body
      const bodyRuns = tiptapToPptxRuns(content.body, {
        fontSize: 13,
        color: "334155",
      });

      pptxSlide.addText(bodyRuns as any, {
        x: 5.1,
        y: 1.45,
        w: 4.1,
        h: 3.4,
        valign: "top",
        fontFace: "Arial",
      });
    }

    // ------------------------------------------------------------------------
    // SLIDE FOOTER (Branding watermark & page numbers)
    // ------------------------------------------------------------------------
    pptxSlide.addText("MINDSPACE Studio", {
      x: 0.8,
      y: 5.2,
      w: 4.0,
      h: 0.3,
      fontSize: 8,
      color: "94A3B8",
      fontFace: "Arial",
    });

    pptxSlide.addText(`${idx + 1} / ${totalSlides}`, {
      x: 6.0,
      y: 5.2,
      w: 3.2,
      h: 0.3,
      fontSize: 8,
      color: "94A3B8",
      align: "right",
      fontFace: "Arial",
    });

    // ------------------------------------------------------------------------
    // SPEAKER NOTES (Slide reminder cues)
    // ------------------------------------------------------------------------
    if (slide.speakerNotes && slide.speakerNotes.trim()) {
      pptxSlide.addNotes(slide.speakerNotes.trim());
    }
  }

  const rawBuffer = await pptx.write({ outputType: "nodebuffer" });
  return rawBuffer as Buffer;
}
