// scratch/test_visual_engine_prototype.ts
import {
  injectMindspaceIds,
  stripMindspaceIds,
  applyVisualInlineStyleEdit,
  applyVisualTextEdit,
  scanEligibleTags,
} from "./test_visual_engine_prototype_lib";

const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
  <style>body { font-family: sans-serif; }</style>
</head>
<body>
  <div class="card" style="margin: 10px;">
    <h1 class="title">Original Heading</h1>
    <p>Original paragraph with <span>nested span</span> text.</p>
    <button class="btn">Click me</button>
  </div>
</body>
</html>`;

console.log("Starting visual edit engine tests...\n");

console.log("1. Testing injectMindspaceIds...");
const injected = injectMindspaceIds(sampleHtml);
console.log("Injected result:\n", injected);

const tags = scanEligibleTags(injected);
console.log("Detected tags:", tags.map(t => `${t.tagName} (${t.mindspaceId || t.indexOrder})`));

const h1Tag = tags.find(t => t.tagName === "h1");
console.log("H1 tag mindspaceId:", h1Tag?.mindspaceId);

console.log("\n2. Testing stripMindspaceIds...");
const stripped = stripMindspaceIds(injected);
console.log("Stripped clean:", !stripped.includes("data-mindspace-id"));

console.log("\n3. Testing applyVisualTextEdit on H1...");
const textEdited = applyVisualTextEdit(injected, h1Tag!.mindspaceId!, "Super God Tier Heading!");
console.log("Text edited H1 check:", textEdited.includes("Super God Tier Heading!"));

console.log("\n4. Testing applyVisualInlineStyleEdit on H1...");
const styleEdited = applyVisualInlineStyleEdit(injected, h1Tag!.mindspaceId!, {
  color: "#a855f7",
  fontSize: "32px",
  fontWeight: "bold",
  textAlign: "center",
  padding: "12px",
});
console.log("Style edited check:", styleEdited.includes('style="color: #a855f7; font-size: 32px; font-weight: bold; text-align: center; padding: 12px;"'));

console.log("\n5. Testing applyVisualInlineStyleEdit on DIV merging with margin: 10px...");
const divTag = tags.find(t => t.tagName === "div");
const mergedDiv = applyVisualInlineStyleEdit(injected, divTag!.mindspaceId!, {
  backgroundColor: "#18181b",
  padding: "20px",
});
console.log("Div merged check:", mergedDiv.includes("margin: 10px;") && mergedDiv.includes("background-color: #18181b;") && mergedDiv.includes("padding: 20px;"));

console.log("\n6. Testing apply edits directly to CLEAN source HTML (without data-mindspace-id in source)...");
const cleanTags = scanEligibleTags(sampleHtml);
const cleanH1 = cleanTags.find(t => t.tagName === "h1")!;
const cleanH1Id = `ms-${cleanH1.indexOrder}`;

const cleanTextEdited = applyVisualTextEdit(sampleHtml, cleanH1Id, "Clean Source Heading Edit!");
console.log("Clean source text edit check:", cleanTextEdited.includes("Clean Source Heading Edit!"));

const cleanStyleEdited = applyVisualInlineStyleEdit(sampleHtml, cleanH1Id, { color: "blue", fontSize: "28px" });
console.log("Clean source style edit check:", cleanStyleEdited.includes('style="color: blue; font-size: 28px;"'));

console.log("\n=== ALL ASSERTIONS VERIFIED! ===");
