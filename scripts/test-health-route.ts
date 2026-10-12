import { GET, HEAD } from "../src/app/api/health/route";
import { GET as GET_Z, HEAD as HEAD_Z } from "../src/app/api/healthz/route";

async function testHealthRoute() {
  console.log("=== TESTING HEALTH ENDPOINTS ===");

  // 1. Test GET /api/health
  console.log("\n1. Testing GET /api/health...");
  const req1 = new Request("http://localhost:3000/api/health");
  const res1 = await GET(req1);
  const data1 = await res1.json();
  console.log("Status:", res1.status);
  console.log("Headers Cache-Control:", res1.headers.get("cache-control"));
  console.log("Response Body:", JSON.stringify(data1, null, 2));

  if (res1.status !== 200 || data1.status !== "ok" || data1.checks.database !== "connected") {
    throw new Error("GET /api/health failed verification");
  }

  // 2. Test GET /api/health?quick=true
  console.log("\n2. Testing GET /api/health?quick=true...");
  const req2 = new Request("http://localhost:3000/api/health?quick=true");
  const res2 = await GET(req2);
  const data2 = await res2.json();
  console.log("Status:", res2.status);
  console.log("Response Body (quick):", JSON.stringify(data2, null, 2));

  if (res2.status !== 200 || data2.checks.database !== "skipped") {
    throw new Error("GET /api/health?quick=true failed verification");
  }

  // 3. Test HEAD /api/health
  console.log("\n3. Testing HEAD /api/health...");
  const res3 = await HEAD();
  console.log("Status:", res3.status);
  console.log("Headers Cache-Control:", res3.headers.get("cache-control"));
  if (res3.status !== 200) {
    throw new Error("HEAD /api/health failed");
  }

  // 4. Test GET /api/healthz
  console.log("\n4. Testing GET /api/healthz (alias)...");
  const req4 = new Request("http://localhost:3000/api/healthz");
  const res4 = await GET_Z(req4);
  const data4 = await res4.json();
  console.log("Status:", res4.status);
  console.log("Status code:", data4.status);
  if (res4.status !== 200 || data4.status !== "ok") {
    throw new Error("GET /api/healthz failed");
  }

  console.log("\n ALL HEALTH CHECK TESTS PASSED 100%!");
}

testHealthRoute().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
