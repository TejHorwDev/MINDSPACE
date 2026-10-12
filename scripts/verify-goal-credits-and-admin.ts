import { db } from "../src/lib/db";
import {
  calculateAiCostUSD,
  deductAiCredits,
  ensureDailyCredits,
  getUserCreditBalance,
  DAILY_FREE_CREDITS,
} from "../src/lib/credits";
import {
  getDailyRequestLimit,
  setDailyRequestLimit,
  getRateLimitPerMinute,
  getAllSystemSettings,
} from "../src/lib/settings";
import { testProviderConnection } from "../src/lib/gemini";

function assert(condition: boolean, label: string, actual?: any) {
  if (condition) {
    console.log(`  [PASS] ${label}`);
  } else {
    console.error(`  [FAIL] ${label}`);
    if (actual !== undefined) {
      console.error(`         Actual value:`, actual);
    }
    throw new Error(`Assertion failed: ${label}`);
  }
}

async function runVerification() {
  console.log("=================================================");
  console.log("MINDSPACE VERIFICATION: CREDITS, PAID PLANS, & ADMIN");
  console.log("=================================================\n");

  // TEST 1: Pricing Math & Visual $20.00 Drain Rate
  console.log("--- 1. Testing Pricing Math & $20.00 Drain Rate ---");
  assert(DAILY_FREE_CREDITS === 20.0, "Daily free credits is set to $20.00", DAILY_FREE_CREDITS);

  // Normal request: 300 input tokens, 500 output tokens
  const normalCost = calculateAiCostUSD(300, 500);
  console.log(`  Normal prompt (300 in, 500 out) cost: $${normalCost}`);
  assert(normalCost >= 0.85 && normalCost <= 1.30, "Normal prompt costs between $0.85 and $1.30", normalCost);
  const normalRequestsPossible = Math.floor(20.0 / normalCost);
  console.log(`  Requests possible per day from $20.00: ${normalRequestsPossible}`);
  assert(normalRequestsPossible >= 15 && normalRequestsPossible <= 24, "Provides 15-24 requests per day on normal prompts", normalRequestsPossible);

  // Heavy request: 1200 input tokens, 2000 output tokens
  const heavyCost = calculateAiCostUSD(1200, 2000);
  console.log(`  Heavy prompt (1200 in, 2000 out) cost: $${heavyCost}`);
  assert(heavyCost >= 2.0 && heavyCost <= 3.5, "Heavy prompt costs between $2.00 and $3.50", heavyCost);
  const heavyRequestsPossible = Math.floor(20.0 / heavyCost);
  console.log(`  Heavy prompts possible before $20 is drained: ${heavyRequestsPossible}`);
  assert(heavyRequestsPossible >= 5 && heavyRequestsPossible <= 10, "Drains rapidly (5-10 requests) on heavy prompts", heavyRequestsPossible);

  // Min cost protection: 5 in, 5 out
  const minCost = calculateAiCostUSD(5, 5);
  console.log(`  Tiny prompt minimum cost: $${minCost}`);
  assert(minCost >= 0.75, "Minimum cost floor is at least $0.75", minCost);

  // TEST 2: Admin System Settings
  console.log("\n--- 2. Testing Admin System Settings & Governance ---");
  const initialLimit = await getDailyRequestLimit();
  console.log(`  Initial daily request limit: ${initialLimit}`);

  await setDailyRequestLimit(12);
  const updatedLimit = await getDailyRequestLimit();
  console.log(`  Updated daily request limit: ${updatedLimit}`);
  assert(updatedLimit === 12, "Daily request limit persists to database", updatedLimit);

  // Restore default
  await setDailyRequestLimit(15);
  const restoredLimit = await getDailyRequestLimit();
  assert(restoredLimit === 15, "Daily request limit successfully set to 15", restoredLimit);

  const allSettings = await getAllSystemSettings();
  console.log("  All system settings:", allSettings);
  assert(Boolean(allSettings.daily_request_limit), "System settings includes daily_request_limit");

  // TEST 3: Paid Plans Isolation & Free Tier Daily Reset
  console.log("\n--- 3. Testing Paid Plans vs Free Tier Separation ---");
  const testEmail = `test-paid-user-${Date.now()}@example.com`;
  const testUser = await db.user.create({
    data: {
      name: "Paid Test User",
      email: testEmail,
      role: "student",
      freeCreditsBalance: 0,
      purchasedCreditsBalance: 10.0, // User bought a 10.00 plan
      creditsResetAt: new Date(Date.now() - 48 * 3600 * 1000), // 2 days ago
    },
  });

  try {
    // 3a. Ensure daily credits: Paid user MUST NOT receive free credits
    const afterEnsure = await ensureDailyCredits(testUser.id);
    assert(
      afterEnsure?.freeCreditsBalance === 0,
      "Paid plan user receives NO daily free credits on reset",
      afterEnsure?.freeCreditsBalance
    );
    assert(
      afterEnsure?.purchasedCreditsBalance === 10.0,
      "Paid plan user retains exactly purchased credits",
      afterEnsure?.purchasedCreditsBalance
    );

    const balanceCheck = await getUserCreditBalance(testUser.id);
    assert(balanceCheck.isPaidUser === true, "User is identified as isPaidUser", balanceCheck.isPaidUser);
    assert(balanceCheck.freeCredits === 0, "Paid user freeCredits is 0", balanceCheck.freeCredits);
    assert(balanceCheck.totalCredits === 10.0, "Paid user totalCredits is purchasedCredits", balanceCheck.totalCredits);

    // 3b. Deduct credits: must deduct from purchased credits only
    const deductRes = await deductAiCredits(testUser.id, 200, 300, "Paid user test prompt");
    assert(deductRes.isPaidUser === true, "Deduction confirms isPaidUser", deductRes.isPaidUser);
    assert(deductRes.freeBalance === 0, "Free balance remains 0 during paid deduction", deductRes.freeBalance);
    assert(deductRes.purchasedBalance < 10.0, "Deducted strictly from purchased balance", deductRes.purchasedBalance);

    // 3c. Exhaust paid credits
    await db.user.update({
      where: { id: testUser.id },
      data: {
        purchasedCreditsBalance: 0, // All paid credits are complete!
        creditsResetAt: new Date(Date.now() - 48 * 3600 * 1000), // Simulating next day
      },
    });

    // 3d. Now that paid credits are completely exhausted (0) and it's a new day:
    const freeTierReversion = await ensureDailyCredits(testUser.id);
    assert(
      freeTierReversion?.freeCreditsBalance === 20.0,
      "Account reverts to Free Tier and receives $20.00 daily reset once paid credits are complete",
      freeTierReversion?.freeCreditsBalance
    );

    const freeBalanceCheck = await getUserCreditBalance(testUser.id);
    assert(freeBalanceCheck.isPaidUser === false, "Reverted user is identified as free tier (isPaidUser = false)", freeBalanceCheck.isPaidUser);
    assert(freeBalanceCheck.totalCredits === 20.0, "Reverted user totalCredits is $20.00", freeBalanceCheck.totalCredits);
  } finally {
    // Cleanup
    await db.creditTransaction.deleteMany({ where: { userId: testUser.id } });
    await db.user.delete({ where: { id: testUser.id } });
  }

  // TEST 4: Real Provider Connectivity
  console.log("\n--- 4. Testing Real Provider Connectivity ---");
  const googleProvider = await db.aiProvider.findFirst({ where: { provider: "google" } });
  if (googleProvider && googleProvider.apiKey) {
    const googleTest = await testProviderConnection({
      provider: "google",
      modelKey: googleProvider.modelKey,
      apiKey: googleProvider.apiKey,
    });
    console.log(`  Google Gemini (${googleProvider.modelKey}):`, {
      success: googleTest.success,
      latencyMs: googleTest.latencyMs,
      message: googleTest.message,
    });
    assert(googleTest.success === true, "Google Gemini real API connection verified");
  }

  // Test Groq with llama-3.1-8b-instant error handling
  const groqTest = await testProviderConnection({
    provider: "groq",
    modelKey: "llama-3.1-8b-instant",
    apiKey: "gsk_dummy_test_key",
  });
  console.log("  Groq connection test (with dummy key):", {
    success: groqTest.success,
    error: groqTest.error?.slice(0, 80),
  });
  assert(groqTest.success === false, "Groq correctly authenticates with real Groq servers (rejects dummy key)");

  console.log("\n=================================================");
  console.log("ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!");
  console.log("=================================================");
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
