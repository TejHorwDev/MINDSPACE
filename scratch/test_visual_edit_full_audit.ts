// scratch/test_visual_edit_full_audit.ts
import { bundleProjectFiles } from "../src/lib/preview-bundler";
import {
  injectMindspaceIds,
  stripMindspaceIds,
  applyVisualInlineStyleEdit,
  applyVisualTextEdit,
  scanEligibleTags,
} from "../src/lib/visual-edit-engine";
import { preparePublishedHtml } from "../src/lib/publish-manager";
import type { EditorFile } from "../src/components/editor/types";

console.log("=== MINDSPACE VISUAL INLINE EDITING: FULL AUDIT & TEST SUITE ===\n");

// 1. Shared Class Isolation Test:
// Verify that changing color/font-size/padding on ONE element sharing a class does NOT affect other elements with the same class!
console.log("TEST 1: Shared Class Isolation Test (Inline Styles Scoped to Clicked Element Only)...");

const multiCardHtml = `<!DOCTYPE html>
<html>
<head><title>Cards</title></head>
<body>
  <div class="grid">
    <div class="card">
      <h3 class="card-title">Card One</h3>
      <p class="card-text">Description one</p>
    </div>
    <div class="card">
      <h3 class="card-title">Card Two</h3>
      <p class="card-text">Description two</p>
    </div>
  </div>
</body>
</html>`;

const injectedCards = injectMindspaceIds(multiCardHtml);
const cardTags = scanEligibleTags(injectedCards);

console.log("Discovered tags:", cardTags.map(t => `${t.tagName} [${t.mindspaceId || t.indexOrder}]`));

// Find the two Card Titles
const h3Tags = cardTags.filter((t) => t.tagName === "h3");
const firstCardTitle = h3Tags[0];
const secondCardTitle = h3Tags[1];

console.log(`First card title ID: ${firstCardTitle?.mindspaceId}, Second card title ID: ${secondCardTitle?.mindspaceId}`);

// Apply inline style to ONLY the first card title
const styledCards = applyVisualInlineStyleEdit(injectedCards, firstCardTitle!.mindspaceId!, {
  color: "#8b5cf6",
  fontSize: "24px",
  padding: "8px",
  fontWeight: "bold",
});

console.log("Styled cards result excerpt:\n", styledCards.slice(styledCards.indexOf('<div class="grid">'), styledCards.indexOf('</div>\n  </div>') + 15));

const firstCardHasStyle = styledCards.includes('color: #8b5cf6') && styledCards.includes('font-size: 24px') && styledCards.includes('padding: 8px') && styledCards.includes('font-weight: bold');
const secondCardUntouched = styledCards.includes('<h3 class="card-title" data-mindspace-id="' + secondCardTitle!.mindspaceId! + '">Card Two</h3>');

console.log("Assert 1.1: First card has inline style:", firstCardHasStyle);
console.log("Assert 1.2: Second card has NO inline style and remains untouched:", secondCardUntouched);
if (!firstCardHasStyle || !secondCardUntouched) {
  throw new Error("Failed Shared Class Isolation Test!");
}

// 2. Text Content Direct Editing Test:
console.log("\nTEST 2: Direct In-Place Text Editing Test...");
const textEditedCards = applyVisualTextEdit(styledCards, secondCardTitle!.mindspaceId!, "Updated Second Card Title!");

const secondCardTextUpdated = textEditedCards.includes("Updated Second Card Title!");
const firstCardTextPreserved = textEditedCards.includes("Card One");

console.log("Assert 2.1: Second card text updated to new content:", secondCardTextUpdated);
console.log("Assert 2.2: First card text preserved:", firstCardTextPreserved);
if (!secondCardTextUpdated || !firstCardTextPreserved) {
  throw new Error("Failed Text Content Direct Editing Test!");
}

// 3. Editor Preview Bundler vs Standalone Bundler:
console.log("\nTEST 3: Editor Preview Bundler vs Standalone Preview Bundler...");

const sampleFiles: EditorFile[] = [
  {
    id: "f-1",
    projectId: "p-1",
    path: "index.html",
    content: multiCardHtml,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "f-2",
    projectId: "p-1",
    path: "style.css",
    content: ".card { padding: 16px; background: #222; }",
    updatedAt: new Date().toISOString(),
  },
];
const sampleContents: Record<string, string> = {
  "f-1": multiCardHtml,
  "f-2": ".card { padding: 16px; background: #222; }",
};

// Bundle for Editor Live Preview:
const editorBundle = bundleProjectFiles("index.html", sampleFiles, sampleContents, { isEditorPreview: true });
const hasMindspaceIds = editorBundle.includes('data-mindspace-id="ms-');
const hasVisualEditorScript = editorBundle.includes('data-mindspace-visual-editor="true"');
const hasToolbar = editorBundle.includes('id="mindspace-visual-toolbar"');

