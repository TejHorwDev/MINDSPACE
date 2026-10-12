import { jsPDF } from "jspdf";
import { PresentationItem, SlideItem } from "./types";

/**
 * Extracts plain text from a Tiptap JSON node or string.
 */
function extractPlainText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);

  let text = "";
  if (node.type === "text" && node.text) {
    text += node.text;
  }

  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      const childText = extractPlainText(child);
      if (childText) {
        text += childText;
      }
      if (
        child.type === "paragraph" ||
        child.type === "heading" ||
        child.type === "listItem"
      ) {
        text += "\n";
      }
    }
  }

  return text.trim();
}

/**
 * Extracts bullet points from a Tiptap JSON doc if present.
 */
function extractListPoints(node: any): string[] {
  if (!node || typeof node !== "object") return [];
  const points: string[] = [];

  function walk(n: any) {
    if (!n) return;
    if (n.type === "listItem") {
      const pointText = extractPlainText(n);
      if (pointText) points.push(pointText);
      return;
    }
    if (n.content && Array.isArray(n.content)) {
      for (const child of n.content) {
        walk(child);
      }
    }
  }

  walk(node);
  return points;
}

/**
 * Server-side fallback PDF generator.
 * Generates a clean 16:9 widescreen presentation PDF (960 x 540 pt) with one slide per page.
 * Note: PDF export is slides-only by design.
 */
export async function generatePresentationPdf(
  presentation: PresentationItem
): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: [960, 540], // 16:9 aspect ratio
    compress: true,
  });

  const slides = presentation.slides || [];
  const totalSlides = slides.length;

  slides.forEach((slide, idx) => {
    if (idx > 0) {
      doc.addPage([960, 540], "landscape");
    }

    // Canvas background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 960, 540, "F");

    const content = slide.contentJson || {};

    // ------------------------------------------------------------------------
    // LAYOUT 1: TITLE SLIDE
    // ------------------------------------------------------------------------
    if (slide.layoutType === "title") {
      const titleText =
        extractPlainText(content.title) || presentation.title || "Untitled Presentation";
      const subtitleText =
        extractPlainText(content.subtitle) || "";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(32);
      doc.setTextColor(15, 23, 42);

      const splitTitle = doc.splitTextToSize(titleText, 760);
      doc.text(splitTitle, 480, 230, { align: "center" });

      if (subtitleText) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(16);
        doc.setTextColor(100, 116, 139);
        const splitSubtitle = doc.splitTextToSize(subtitleText, 680);
        doc.text(splitSubtitle, 480, 290 + (splitTitle.length - 1) * 20, {
          align: "center",
        });
      }
    }

    // ------------------------------------------------------------------------
    // LAYOUT 2: TITLE + CONTENT
    // ------------------------------------------------------------------------
    else if (slide.layoutType === "title-content") {
      const heading = extractPlainText(content.heading) || "Slide Heading";
      const bodyText = extractPlainText(content.body) || "";
      const bulletPoints = extractListPoints(content.body);

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text(heading, 50, 60);

      // Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(50, 78, 910, 78);

      // Body
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(51, 65, 85);

      if (bulletPoints.length > 0) {
        let currentY = 110;
        bulletPoints.forEach((pt) => {
          doc.circle(58, currentY - 4, 2.5, "F");
          const split = doc.splitTextToSize(pt, 820);
          doc.text(split, 70, currentY);
          currentY += split.length * 18 + 12;
        });
      } else {
        const splitBody = doc.splitTextToSize(bodyText, 850);
        doc.text(splitBody, 50, 110);
      }
    }

    // ------------------------------------------------------------------------
    // LAYOUT 3: TWO-COLUMN
    // ------------------------------------------------------------------------
    else if (slide.layoutType === "two-column") {
      const heading = extractPlainText(content.heading) || "Comparative Analysis";
      const col1Text = extractPlainText(content.col1) || "";
      const col2Text = extractPlainText(content.col2) || "";

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text(heading, 50, 60);

      // Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(50, 78, 910, 78);

      // Col 1 Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(50, 100, 410, 360, 6, 6, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(50, 100, 410, 360, 6, 6, "S");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(13);
      doc.setTextColor(51, 65, 85);
      const splitCol1 = doc.splitTextToSize(col1Text, 370);
      doc.text(splitCol1, 70, 130);

      // Col 2 Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(500, 100, 410, 360, 6, 6, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(500, 100, 410, 360, 6, 6, "S");

      const splitCol2 = doc.splitTextToSize(col2Text, 370);
      doc.text(splitCol2, 520, 130);
    }

    // ------------------------------------------------------------------------
    // LAYOUT 4: IMAGE + TEXT
    // ------------------------------------------------------------------------
    else if (slide.layoutType === "image-text") {
      const heading = extractPlainText(content.heading) || "Visual Analysis";
      const bodyText = extractPlainText(content.body) || "";

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text(heading, 50, 60);

      // Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(50, 78, 910, 78);

      // Left: Image box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(50, 100, 400, 360, 6, 6, "F");
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(50, 100, 400, 360, 6, 6, "S");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(148, 163, 184);
      doc.text(
        content.imageAlt ? `[Image: ${content.imageAlt}]` : "[Image Media Frame]",
        250,
        280,
        { align: "center" }
      );

      // Right: Text box
      doc.setFont("helvetica", "normal");
      doc.setFontSize(13);
      doc.setTextColor(51, 65, 85);
      const splitBody = doc.splitTextToSize(bodyText, 410);
      doc.text(splitBody, 490, 130);
    }

    // ------------------------------------------------------------------------
    // FOOTER (Watermark and Slide Numbers)
    // ------------------------------------------------------------------------
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("MINDSPACE Studio", 50, 510);
    doc.text(`${idx + 1} / ${totalSlides}`, 910, 510, { align: "right" });
  });

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
