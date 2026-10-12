// scratch/test_visual_edit_sequence.ts
import {
  injectMindspaceIds,
  applyVisualInlineStyleEdit,
  applyVisualTextEdit,
  stripMindspaceIds,
  scanEligibleTags,
} from "../src/lib/visual-edit-engine";

const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <title>MINDSPACE Demo</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1 class="hero-title">Build with <span class="highlight">MINDSPACE</span></h1>
    <p class="hero-desc">Visual inline editing enables instant live changes directly in preview.</p>
    <button class="cta-btn">Get Started</button>
  </div>
</body>
</html>`;

console.log("=== 1. INJECT MINDSPACE IDS ===");
const injected = injectMindspaceIds(sampleHtml);
console.log(injected);

console.log("\n=== 2. SCAN ELIGIBLE TAGS ON INJECTED ===");
const tags = scanEligibleTags(injected);
tags.forEach((t) => {
  console.log(`Tag: <${t.tagName}> id=${t.mindspaceId} order=${t.indexOrder}`);
});

console.log("\n=== 3. EDIT 1: Text edit on h1 (ms-2) ===");
// Notice: what if someone edits h1 with nested span?
const edited1 = applyVisualTextEdit(sampleHtml, "ms-2", "New Title Here");
console.log("Edited 1 result:\n", edited1);

console.log("\n=== 4. EDIT 2: Style edit on p (ms-4 or ms-3?) ===");
const edited2 = applyVisualInlineStyleEdit(edited1, "ms-3", { color: "#ff0000", fontSize: "20px" });
console.log("Edited 2 result:\n", edited2);

console.log("\n=== 5. EDIT 3: Style edit again on h1 (ms-2) ===");
const edited3 = applyVisualInlineStyleEdit(edited2, "ms-2", { fontWeight: "bold" });
console.log("Edited 3 result:\n", edited3);