console.log("Assert 3.1: Editor bundle has data-mindspace-id attributes:", hasMindspaceIds);
console.log("Assert 3.2: Editor bundle has visual editor script:", hasVisualEditorScript);
console.log("Assert 3.3: Editor bundle has floating style toolbar:", hasToolbar);
if (!hasMindspaceIds || !hasVisualEditorScript || !hasToolbar) {
  throw new Error("Failed Editor Preview Bundler Test!");
}

// Bundle for Standalone Preview (e.g. Open in New Tab):
const standaloneBundle = bundleProjectFiles("index.html", sampleFiles, sampleContents, { isEditorPreview: false });
const standaloneHasIds = standaloneBundle.includes("data-mindspace-id");
const standaloneHasScript = standaloneBundle.includes("data-mindspace-visual-editor");
const standaloneHasToolbar = standaloneBundle.includes("mindspace-visual-toolbar");

console.log("Assert 3.4: Standalone bundle has zero data-mindspace-id:", !standaloneHasIds);
console.log("Assert 3.5: Standalone bundle has zero visual editor script:", !standaloneHasScript);
console.log("Assert 3.6: Standalone bundle has zero toolbar:", !standaloneHasToolbar);
if (standaloneHasIds || standaloneHasScript || standaloneHasToolbar) {
  throw new Error("Failed Standalone Preview Bundler Test!");
}

// 4. Publish Pipeline Sanitization Test:
console.log("\nTEST 4: Published Site Sanitization Test (Zero Trace Leakage)...");

// Simulate an HTML file that has had visual edits made to it
const editedHtmlWithIds = textEditedCards;
const publishedHtml = preparePublishedHtml(editedHtmlWithIds, "test-slug-42");

const pubHasIds = publishedHtml.includes("data-mindspace-id");
const pubHasEditorScript = publishedHtml.includes("data-mindspace-visual-editor");
const pubHasToolbar = publishedHtml.includes("mindspace-visual-toolbar");
const pubHasReportWidget = publishedHtml.includes("mindspace-report-root");
const pubHasBaseTag = publishedHtml.includes('<base href="/p/test-slug-42/">');
const pubRetainsStyle = publishedHtml.includes('color: #8b5cf6') && publishedHtml.includes('font-size: 24px');
const pubRetainsText = publishedHtml.includes("Updated Second Card Title!");

console.log("Assert 4.1: Published HTML has zero data-mindspace-id:", !pubHasIds);
console.log("Assert 4.2: Published HTML has zero visual editor script:", !pubHasEditorScript);
console.log("Assert 4.3: Published HTML has zero visual toolbar:", !pubHasToolbar);
console.log("Assert 4.4: Published HTML retains public widgets (report & base):", pubHasReportWidget && pubHasBaseTag);
console.log("Assert 4.5: Published HTML retains student's edited styling:", pubRetainsStyle);
console.log("Assert 4.6: Published HTML retains student's edited text:", pubRetainsText);
if (pubHasIds || pubHasEditorScript || pubHasToolbar || !pubHasReportWidget || !pubHasBaseTag || !pubRetainsStyle || !pubRetainsText) {
  throw new Error("Failed Published Site Sanitization Test!");
}

// 5. Download ZIP Pipeline Sanitization Test:
console.log("\nTEST 5: Download ZIP Sanitization Test...");

const downloadedHtml = stripMindspaceIds(editedHtmlWithIds);
const dlHasIds = downloadedHtml.includes("data-mindspace-id");
const dlHasEditorScript = downloadedHtml.includes("data-mindspace-visual-editor");
const dlHasToolbar = downloadedHtml.includes("mindspace-visual-toolbar");
const dlRetainsCard1Style = downloadedHtml.includes('color: #8b5cf6') && downloadedHtml.includes('font-size: 24px');
const dlRetainsCard2Text = downloadedHtml.includes("Updated Second Card Title!");

console.log("Assert 5.1: Downloaded HTML has zero data-mindspace-id:", !dlHasIds);
console.log("Assert 5.2: Downloaded HTML has zero visual editor script:", !dlHasEditorScript);
console.log("Assert 5.3: Downloaded HTML has zero toolbar:", !dlHasToolbar);
console.log("Assert 5.4: Downloaded HTML retains student's edited inline styles:", dlRetainsCard1Style);
console.log("Assert 5.5: Downloaded HTML retains student's edited text:", dlRetainsCard2Text);
if (dlHasIds || dlHasEditorScript || dlHasToolbar || !dlRetainsCard1Style || !dlRetainsCard2Text) {
  throw new Error("Failed Download ZIP Sanitization Test!");
}

console.log("\n=================================================");
console.log("ALL 5 TESTS PASSED WITH 100% SUCCESS! GOD TIER COMPLETE!");
console.log("=================================================");
