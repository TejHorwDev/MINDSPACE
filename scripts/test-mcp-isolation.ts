import { db } from "../src/lib/db";
import { encryptSecret, decryptSecret } from "../src/lib/crypto";
import { getUserActiveMcpServers } from "../src/lib/mcp";
import { isMcpFeatureEnabled } from "../src/lib/mcp";

async function runMcpIsolationAndSecurityAudit() {
  console.log("=== MINDSPACE MCP PER-USER ISOLATION & KILL-SWITCH AUDIT ===");

  // 1. Create two separate student accounts
  const userAEmail = `student-a-${Date.now()}@example.com`;
  const userBEmail = `student-b-${Date.now()}@example.com`;

  const userA = await db.user.create({
    data: {
      email: userAEmail,
      name: "Student A",
      role: "student",
      passwordHash: "dummy-hash",
    },
  });

  const userB = await db.user.create({
    data: {
      email: userBEmail,
      name: "Student B",
      role: "student",
      passwordHash: "dummy-hash",
    },
  });

  try {
    // Ensure MCP is allowed to start
    await db.systemSetting.upsert({
      where: { key: "allowUserMcpServers" },
      update: { value: "true" },
      create: { key: "allowUserMcpServers", value: "true" },
    });

    // 2. Student A adds a private MCP server with sensitive auth token
    const rawSecretToken = "sk-super-secret-student-a-token-12345";
    const encryptedToken = encryptSecret(rawSecretToken);

    console.log("\n[Test 1] Testing AES-256-GCM Token Encryption...");
    if (encryptedToken === rawSecretToken) {
      throw new Error("❌ FAILED: Token was stored in plain text!");
    }
    const decrypted = decryptSecret(encryptedToken);
    if (decrypted !== rawSecretToken) {
      throw new Error("❌ FAILED: Decryption failed to match original secret token!");
    }
    console.log("✅ PASSED: Token is securely encrypted with AES-256-GCM and decrypted correctly.");

    const serverA = await db.userMCPServer.create({
      data: {
        userId: userA.id,
        name: "Student A Private Docs MCP",
        url: "https://mcp.student-a-private.com/sse",
        authToken: encryptedToken,
        active: true,
      },
    });

    // 3. Confirm Student B CANNOT see or access Student A's MCP server
    console.log("\n[Break Attempt 2] Student B attempting to access Student A's MCP server...");
    const serversForUserB = await getUserActiveMcpServers(userB.id);
    const leakedServer = serversForUserB.find((s) => s.id === serverA.id);

    if (leakedServer) {
      throw new Error("❌ CRITICAL BREACH: Student B was able to see Student A's MCP server!");
    }
    console.log(`✅ PASSED: Student B sees ${serversForUserB.length} MCP servers (Zero visibility across accounts).`);

    // 4. Confirm Student A CAN access their own server
    const serversForUserA = await getUserActiveMcpServers(userA.id);
    if (serversForUserA.length !== 1 || serversForUserA[0].id !== serverA.id) {
      throw new Error("❌ FAILED: Student A could not access their own active MCP server.");
    }
    if (serversForUserA[0].authToken !== rawSecretToken) {
      throw new Error("❌ FAILED: Student A decrypted token did not match.");
    }
    console.log("✅ PASSED: Student A successfully accesses their own personal MCP server.");

    // 5. Test Admin Platform-Wide MCP Kill-Switch
    console.log("\n[Break Attempt 3] Testing Admin Platform-Wide MCP Kill Switch...");

    // Disable MCP platform-wide
    await db.systemSetting.upsert({
      where: { key: "allowUserMcpServers" },
      update: { value: "false" },
      create: { key: "allowUserMcpServers", value: "false" },
    });

    const isAllowedAfterDisable = await isMcpFeatureEnabled();
    if (isAllowedAfterDisable) {
      throw new Error("❌ FAILED: Admin toggle failed to disable MCP platform-wide.");
    }

    // Attempt to fetch active MCP servers when feature is disabled
    const serversWhenDisabled = await getUserActiveMcpServers(userA.id);
    if (serversWhenDisabled.length > 0) {
      throw new Error("❌ CRITICAL FAILED: Active MCP servers were returned even when admin disabled the feature!");
    }
    console.log("✅ PASSED: When admin disables MCP platform-wide, ALL MCP servers are immediately blocked.");

    // Re-enable MCP platform-wide
    await db.systemSetting.upsert({
      where: { key: "allowUserMcpServers" },
      update: { value: "true" },
      create: { key: "allowUserMcpServers", value: "true" },
    });

    const serversWhenReEnabled = await getUserActiveMcpServers(userA.id);
    if (serversWhenReEnabled.length !== 1) {
      throw new Error("❌ FAILED: Active MCP servers were not restored when admin re-enabled the feature.");
    }
    console.log("✅ PASSED: Admin re-enables MCP platform-wide, restoring personal servers.");

  } finally {
    // Cleanup test users and servers
    await db.userMCPServer.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await db.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    // Restore platform setting to true
    await db.systemSetting.upsert({
      where: { key: "allowUserMcpServers" },
      update: { value: "true" },
      create: { key: "allowUserMcpServers", value: "true" },
    });
  }

  console.log("\n🎉 ALL MCP PER-USER ISOLATION & KILL-SWITCH TESTS PASSED 100%!");
}

runMcpIsolationAndSecurityAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
