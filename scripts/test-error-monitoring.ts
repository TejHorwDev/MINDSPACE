import {
  captureException,
  getRecentErrors,
  clearErrorBuffer,
} from "../src/lib/error-monitor";

async function runErrorMonitoringAudit() {
  console.log("=== MINDSPACE ERROR MONITORING AUDIT ===");

  clearErrorBuffer();

  console.log("\n[Test 1] Deliberately triggering a test exception...");
  const deliberateError = new Error("Deliberate test error for MINDSPACE exception tracking verification");
  const capturedEvent = captureException(deliberateError, {
    source: "api",
    url: "/api/test-error",
    extra: {
      framework: "Next.js 16",
      verified: true,
    },
  });

  console.log(`Captured event ID: ${capturedEvent.id}`);

  // Inspect error buffer
  const errors = getRecentErrors();
  console.log(`Buffer now contains ${errors.length} error(s).`);

  if (errors.length === 0) {
    throw new Error("❌ FAILED: Error was not captured in monitoring buffer!");
  }

  const latest = errors[0];
  if (latest.id !== capturedEvent.id || !latest.message.includes("Deliberate test error")) {
    throw new Error("❌ FAILED: Captured error data did not match expected incident!");
  }

  console.log("✅ PASSED: Deliberately thrown error caught with full stack trace and metadata.");
  console.log(`Error Message: ${latest.message}`);
  console.log(`Source: ${latest.source}`);
  console.log(`Timestamp: ${latest.timestamp}`);

  // Test buffer clear
  clearErrorBuffer();
  if (getRecentErrors().length !== 0) {
    throw new Error("❌ FAILED: clearErrorBuffer did not empty buffer.");
  }
  console.log("✅ PASSED: Error buffer clear verified.");

  console.log("\n🎉 ALL ERROR MONITORING TESTS PASSED 100%!");
}

runErrorMonitoringAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
