import {
  buildScrubbedEnvironment,
  getOrCreateTerminalSession,
  killTerminalSession,
  MAX_CONCURRENT_TERMINALS,
} from "../src/lib/terminal-session";
import { db } from "../src/lib/db";

async function runTerminalSecurityAudit() {
  console.log("=== MINDSPACE TERMINAL SECURITY BREAK-ATTEMPT AUDIT ===");

  const sensitiveKeys = [
    "DATABASE_URL",
    "GEMINI_API_KEY",
    "GOOGLE_AI_API_KEY",
    "GROQ_API_KEY",
    "NVIDIA_API_KEY",
    "NIM_API_KEY",
    "NVAPI_KEY",
    "OPENAI_API_KEY",
    "NEXTAUTH_SECRET",
    "ADMIN_EMAIL",
    "PISTON_API_KEY",
  ];

  // 1. Audit Environment Scrubbing
  console.log("\n[Break Attempt 1] Inspecting terminal process environment variables...");
  const dummyWorkspace = "C:\\dummy\\workspace";
  const dummyProjectId = "test-proj-security";
  const scrubbed = buildScrubbedEnvironment(dummyWorkspace, dummyProjectId);

  let leaksFound = 0;
  for (const key of sensitiveKeys) {
    if (key in scrubbed) {
      console.error(`❌ CRITICAL SECURITY LEAK: ${key} found in scrubbed environment!`);
      leaksFound++;
    }
  }

  if (leaksFound === 0) {
    console.log("✅ PASSED: Zero sensitive secrets in terminal environment!");
    console.log("Scrubbed environment keys allowed:", Object.keys(scrubbed).join(", "));
  } else {
    throw new Error(`Terminal environment audit failed with ${leaksFound} leaked secrets!`);
  }

  // 2. Audit Concurrency Cap
  console.log(`\n[Break Attempt 2] Testing Concurrency Cap (Limit: ${MAX_CONCURRENT_TERMINALS})...`);

  // Ensure a test project exists in db
  let testProject = await db.project.findFirst();
  if (!testProject) {
    const user = await db.user.findFirst();
    if (!user) throw new Error("No user found in DB");
    testProject = await db.project.create({
      data: {
        name: "Security Terminal Test",
        ownerId: user.id,
      },
    });
  }

  // Clean up any lingering sessions
  for (let i = 0; i < 10; i++) {
    killTerminalSession(`cap-test-proj-${i}`);
  }

  const spawnedProjects: string[] = [];
  try {
    // Fill up to capacity
    for (let i = 0; i < MAX_CONCURRENT_TERMINALS; i++) {
      const pid = `cap-test-proj-${i}`;
      await getOrCreateTerminalSession(pid, "user-test");
      spawnedProjects.push(pid);
    }
    console.log(`Spawned ${spawnedProjects.length} sessions (at capacity).`);

    // Attempt to exceed cap with one more session
    let exceededBlocked = false;
    try {
      await getOrCreateTerminalSession("cap-test-proj-overflow", "user-test");
    } catch (capErr: any) {
      if (capErr.message.includes("capacity")) {
        exceededBlocked = true;
        console.log(`✅ PASSED: Overflow attempt correctly blocked with message: "${capErr.message}"`);
      } else {
        throw capErr;
      }
    }

    if (!exceededBlocked) {
      throw new Error("❌ FAILED: Concurrency cap failed to block overflow session!");
    }
  } finally {
    // Clean up test sessions
    for (const pid of spawnedProjects) {
      killTerminalSession(pid);
    }
    killTerminalSession("cap-test-proj-overflow");
  }

  console.log("\n🎉 ALL TERMINAL SECURITY TESTS PASSED 100%!");
}

runTerminalSecurityAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
