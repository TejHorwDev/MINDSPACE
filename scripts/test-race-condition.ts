import { db } from "../src/lib/db";
import {
  reserveAiCredits,
  settleAiCreditReservation,
  refundAiCreditReservation,
  InsufficientCreditsError,
  getUserCreditBalance,
} from "../src/lib/credits";

async function runRaceConditionTest() {
  console.log("=== RUNNING CREDIT RACE CONDITION TEST ===");

  // 1. Create a dedicated test user with exact balance for only ONE AI call ($0.75)
  const testEmail = `race-test-${Date.now()}@example.com`;
  const user = await db.user.create({
    data: {
      email: testEmail,
      name: "Race Test User",
      role: "student",
      freeCreditsBalance: 0.0,
      purchasedCreditsBalance: 0.75, // Exactly enough for 1 AI call ($0.75)
      creditsResetAt: new Date(),
    },
  });

  console.log(`Created test user ${user.id} with balance $0.75`);

  try {
    // 2. Fire TWO requests concurrently at the exact same millisecond
    console.log("Firing 2 concurrent credit reservations ($0.75 each) at the exact same millisecond...");

    const results = await Promise.allSettled([
      reserveAiCredits(user.id, 0.75),
      reserveAiCredits(user.id, 0.75),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    console.log(`Fulfilled reservations: ${fulfilled.length}`);
    console.log(`Rejected reservations: ${rejected.length}`);

    if (fulfilled.length !== 1 || rejected.length !== 1) {
      throw new Error(
        `RACE CONDITION FAILURE: Expected exactly 1 success and 1 rejection, got ${fulfilled.length} successes and ${rejected.length} rejections!`
      );
    }

    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
    if (!(rejectionReason instanceof InsufficientCreditsError)) {
      throw new Error(
        `Expected rejection to be InsufficientCreditsError, got: ${rejectionReason}`
      );
    }
    console.log("✓ PASS: One request succeeded and the other was blocked with InsufficientCreditsError!");

    // 3. Verify user's balance in database is now 0.00 and NEVER negative
    const balanceAfter = await db.user.findUnique({
      where: { id: user.id },
      select: { purchasedCreditsBalance: true, freeCreditsBalance: true },
    });

    console.log(`User balance after atomic reservation: $${balanceAfter?.purchasedCreditsBalance}`);
    if ((balanceAfter?.purchasedCreditsBalance ?? 0) < 0) {
      throw new Error(`Double-spend overdraft occurred! Balance is negative: ${balanceAfter?.purchasedCreditsBalance}`);
    }
    if (balanceAfter?.purchasedCreditsBalance !== 0) {
      throw new Error(`Expected balance 0.00, got: ${balanceAfter?.purchasedCreditsBalance}`);
    }
    console.log("✓ PASS: User balance is 0.00 without negative overdraft / double-spending!");

    // 4. Test concurrent refund if a request fails
    const successReservation = (fulfilled[0] as PromiseFulfilledResult<any>).value;
    console.log("Testing reservation refund...");
    await refundAiCreditReservation(successReservation);

    const balanceRefunded = await db.user.findUnique({
      where: { id: user.id },
      select: { purchasedCreditsBalance: true },
    });
    console.log(`User balance after refund: $${balanceRefunded?.purchasedCreditsBalance}`);
    if (balanceRefunded?.purchasedCreditsBalance !== 0.75) {
      throw new Error(`Expected balance 0.75 after refund, got: ${balanceRefunded?.purchasedCreditsBalance}`);
    }
    console.log("✓ PASS: Reservation refund restored exact original balance!");

    // 5. Test Free-tier race condition
    console.log("Testing free-tier user concurrent reservation...");
    await db.user.update({
      where: { id: user.id },
      data: {
        purchasedCreditsBalance: 0.0,
        freeCreditsBalance: 0.75, // Exactly enough for 1 AI call on free tier
        creditsResetAt: new Date(),
      },
    });

    const freeResults = await Promise.allSettled([
      reserveAiCredits(user.id, 0.75),
      reserveAiCredits(user.id, 0.75),
    ]);

    const freeFulfilled = freeResults.filter((r) => r.status === "fulfilled");
    const freeRejected = freeResults.filter((r) => r.status === "rejected");

    console.log(`Free-tier fulfilled: ${freeFulfilled.length}, rejected: ${freeRejected.length}`);
    if (freeFulfilled.length !== 1 || freeRejected.length !== 1) {
      throw new Error("Free-tier race condition test failed!");
    }
    console.log("✓ PASS: Free-tier concurrent requests also strictly locked at database level!");

    console.log("=== ALL CREDIT RACE CONDITION TESTS PASSED PERFECTLY ===");
  } finally {
    // Cleanup
    await db.user.delete({ where: { id: user.id } }).catch(() => {});
  }
}

runRaceConditionTest().catch((err) => {
  console.error("RACE CONDITION TEST ERROR:", err);
  process.exit(1);
});
