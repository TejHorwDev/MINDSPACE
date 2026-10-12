import { db } from "../src/lib/db";
import { validateSafeMcpUrl, SSRF_GENERIC_ERROR } from "../src/lib/ssrf";

async function runApiSsrfAudit() {
  console.log("=== MINDSPACE MCP SSRF API VALIDATION AUDIT ===");

  // Create temporary test student
  const student = await db.user.create({
    data: {
      email: `ssrf-test-${Date.now()}@example.com`,
      name: "SSRF Tester",
      role: "student",
      passwordHash: "dummy-hash",
    },
  });

  try {
    const invalidUrls = [
      "http://localhost",
      "http://127.0.0.1",
      "http://169.254.169.254",
      "http://192.168.1.1",
      "file:///etc/passwd",
    ];

    for (const badUrl of invalidUrls) {
      const check = await validateSafeMcpUrl(badUrl);
      if (check.safe) {
        throw new Error(`❌ FAILED: ${badUrl} was not rejected!`);
      }
      if (check.error !== SSRF_GENERIC_ERROR) {
        throw new Error(`❌ FAILED: Error message was not generic: ${check.error}`);
      }
      console.log(`✓ Blocked ${badUrl} -> Error: "${check.error}"`);
    }

    const goodUrl = "https://example.com/mcp";
    const goodCheck = await validateSafeMcpUrl(goodUrl);
    if (!goodCheck.safe) {
      throw new Error(`❌ FAILED: Good URL was blocked: ${goodUrl}`);
    }
    console.log(`✓ Allowed ${goodUrl}`);

    console.log("\n🎉 ALL SSRF API TESTS PASSED 100%!");
  } finally {
    await db.user.delete({ where: { id: student.id } });
  }
}

runApiSsrfAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
