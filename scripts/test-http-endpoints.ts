async function testEndpoints() {
  console.log("--- Testing HTTP Endpoints ---");

  // 1. Unauthenticated /api/credits -> should return 401 Unauthorized
  try {
    const res = await fetch("http://localhost:3000/api/credits");
    console.log(`GET /api/credits status: ${res.status} (Expected: 401)`);
    if (res.status === 401) {
      console.log("[PASS] /api/credits correctly requires authentication");
    } else {
      console.log(`[WARN] /api/credits returned status ${res.status}`);
    }
  } catch (err: any) {
    console.log("Could not reach /api/credits:", err.message);
  }

  // 2. Unauthenticated /api/admin/channels -> should return 401/403
  try {
    const res = await fetch("http://localhost:3000/api/admin/channels");
    console.log(`GET /api/admin/channels status: ${res.status} (Expected: 401 or 403)`);
    if (res.status === 401 || res.status === 403) {
      console.log("[PASS] /api/admin/channels strictly protects admin route");
    } else {
      console.log(`[WARN] /api/admin/channels returned status ${res.status}`);
    }
  } catch (err: any) {
    console.log("Could not reach /api/admin/channels:", err.message);
  }

  // 3. Unauthenticated /api/admin/credits/grant -> should return 401/403
  try {
    const res = await fetch("http://localhost:3000/api/admin/credits/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "fake", amountUSD: 100, reason: "hack" }),
    });
    console.log(`POST /api/admin/credits/grant status: ${res.status} (Expected: 401 or 403)`);
    if (res.status === 401 || res.status === 403) {
      console.log("[PASS] /api/admin/credits/grant strictly blocks unauthenticated grant attempt");
    } else {
      console.log(`[WARN] /api/admin/credits/grant returned status ${res.status}`);
    }
  } catch (err: any) {
    console.log("Could not reach /api/admin/credits/grant:", err.message);
  }

  // 4. Test cron reset endpoint without secret -> should return 401
  try {
    const res = await fetch("http://localhost:3000/api/cron/reset-credits", {
      method: "POST",
    });
    console.log(`POST /api/cron/reset-credits without token status: ${res.status} (Expected: 401)`);
    if (res.status === 401) {
      console.log("[PASS] Cron endpoint blocks unauthorized triggers without CRON_SECRET");
    } else {
      console.log(`[WARN] Cron endpoint returned ${res.status}`);
    }
  } catch (err: any) {
    console.log("Could not reach cron endpoint:", err.message);
  }

  console.log("--- HTTP Endpoint Security Verification Complete ---");
}

testEndpoints();
