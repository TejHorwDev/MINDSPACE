import {
  buildProjectMapGraph,
  extractFileConnections,
  matchTargetFile,
  isLocalReference,
  normalizePath,
  resolveImageUrl,
  type ProjectMapFile,
} from "../src/lib/project-map-parser";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`PASS: ${msg}`);
}

console.log("=== RUNNING MINDSPACE PROJECT MAP PRO TEST SUITE ===");

// 1. Test URL & Path helpers
assert(isLocalReference("style.css"), "style.css is local reference");
assert(isLocalReference("./assets/logo.png"), "./assets/logo.png is local reference");
assert(!isLocalReference("https://cdn.example.com/lib.js"), "https is not local");
assert(!isLocalReference("http://example.com"), "http is not local");
assert(!isLocalReference("//cdn.jsdelivr.net"), "protocol relative is not local");
assert(!isLocalReference("data:image/png;base64,abc"), "data URL is not local");
assert(!isLocalReference("mailto:test@example.com"), "mailto is not local");
assert(!isLocalReference("#heading"), "anchor hash is not local");
assert(!isLocalReference("javascript:void(0)"), "javascript pseudo-protocol is not local");

// 2. Test Image URL resolution
const dummyDataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA";
assert(resolveImageUrl(dummyDataUri, "photo.png") === dummyDataUri, "Data URI resolves directly");
const svgContent = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>';
assert(Boolean(resolveImageUrl(svgContent, "logo.svg")?.startsWith("data:image/svg+xml")), "SVG string resolves to SVG data URI");

// 3. Test Broken Reference Detection
const filesWithBrokenRefs: ProjectMapFile[] = [
  {
    id: "f-index",
    path: "index.html",
    content: `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mindspace Studio</title>
          <link rel="stylesheet" href="style.css">
          <link rel="stylesheet" href="missing-theme.css">
          <script src="missing-app.js"></script>
        </head>
        <body>
          <img src="images/deleted-logo.png" alt="logo">
          <img src="avash.png" alt="avatar">
          <a href="missing-page.html">Missing Page</a>
        </body>
      </html>
    `,
  },
  {
    id: "f-style",
    path: "style.css",
    content: `
      @import url("fonts/missing-font.css");
      body { background-image: url("missing-bg.jpg"); color: #3b82f6; }
    `,
  },
  {
    id: "f-img",
    path: "avash.png",
    content: dummyDataUri,
  },
];

const extracted = extractFileConnections(filesWithBrokenRefs);
console.log(`Extracted ${extracted.connections.length} connections and ${extracted.ghostFiles.size} ghost files`);

assert(extracted.ghostFiles.has("missing:missing-theme.css"), "Detected missing-theme.css ghost");
assert(extracted.ghostFiles.has("missing:missing-app.js"), "Detected missing-app.js ghost");
assert(extracted.ghostFiles.has("missing:images/deleted-logo.png"), "Detected deleted-logo.png ghost");
assert(extracted.ghostFiles.has("missing:missing-page.html"), "Detected missing-page.html ghost");
assert(extracted.ghostFiles.has("missing:fonts/missing-font.css"), "Detected CSS @import missing-font.css ghost");
assert(extracted.ghostFiles.has("missing:missing-bg.jpg"), "Detected CSS url missing-bg.jpg ghost");

const brokenEdges = extracted.connections.filter((c) => c.isMissing);
assert(brokenEdges.length >= 6, `Found at least 6 broken reference connections (actual: ${brokenEdges.length})`);

// 4. Test Graph Generation with Dagre Layout & Image Previews
const graph = buildProjectMapGraph(filesWithBrokenRefs, "proj-123");

assert(graph.nodes.length >= 8, `Expected at least 8 nodes including ghosts (actual: ${graph.nodes.length})`);
assert(graph.edges.length >= 7, `Expected at least 7 edges (actual: ${graph.edges.length})`);

// Verify image node has imageUrl
const imgNode = graph.nodes.find((n) => n.data.path === "avash.png");
assert(!!imgNode?.data.imageUrl, "Image node avash.png has resolved imageUrl");
assert(imgNode?.data.imageUrl === dummyDataUri, "Image node imageUrl matches data URI");

// Verify HTML title extracted
const htmlNode = graph.nodes.find((n) => n.data.path === "index.html");
assert(htmlNode?.data.htmlTitle === "Mindspace Studio", "HTML page title extracted correctly");

// Verify CSS colors extracted
const styleNode = graph.nodes.find((n) => n.data.path === "style.css");
assert(Boolean(styleNode?.data.cssColors?.includes("#3b82f6")), "CSS color palette extracted correctly");

// Check smoothstep edges and color-coded stroke styling
const redEdges = graph.edges.filter((e) => e.data?.isMissing);
assert(redEdges.length === brokenEdges.length, "All broken connections converted to missing edges");
assert(
  redEdges.every((e) => e.type === "smoothstep" && e.style?.stroke === "#ef4444" && e.style?.strokeDasharray === "5 5"),
  "Missing edges styled with smoothstep, #ef4444, and strokeDasharray 5 5"
);

