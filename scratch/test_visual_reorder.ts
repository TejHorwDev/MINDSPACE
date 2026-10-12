// scratch/test_visual_reorder.ts
import { scanEligibleTags, escapeRegex, TagMatch } from "../src/lib/visual-edit-engine";

function findFullElementRange(html: string, tag: TagMatch): { start: number; end: number; outerHtml: string } {
  if (tag.isSelfClosing) {
    return {
      start: tag.startIndex,
      end: tag.endIndex,
      outerHtml: html.slice(tag.startIndex, tag.endIndex),
    };
  }

  const startOfInner = tag.endIndex;
  const tagToMatch = tag.tagName;

  const scanner = new RegExp(`<(\/?)${escapeRegex(tagToMatch)}(\\s[^>]*?)?>`, "gi");
  scanner.lastIndex = startOfInner;

  let depth = 1;
  let fullEnd = -1;
  let closeTagMatch: RegExpExecArray | null;

  while ((closeTagMatch = scanner.exec(html)) !== null) {
    const isClosing = closeTagMatch[1] === "/";
    if (isClosing) {
      depth--;
      if (depth === 0) {
        fullEnd = scanner.lastIndex;
        break;
      }
    } else {
      if (!closeTagMatch[0].endsWith("/>")) {
        depth++;
      }
    }
  }

  if (fullEnd === -1) {
    fullEnd = tag.endIndex;
  }

  return {
    start: tag.startIndex,
    end: fullEnd,
    outerHtml: html.slice(tag.startIndex, fullEnd),
  };
}

function applyVisualReorderTest(
  html: string,
  movedId: string,
  targetId: string,
  position: "before" | "after"
): string {
  const tags = scanEligibleTags(html);
  const movedTag = tags.find((t) => t.mindspaceId === movedId || `ms-${t.indexOrder}` === movedId);
  const targetTag = tags.find((t) => t.mindspaceId === targetId || `ms-${t.indexOrder}` === targetId);

  if (!movedTag || !targetTag) {
    console.error("Tags not found:", { movedTag: !!movedTag, targetTag: !!targetTag });
    return html;
  }

  const movedRange = findFullElementRange(html, movedTag);
  const targetRange = findFullElementRange(html, targetTag);

  const movedText = movedRange.outerHtml;

  if (movedRange.start < targetRange.start) {
    // Moved element is before target
    const beforeMoved = html.slice(0, movedRange.start);
    const betweenMovedAndTarget = html.slice(movedRange.end, position === "before" ? targetRange.start : targetRange.end);
    const afterTarget = html.slice(position === "before" ? targetRange.start : targetRange.end);

    return beforeMoved + betweenMovedAndTarget + "\n    " + movedText + afterTarget;
  } else {
    // Moved element is after target
    const insertPoint = position === "before" ? targetRange.start : targetRange.end;
    const beforeInsert = html.slice(0, insertPoint);
    const betweenInsertAndMoved = html.slice(insertPoint, movedRange.start);
    const afterMoved = html.slice(movedRange.end);

    return beforeInsert + movedText + "\n    " + betweenInsertAndMoved + afterMoved;
  }
}

const sample = `<!DOCTYPE html>
<html>
<body>
  <div class="container">
    <h1 class="hero-title">Title</h1>
    <p class="hero-desc">Paragraph Description</p>
    <button class="cta-btn">Click Me</button>
  </div>
</body>
</html>`;

console.log("=== ORIGINAL ===");
console.log(sample);

// In sample:
// body = 1
// div = 2
// h1 = 3
// p = 4
// button = 5

console.log("\n=== REORDER: Move button (ms-5) BEFORE p (ms-4) ===");
const reordered1 = applyVisualReorderTest(sample, "ms-5", "ms-4", "before");
console.log(reordered1);

console.log("\n=== REORDER: Move h1 (ms-3) AFTER p (ms-4) ===");
const reordered2 = applyVisualReorderTest(sample, "ms-3", "ms-4", "after");
console.log(reordered2);
