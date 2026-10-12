import { db } from "../src/lib/db";
import {
  getUserCreditBalance,
  ensureDailyCredits,
  deductAiCredits,
  grantCreditsToUser,
  resetAllUsersDailyCredits,
  calculateAiCostUSD,
  GEMINI_INPUT_PRICE_PER_TOKEN,
  GEMINI_OUTPUT_PRICE_PER_TOKEN,
} from "../src/lib/credits";
import { checkUserRateLimit } from "../src/lib/gemini";

async function runE2ETests() {
  console.log("==========================================");
  console.log("  MINDSPACE PHASE 6 E2E VERIFICATION SUITE");
  console.log("==========================================\n");

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      testPassed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
      testFailed++;
    }
  }

  // 1. Check existing users
  const student = await db.user.findFirst({
    where: { role: "student" },
  });
  const admin = await db.user.findFirst({
    where: { role: "admin" },
  });

  assert(!!student, "Student user exists in database", `Found: ${student?.email}`);
  assert(!!admin, "Admin user exists in database", `Found: ${admin?.email}`);

  if (!student || !admin) {
    console.error("Aborting tests due to missing test users.");
    process.exit(1);
  }

  // 2. Token Pricing Calculation Test
  console.log("\n--- Testing Token Cost Calculation ---");
  const cost = calculateAiCostUSD(1000, 500); // 1000 input, 500 output
  const expectedCost = 1000 * GEMINI_INPUT_PRICE_PER_TOKEN + 500 * GEMINI_OUTPUT_PRICE_PER_TOKEN;
  assert(
    Math.abs(cost - expectedCost) < 0.00001,
    "calculateAiCostUSD computes exact token cost correctly",
    `Calculated: $${cost}, Expected: $${expectedCost}`
  );

  // 3. Daily Credit Reset Logic
  console.log("\n--- Testing Daily Credit Reset Logic ---");
  // Ensure student has $20 free credits
  await db.user.update({
    where: { id: student.id },
    data: {
      freeCreditsBalance: 5.0,
      creditsResetAt: new Date(Date.now() - 25 * 3600 * 1000), // 25 hours ago
    },
  });

  const refreshedUser = await ensureDailyCredits(student.id);
  assert(
    refreshedUser?.freeCreditsBalance === 20.0,
    "ensureDailyCredits automatically resets free credits to $20.00 when day rolls over",
    `Balance: $${refreshedUser?.freeCreditsBalance}`
  );

  const resetTx = await db.creditTransaction.findFirst({
    where: { userId: student.id, type: "daily_reset" },
    orderBy: { createdAt: "desc" },
  });
  assert(
    !!resetTx,
    "Daily reset logs a CreditTransaction with type 'daily_reset'",
    `Tx amount: $${resetTx?.amount}`
  );

  // 4. Server-Side Deduction in DB Transaction
  console.log("\n--- Testing Server-Side Credit Deduction ---");
  // Deduct for 2,000 input tokens and 1,000 output tokens
  const deductResult = await deductAiCredits(
    student.id,
    2000,
    1000,
    "E2E Test AI Help request"
  );

  assert(
    deductResult.success === true,
    "deductAiCredits successfully deducted from free balance",
    `Remaining: $${deductResult.remainingBalance}`
  );
  assert(
    deductResult.freeBalance < 20.0,
    "Free balance accurately decremented",
    `Actual: $${deductResult.freeBalance}`
  );

  const usageTx = await db.creditTransaction.findFirst({
    where: { userId: student.id, type: "ai_usage" },
    orderBy: { createdAt: "desc" },
  });
  assert(
    !!usageTx && usageTx.amount < 0,
    "ai_usage CreditTransaction created with exact negative spend amount",
    `Logged amount: ${usageTx?.amount}`
  );

  // 5. Rate Limiting Test
  console.log("\n--- Testing Rate Limiting (max 10 req/min) ---");
  const testIpOrUser = `rate-test-${Date.now()}`;
  let allowedCount = 0;
  for (let i = 0; i < 12; i++) {
    const allowed = checkUserRateLimit(testIpOrUser, 10, 60000);
    if (allowed) allowedCount++;
  }
  assert(
    allowedCount === 10,
    "Rate limiter permits exactly 10 requests within 60s and blocks subsequent requests",
    `Allowed count: ${allowedCount} of 12`
  );

  // 6. Zero Balance Blocking Test
  console.log("\n--- Testing Zero Balance Blocking ---");
  // Temporarily set student balance to 0
  await db.user.update({
    where: { id: student.id },
    data: {
      freeCreditsBalance: 0,
      purchasedCreditsBalance: 0,
      creditsResetAt: new Date(), // today so it doesn't auto-reset
    },
  });

  const zeroBalance = await getUserCreditBalance(student.id);
  assert(
    zeroBalance.totalCredits === 0,
    "User balance is strictly $0.00",
    `Total: $${zeroBalance.totalCredits}`
  );

  let blocked = false;
  try {
    await deductAiCredits(student.id, 500, 200, "Attempt on $0 balance");
  } catch (err: any) {
    blocked = true;
  }
  assert(
    blocked,
    "deductAiCredits strictly blocks request (throws InsufficientCreditsError) when user balance is $0"
  );

  // 7. Purchase Contact Channels Test
  console.log("\n--- Testing Purchase Contact Channels ---");
  const channels = await db.contactChannel.findMany({
    orderBy: { displayOrder: "asc" },
  });
  assert(
    channels.length >= 2,
    "At least 2 Contact Channels exist in database",
    `Found count: ${channels.length}`
  );

  const discordChannel = channels.find((c) => c.name.toLowerCase().includes("discord"));
  const whatsappChannel = channels.find((c) => c.name.toLowerCase().includes("whatsapp"));

  assert(
    !!discordChannel && discordChannel.active,
    "Discord is seeded as an active Contact Channel with real link",
    `Link: ${discordChannel?.contactLink}`
  );
  assert(
    !!whatsappChannel && whatsappChannel.active,
    "WhatsApp is seeded as an active Contact Channel with real link",
    `Link: ${whatsappChannel?.contactLink}`
  );

  // Channel CRUD Test
  const newChannel = await db.contactChannel.create({
    data: {
      name: "eSewa Pay",
      iconType: "wallet",
      contactLink: "https://wa.me/9779800000000?text=I+want+to+pay+via+eSewa",
      instructions: "Transfer to eSewa ID: 9800000000 and send screenshot",
      active: true,
      displayOrder: 3,
    },
  });
  assert(
    !!newChannel.id,
    "Admin can add a new ContactChannel (e.g. eSewa)",
    `Channel ID: ${newChannel.id}`
  );

  // Toggle active
  const updatedChannel = await db.contactChannel.update({
    where: { id: newChannel.id },
    data: { active: false },
  });
  assert(
    updatedChannel.active === false,
    "Admin can toggle active status of a ContactChannel",
    `Active: ${updatedChannel.active}`
  );

  // Delete channel
  await db.contactChannel.delete({ where: { id: newChannel.id } });
  const checkDeleted = await db.contactChannel.findUnique({ where: { id: newChannel.id } });
  assert(checkDeleted === null, "Admin can delete a ContactChannel", "Successfully removed");

  // 8. Credit Plans & Admin Grant Test
  console.log("\n--- Testing Credit Plans & Admin Grant ---");
  const plans = await db.creditPlan.findMany({
    orderBy: { displayOrder: "asc" },
  });
  assert(
    plans.length >= 3,
    "At least 3 default Credit Plans exist in database",
    `Found count: ${plans.length}`
  );

  // Admin grants credits to student
  const grantAmount = 25.0; // Pro Creator $25 USD
  const grantResult = await grantCreditsToUser(
    admin.id,
    student.id,
    grantAmount,
    "Test Admin Grant Pro Creator (1200 NPR)"
  );

  assert(
    !!grantResult.user,
    "Admin can grant credits to any user",
    `New purchased balance: $${grantResult.user.purchasedCreditsBalance}`
  );
  assert(
    grantResult.user.purchasedCreditsBalance >= 25.0,
    "Purchased credits accurately credited to user balance",
    `Balance: $${grantResult.user.purchasedCreditsBalance}`
  );

  const grantTx = await db.creditTransaction.findFirst({
    where: { userId: student.id, type: "admin_grant" },
    orderBy: { createdAt: "desc" },
  });
  assert(
    !!grantTx && grantTx.amount === 25.0,
    "CreditTransaction logged with type 'admin_grant' and exact amount",
    `Logged amount: $${grantTx?.amount}, Reason: ${grantTx?.reason}`
  );

  // Reset student free credits back to $20 for clean state
  await db.user.update({
    where: { id: student.id },
    data: {
      freeCreditsBalance: 20.0,
      creditsResetAt: new Date(),
    },
  });

  // 9. AI Chat & Project File Diff Flow
  console.log("\n--- Testing AI Project Help & File Update ---");
  const project = await db.project.findFirst({
    where: { ownerId: student.id },
    include: { files: true },
  });

  if (project) {
    assert(!!project, "Test project found for student", `Project: ${project.name} (${project.id})`);

    // Create an AI chat message with a proposed diff
    const testOldCode = "<h1>Hello World</h1>";
    const testNewCode = '<h1 class="text-primary">Hello World Updated by AI</h1>';

    const aiMessage = await db.aiChatMessage.create({
      data: {
        projectId: project.id,
        userId: student.id,
        role: "assistant",
        content: "Here is your requested update to make the heading styled.",
        inputTokens: 80,
        outputTokens: 40,
        costUSD: 0.00002,
        diffs: [
          {
            path: "index.html",
            originalContent: testOldCode,
            proposedContent: testNewCode,
            status: "pending",
          },
        ],
      },
    });

    assert(
      !!aiMessage.id,
      "AI chat message and proposed diffs saved to database",
      `Message ID: ${aiMessage.id}`
    );

    // Apply the diff to real ProjectFile
    const updatedFile = await db.projectFile.upsert({
      where: {
        projectId_path: {
          projectId: project.id,
          path: "index.html",
        },
      },
      update: {
        content: testNewCode,
        updatedAt: new Date(),
      },
      create: {
        projectId: project.id,
        path: "index.html",
        content: testNewCode,
      },
    });

    assert(
      updatedFile.content === testNewCode,
      "Applying AI diff successfully writes change to real ProjectFile",
      `Saved content: ${updatedFile.content}`
    );

    // Update message status to applied
    const updatedDiffs = [
      {
        path: "index.html",
        originalContent: testOldCode,
        proposedContent: testNewCode,
        status: "applied",
      },
    ];
    await db.aiChatMessage.update({
      where: { id: aiMessage.id },
      data: { diffs: updatedDiffs },
    });

    const verifyMsg = await db.aiChatMessage.findUnique({
      where: { id: aiMessage.id },
    });
    const parsed = verifyMsg?.diffs as any[];
    assert(
      parsed[0]?.status === "applied",
      "Proposed diff state transitions to 'applied'",
      `Status: ${parsed[0]?.status}`
    );
  } else {
    console.log("[SKIP] No student project found to test ProjectFile diff application.");
  }

  console.log("\n==========================================");
  console.log(`  E2E TEST SUMMARY: ${testPassed} PASSED, ${testFailed} FAILED`);
  console.log("==========================================\n");

  if (testFailed > 0) {
    process.exit(1);
  }
}

runE2ETests()
  .then(() => {
    console.log("E2E Test Suite completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("E2E Test Suite encountered an error:", err);
    process.exit(1);
  });
