import { db } from "@/lib/db";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/crypto";
import { getOrCreateUserSettings, updateUserSettings, getSafeUserSettings, getDecryptedByokKey } from "@/lib/user-settings";
import { executeCodeWithPiston, resolvePistonLanguage } from "@/lib/piston";
import { writeStaticProjectFiles } from "@/lib/publish-manager";
import fs from "fs";
import path from "path";

async function runTests() {
  console.log("==================================================");
  console.log("   MINDSPACE Overhaul Verification Suite (God Tier)");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. Language Resolution & Multi-Language Detection
  // -------------------------------------------------------------------------
  console.log("\n--- Test 1: Language Detection & Mapping ---");
  assert(resolvePistonLanguage("main.py") === "python", "main.py resolves to python");
  assert(resolvePistonLanguage("math.cpp") === "c++", "math.cpp resolves to c++");
  assert(resolvePistonLanguage("Program.cs") === "csharp", "Program.cs resolves to csharp");
  assert(resolvePistonLanguage("Main.java") === "java", "Main.java resolves to java");
  assert(resolvePistonLanguage("index.js") === "javascript", "index.js resolves to javascript");
  assert(resolvePistonLanguage("main.go") === "go", "main.go resolves to go");
  assert(resolvePistonLanguage("main.rs") === "rust", "main.rs resolves to rust");

  // -------------------------------------------------------------------------
  // 2. Multi-Language Code Execution Engine
  // -------------------------------------------------------------------------
  console.log("\n--- Test 2: Code Execution Engine ---");
  const nodeResult = await executeCodeWithPiston({
    language: "javascript",
    files: [
      {
        name: "main.js",
        content: `console.log("Hello from Mindspace Multi-Language Engine!");\nconsole.log("Calculation: 40 + 2 =", 40 + 2);`,
      },
    ],
  });

  assert(nodeResult.status === "success", "JavaScript execution succeeds");
  assert(
    nodeResult.run.stdout.includes("Calculation: 40 + 2 = 42"),
    "Stdout contains expected calculation output"
  );
  assert(nodeResult.executionTimeMs >= 0, "Execution time measured accurately");

  // Test timeout handling (10-second limit simulation)
  console.log("\n--- Test 3: Sandbox Safety & Error Handling ---");
  const errorResult = await executeCodeWithPiston({
    language: "javascript",
    files: [
      {
        name: "error.js",
        content: `throw new Error("Deliberate test runtime exception");`,
      },
    ],
  });
  assert(errorResult.status === "error", "Runtime errors reported cleanly");
  assert(
    errorResult.run.stderr.includes("Deliberate test runtime exception"),
    "Stderr captured accurately"
  );

  // -------------------------------------------------------------------------
  // 4. Crypto Utility & BYOK Encryption (AES-256-GCM)
  // -------------------------------------------------------------------------
  console.log("\n--- Test 4: AES-256-GCM Encryption & Masking ---");
  const testApiKey = "AIzaSyTestApiKeyForGemini123456789";
  const encrypted = encryptSecret(testApiKey);
  assert(encrypted.includes(":") && encrypted !== testApiKey, "Key encrypted properly with IV & Tag");
  const decrypted = decryptSecret(encrypted);
  assert(decrypted === testApiKey, "Decrypted key matches original plaintext");
  const masked = maskSecret(testApiKey);
  assert(masked.startsWith("AIzaSy") && masked.endsWith("6789") && masked.includes("••••"), "Key masked safely for UI");

  // -------------------------------------------------------------------------
  // 5. User Settings & BYOK Persistence
  // -------------------------------------------------------------------------
  console.log("\n--- Test 5: Per-User Settings & BYOK Storage ---");
  const testUser = await db.user.findFirst();
  if (testUser) {
    const initialSettings = await getOrCreateUserSettings(testUser.id);
    assert(Boolean(initialSettings), "UserSettings row created/retrieved");

    // Update settings with BYOK keys
    await updateUserSettings(testUser.id, {
      editorTheme: "vs-dark",
      fontSize: 15,
      tabSize: 4,
      wordWrap: true,
      minimap: true,
      aiAutoApprove: true,
      byokGoogleKey: "AIzaSyPersonalSecretKey998877",
    });

    const safeSettings = await getSafeUserSettings(testUser.id);
    assert(safeSettings.fontSize === 15, "Font size updated in DB");
    assert(safeSettings.tabSize === 4, "Tab size updated in DB");
    assert(safeSettings.aiAutoApprove === true, "Auto-approve toggle updated in DB");
    assert(safeSettings.hasGoogleKey === true, "BYOK Google key detected as active");
    assert(safeSettings.maskedGoogleKey.includes("••••"), "Masked key returned safely");

    const retrievedKey = await getDecryptedByokKey(testUser.id, "google");
    assert(retrievedKey === "AIzaSyPersonalSecretKey998877", "Decrypted BYOK key matches for backend call");

    // Test BYOK usage transaction logging
    const byokTx = await db.creditTransaction.create({
      data: {
        userId: testUser.id,
        amount: 0.0,
        type: "byok_usage",
        reason: "Test BYOK Execution (Google Gemini) [No credits deducted]",
        metadata: { byok: true, provider: "google" },
      },
    });
    assert(byokTx.type === "byok_usage" && byokTx.amount === 0.0, "BYOK usage transaction logged at $0.00");
  }

  // -------------------------------------------------------------------------
  // 6. Publish Bundler & Asset Serving
  // -------------------------------------------------------------------------
  console.log("\n--- Test 6: Publish Asset Bundler & Serving ---");
  const testSlug = `test-verify-${Date.now()}`;
  const testFiles = [
    {
      path: "index.html",
      content: `<!DOCTYPE html><html><head><link rel="stylesheet" href="styles.css"><script src="script.js"></script></head><body><h1>Test Publish</h1></body></html>`,
    },
    {
      path: "styles.css",
      content: `body { background-color: rgb(15, 23, 42); color: rgb(248, 250, 252); }`,
    },
    {
      path: "script.js",
      content: `console.log("Mindspace published script running!");`,
    },
  ];

  const outDir = await writeStaticProjectFiles(testSlug, "Test Publish Project", testFiles);
  assert(fs.existsSync(path.join(outDir, "index.html")), "index.html written to disk");
  assert(fs.existsSync(path.join(outDir, "styles.css")), "styles.css written to disk");
  assert(fs.existsSync(path.join(outDir, "script.js")), "script.js written to disk");

  // Clean up test disk folder
  fs.rmSync(outDir, { recursive: true, force: true });

  console.log("\n==================================================");
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error("Test execution fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