const normalEdges = graph.edges.filter((e) => !e.data?.isMissing);
assert(
  normalEdges.every((e) => e.type === "smoothstep" && ["#38bdf8", "#c084fc", "#34d399", "#fbbf24"].includes(e.style?.stroke as string)),
  "Normal edges styled with smoothstep and color-coded strokes (#38bdf8, #c084fc, etc.)"
);

// Check Dagre coordinates are valid numbers and non-overlapping
for (const node of graph.nodes) {
  assert(!isNaN(node.position.x) && isFinite(node.position.x), `Node ${node.id} has finite x: ${node.position.x}`);
  assert(!isNaN(node.position.y) && isFinite(node.position.y), `Node ${node.id} has finite y: ${node.position.y}`);
}

// 5. Test Orphan Detection
const filesWithOrphans: ProjectMapFile[] = [
  {
    id: "f1",
    path: "index.html",
    content: '<link rel="stylesheet" href="style.css">',
  },
  {
    id: "f2",
    path: "style.css",
    content: "body { color: red; }",
  },
  {
    id: "f3",
    path: "unused-script.js",
    content: "console.log('never imported');",
  },
  {
    id: "f4",
    path: "unused-photo.png",
    content: dummyDataUri,
  },
];

const orphanGraph = buildProjectMapGraph(filesWithOrphans, "proj-test");
const indexNode = orphanGraph.nodes.find((n) => n.data.path === "index.html");
const styleNode2 = orphanGraph.nodes.find((n) => n.data.path === "style.css");
const unusedJsNode = orphanGraph.nodes.find((n) => n.data.path === "unused-script.js");
const unusedImgNode = orphanGraph.nodes.find((n) => n.data.path === "unused-photo.png");

assert(indexNode?.data.isOrphan === false, "index.html entry is NOT marked orphan");
assert(styleNode2?.data.isOrphan === false, "style.css linked by index.html is NOT marked orphan");
assert(unusedJsNode?.data.isOrphan === true, "unused-script.js with 0 inbound links IS marked orphan");
assert(unusedImgNode?.data.isOrphan === true, "unused-photo.png with 0 inbound links IS marked orphan");
assert(unusedImgNode?.data.imageUrl === dummyDataUri, "unused-photo.png still has imageUrl preview resolved");
assert(orphanGraph.stats.orphanFiles === 2, "Stats correctly count 2 orphan files");

// 6. Test 10+ File Complex Project Layout
const multiFiles: ProjectMapFile[] = [
  { id: "1", path: "index.html", content: '<link rel="stylesheet" href="app.css"><script src="app.js"></script><img src="hero.png"><a href="about.html">About</a>' },
  { id: "2", path: "about.html", content: '<link rel="stylesheet" href="app.css"><img src="team.jpg"><a href="index.html">Home</a>' },
  { id: "3", path: "contact.html", content: '<link rel="stylesheet" href="app.css"><script src="app.js"></script>' },
  { id: "4", path: "app.css", content: '@import "reset.css"; body { background: url("bg.svg"); }' },
  { id: "5", path: "reset.css", content: '* { box-sizing: border-box; }' },
  { id: "6", path: "app.js", content: 'console.log("mindspace");' },
  { id: "7", path: "hero.png", content: dummyDataUri },
  { id: "8", path: "team.jpg", content: dummyDataUri },
  { id: "9", path: "bg.svg", content: svgContent },
  { id: "10", path: "orphan-archive.zip", content: 'binary' },
  { id: "11", path: "orphan-notes.txt", content: 'some text' },
  { id: "12", path: "broken.html", content: '<img src="missing-pic.png"><script src="missing-lib.js"></script>' },
];

const multiGraph = buildProjectMapGraph(multiFiles, "proj-multi");
console.log(`Multi-file graph generated: ${multiGraph.nodes.length} nodes, ${multiGraph.edges.length} edges`);
assert(multiGraph.nodes.length === 14, `12 files + 2 missing targets = 14 nodes (got ${multiGraph.nodes.length})`);
assert(multiGraph.stats.imageCount === 3, `Correctly identified 3 image assets (got ${multiGraph.stats.imageCount})`);
assert(multiGraph.stats.orphanFiles >= 2, `Identified orphan files in 10+ file project (got ${multiGraph.stats.orphanFiles})`);
assert(multiGraph.stats.missingFiles === 2, `Identified 2 missing targets in 10+ file project (got ${multiGraph.stats.missingFiles})`);

const heroNode = multiGraph.nodes.find((n) => n.data.path === "hero.png");
const bgNode = multiGraph.nodes.find((n) => n.data.path === "bg.svg");
const indexMultiNode = multiGraph.nodes.find((n) => n.data.path === "index.html");

assert(heroNode!.position.x > indexMultiNode!.position.x, `hero.png (x=${heroNode!.position.x}) is to the right of index.html (x=${indexMultiNode!.position.x})`);
assert(bgNode!.position.x > heroNode!.position.x, `bg.svg (x=${bgNode!.position.x}) is downstream rank from intermediate assets`);

console.log("\nALL 25+ ASSERTIONS PASSED WITH FLYING COLORS!");
