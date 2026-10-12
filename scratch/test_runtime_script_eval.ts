// scratch/test_runtime_script_eval.ts
import { bundleProjectFiles } from "../src/lib/preview-bundler";
import { PORTFOLIO_FILES } from "../src/lib/templates/portfolio";
import { CLUB_EVENT_FILES } from "../src/lib/templates/club-event";
import { MULTI_PAGE_FILES } from "../src/lib/templates/multi-page";
import { JSDOM } from "jsdom";

async function testTemplate(name: string, htmlPath: string, files: Array<{ path: string; content: string }>) {
  console.log(`\nTesting runtime in bundled preview for [${name} -> ${htmlPath}]...`);
  const projectFiles = files.map((f, i) => ({
    id: `file_${i}`,
    projectId: "proj_test",
    path: f.path,
    content: f.content,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  const fileContents = Object.fromEntries(projectFiles.map((f) => [f.id, f.content]));

  // Bundle with visual editor enabled
  const bundled = bundleProjectFiles(htmlPath, projectFiles as any, fileContents, { isEditorPreview: true });

  const errors: string[] = [];
  const dom = new JSDOM(bundled, {
    runScripts: "dangerously",
    resources: "usable",
    beforeParse(window) {
      window.addEventListener("error", (event) => {
        errors.push(event.message || event.error?.message || "Unknown error");
      });
    },
  });

  const { window } = dom;
  const { document } = window;

  // Let initial scripts run
  await new Promise((r) => setTimeout(r, 100));

  // Enable visual edit mode
  window.postMessage({ type: "MINDSPACE_SET_VISUAL_EDIT_MODE", enabled: true }, "*");
  await new Promise((r) => setTimeout(r, 50));

  // Test every single element with data-mindspace-id
  const elements = document.querySelectorAll("[data-mindspace-id]");
  console.log(`  Found ${elements.length} editable elements with data-mindspace-id in ${htmlPath}`);

  for (const el of Array.from(elements) as any[]) {
    // 1. Mouseover (triggers hover styling)
    el.dispatchEvent(new window.MouseEvent("mouseover", { bubbles: true, cancelable: true }));

    // 2. Click (triggers element selection & toolbar positioning)
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));

    // 3. Mouseout
    el.dispatchEvent(new window.MouseEvent("mouseout", { bubbles: true, cancelable: true }));
  }

  // Deselect by clicking body
  document.body.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));

  // Scroll & resize
  window.dispatchEvent(new window.Event("scroll"));
  window.dispatchEvent(new window.Event("resize"));

  if (errors.length > 0) {
    console.error(`  [FAIL] Caught ${errors.length} errors in ${name}:`, errors);
    throw new Error(`Errors in ${name}: ${errors.join(", ")}`);
  } else {
    console.log(`  [PASS] Clean execution: 0 runtime errors across all ${elements.length} elements!`);
  }
}

async function run() {
  console.log("=================================================================");
  console.log("   TESTING VISUAL EDITOR RUNTIME ON REAL BUNDLED TEMPLATES       ");
  console.log("=================================================================");

  try {
    await testTemplate("Portfolio", "index.html", PORTFOLIO_FILES);
    await testTemplate("Club / Event Landing", "index.html", CLUB_EVENT_FILES);
    await testTemplate("Multi-Page (Home)", "index.html", MULTI_PAGE_FILES);
    await testTemplate("Multi-Page (About)", "about.html", MULTI_PAGE_FILES);
    await testTemplate("Multi-Page (Contact)", "contact.html", MULTI_PAGE_FILES);

    console.log("\n=================================================================");
    console.log("   ALL 5 BUNDLED TEMPLATE PAGES EXECUTED WITH 0 RUNTIME ERRORS!  ");
    console.log("=================================================================\n");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
