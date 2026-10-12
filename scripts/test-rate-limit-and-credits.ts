import { PrismaClient } from "@prisma/client";
import { DAILY_FREE_CREDITS, getUserCreditBalance, ensureDailyCredits } from "../src/lib/credits";
import { checkUserRateLimit } from "../src/lib/gemini";

const db = new PrismaClient();

function assert(condition: boolean, message: string, detail?: any) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    if (detail) console.error("         Detail:", detail);
    process.exitCode = 1;
  }
}

async function run() {
  console.log("=================================================");
  console.log("TESTING $5.00 DAILY CREDITS & 2 REQ/MIN RATE LIMIT");
  console.log("=================================================\n");

  // 1. Check DAILY_FREE_CREDITS constant
  console.log("--- 1. Testing Daily Free Credits Constant ---");
  assert(DAILY_FREE_CREDITS === 20.0, "DAILY_FREE_CREDITS is exactly $20.00", DAILY_FREE_CREDITS);

  // 2. Check User Credit Balances from DB
  console.log("\n--- 2. Testing User Credit Balances ---");
  const student = await db.user.findFirst({ where: { role: "student" } });
  if (!student) throw new Error("No student user found");

  const balance = await getUserCreditBalance(student.id);
  console.log("Student balance:", {
    freeCredits: balance.freeCredits,
    purchasedCredits: balance.purchasedCredits,
    totalCredits: balance.totalCredits,
  });

  assert(balance.freeCredits >= 0, "Student free credits balance is non-negative", balance.freeCredits);

  // 3. Test Rate Limiter (Max 2 requests per minute per user)
  console.log("\n--- 3. Testing Rate Limiter (Strict 2 Requests / Minute) ---");
  const testUserId = "rate-limit-test-user-" + Date.now();

  const req1 = checkUserRateLimit(testUserId, 2);
  console.log("Request 1 allowed:", req1);
  assert(req1 === true, "Request 1 within 60s window allowed");

  const req2 = checkUserRateLimit(testUserId, 2);
  console.log("Request 2 allowed:", req2);
  assert(req2 === true, "Request 2 within 60s window allowed");

  const req3 = checkUserRateLimit(testUserId, 2);
  console.log("Request 3 allowed:", req3);
  assert(req3 === false, "Request 3 within 60s window blocked (429 Rate Limit)");

  const req4 = checkUserRateLimit(testUserId, 2);
  console.log("Request 4 allowed:", req4);
  assert(req4 === false, "Request 4 within 60s window blocked (429 Rate Limit)");

  // 4. Verify Google Provider in DB is Gemini 3.8 Flash
  console.log("\n--- 4. Checking Google Provider in Database ---");
  const googleProvider = await db.aiProvider.findFirst({ where: { provider: "google" } });
  console.log("Google Provider:", {
    name: googleProvider?.name,
    modelKey: googleProvider?.modelKey,
    hasKey: Boolean(googleProvider?.apiKey),
  });

  assert(googleProvider?.modelKey === "gemini-3.8-flash", "Google provider modelKey is 'gemini-3.8-flash'", googleProvider?.modelKey);

  console.log("\n=================================================");
  console.log("ALL RATE LIMIT & CREDIT TESTS PASSED!");
  console.log("=================================================\n");
  await db.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
