// scratch/test_engine_v2.ts
import {
  injectMindspaceIds,
  stripMindspaceIds,
  applyVisualInlineStyleEdit,
  applyVisualTextEdit,
  applyVisualImageChange,
  applyVisualReorder,
  scanEligibleTags,
} from "../src/lib/visual-edit-engine";

const baseHtml = `<!DOCTYPE html>
<html>
<head>
  <title>V2 Engine Test</title>
</head>
<body>
  <div class="container">
    <h1 class="hero-title">Build with <span class="highlight">MINDSPACE</span></h1>
    <p class="hero-desc">Interactive visual builder</p>
    <img src="avatar.jpg" alt="Hero" />
    <button class="cta-btn">Click Me</button>
  </div>
</body>
</html>`;

console.log("=== 1. INJECT IDS ===");
const withIds = injectMindspaceIds(baseHtml);
console.log(withIds);

const tags = scanEligibleTags(withIds);
console.log("Found tags:", tags.map((t) => `<${t.tagName}> id=${t.mindspaceId} order=${t.indexOrder}`));

console.log("\n=== 2. TEXT EDIT ON NESTED SPAN (Preserves h1 structure) ===");
// ms-2 is h1, ms-3 is span
const afterSpanEdit = applyVisualTextEdit(baseHtml, "ms-3", "ROCKET");
console.log(afterSpanEdit);

console.log("\n=== 3. TEXT EDIT ON H1 (With inner HTML) ===");
const afterH1Edit = applyVisualTextEdit(baseHtml, "ms-2", 'Create with <span class="highlight">STUDIO</span>');
console.log(afterH1Edit);

console.log("\n=== 4. STYLE EDIT ON BUTTON (Single element isolation) ===");
const afterStyleEdit = applyVisualInlineStyleEdit(afterH1Edit, "ms-5", { backgroundColor: "#8b5cf6", color: "#ffffff" });
console.log(afterStyleEdit);

console.log("\n=== 5. IMAGE CHANGE ON IMG (ms-4) ===");
const afterImgEdit = applyVisualImageChange(afterStyleEdit, "ms-4", "/api/projects/p1/assets/photo.webp");
console.log(afterImgEdit);

console.log("\n=== 6. DRAG REORDER: Move button (ms-5) BEFORE p (ms-3 or original) ===");
const afterReorder = applyVisualReorder(afterImgEdit, "ms-5", "ms-3", "before");
console.log(afterReorder);

console.log("\n=== 7. STRIP ALL ARTIFACTS (Zero leak test) ===");
const cleanHtml = stripMindspaceIds(afterReorder);
console.log(cleanHtml);
console.log("Has data-mindspace-id:", cleanHtml.includes("data-mindspace-id"));
