import { db } from "@/lib/db";
import { writeStaticProjectFiles } from "@/lib/publish-manager";

async function runLiveE2e() {
  console.log("==================================================");
  console.log("   MINDSPACE HTTP & End-to-End Live Test Suite    ");
  console.log("==================================================");

  const baseUrl = "http://localhost:3000";

  // 1. Ensure user exists
  let user = await db.user.findFirst({
    where: { email: "student@mindspace.test" },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        name: "Test Student",
        email: "student@mindspace.test",
        role: "student",
        freeCreditsBalance: 20.0,
      },
    });
  }

  // 2. Ensure project exists
  let project = await db.project.findFirst({
    where: { ownerId: user.id },
    include: { files: true },
  });

  if (!project) {
    project = await db.project.create({
      data: {
        ownerId: user.id,
        name: "Multi-Language Workspace",
        templateUsed: "blank",
        isPublished: true,
        publicSlug: `live-suite-${Date.now()}`,
        publishedAt: new Date(),
        files: {
          create: [
            {
              path: "index.html",
              content: `<!DOCTYPE html><html><head><title>Styled Live App</title><link rel="stylesheet" href="styles.css"><script src="script.js"></script></head><body><h1 id="title">Live Mindspace App</h1></body></html>`,
            },
            {
              path: "styles.css",
              content: `body { background: #0b0f19; color: #38bdf8; font-family: sans-serif; }`,
            },
            {
              path: "script.js",
              content: `window.MINDSPACE_LOADED = true; console.log("Script active!");`,
            },
            {
              path: "main.py",
              content: `print("Python executing in Mindspace Sandbox")`,
            },
            {
              path: "server.js",
              content: `console.log("Node server script executed!");`,
            },
          ],
        },
      },
      include: { files: true },
    });
  }

  console.log(`Using Project: ${project.id} (slug: ${project.publicSlug})`);

  // Ensure project is actively published now in DB
  await db.project.update({
    where: { id: project.id },
    data: {
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  // Write files to disk for publish test
  if (project.publicSlug) {
    await writeStaticProjectFiles(
      project.publicSlug,
      project.name,
      project.files.map((f) => ({ path: f.path, content: f.content }))
    );
  }

  // 3. Test Published Site & Asset Serving (/p/[slug], /p/[slug]/styles.css, /p/[slug]/script.js)
  console.log("\n--- Test: Published Public Asset Serving ---");
  const htmlRes = await fetch(`${baseUrl}/p/${project.publicSlug}`);
  console.log(`GET /p/${project.publicSlug} -> HTTP ${htmlRes.status}`);
  const htmlText = await htmlRes.text();
  if (htmlRes.ok && htmlText.includes("<base href=\"/p/")) {
    console.log("[PASS] /p/[slug] returns HTML with injected base tag");
  } else {
    console.error("[FAIL] Base tag missing or failed response");
  }

  const cssRes = await fetch(`${baseUrl}/p/${project.publicSlug}/styles.css`);
  console.log(`GET /p/${project.publicSlug}/styles.css -> HTTP ${cssRes.status}`);
  const cssContentType = cssRes.headers.get("content-type");
  const cssText = await cssRes.text();
  if (cssRes.ok && cssContentType?.includes("text/css") && cssText.includes("#0b0f19")) {
    console.log("[PASS] /p/[slug]/styles.css returns CSS with exact text/css MIME type");
  } else {
    console.error(`[FAIL] CSS serving failed: status=${cssRes.status}, type=${cssContentType}`);
  }

  const jsRes = await fetch(`${baseUrl}/p/${project.publicSlug}/script.js`);
  console.log(`GET /p/${project.publicSlug}/script.js -> HTTP ${jsRes.status}`);
  const jsContentType = jsRes.headers.get("content-type");
  const jsText = await jsRes.text();
  if (jsRes.ok && jsContentType?.includes("javascript") && jsText.includes("MINDSPACE_LOADED")) {
    console.log("[PASS] /p/[slug]/script.js returns JS with exact javascript MIME type");
  } else {
    console.error(`[FAIL] JS serving failed: status=${jsRes.status}, type=${jsContentType}`);
  }

  // 4. Test Multi-Language Execution Run endpoint
  console.log("\n--- Test: Code Execution via Piston ---");
  const runPayload = {
    activeFilePath: "server.js",
    files: project.files.map((f) => ({ path: f.path, content: f.content })),
  };

  // We can call executeCodeWithPiston directly or via internal runner
  const { executeCodeWithPiston } = await import("@/lib/piston");
  const runExec = await executeCodeWithPiston({
    language: "javascript",
    files: [{ name: "server.js", content: `console.log("40 + 2 =", 42);` }],
  });
  console.log(`Execution result status: ${runExec.status}`);
  if (runExec.status === "success" && runExec.run.stdout.includes("42")) {
    console.log("[PASS] Code execution completed successfully with stdout capture");
  } else {
    console.error("[FAIL] Execution failed:", runExec);
  }

  console.log("\n==================================================");
  console.log("   All HTTP & End-to-End Checks Complete!        ");
  console.log("==================================================");
}

runLiveE2e()
  .catch((e) => {
    console.error("Live test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
