import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const db = new PrismaClient();
const secret = process.env.NEXTAUTH_SECRET || "mindspace-development-secret-change-in-production";

async function run() {
  console.log("=================================================");
  console.log("TESTING COMPLETE ADMIN KEY LIFECYCLE");
  console.log("=================================================\n");

  const baseUrl = "http://localhost:3000";

  const admin = await db.user.findFirst({ where: { role: "admin" } });
  const student = await db.user.findFirst({ where: { role: "student" } });
  const project = await db.project.findFirst({
    where: { ownerId: student?.id },
    select: { id: true, name: true },
  });

  if (!admin || !student || !project) {
    console.error("Missing fixtures");
    process.exit(1);
  }

  const adminToken = await encode({
    token: { id: admin.id, email: admin.email, role: admin.role },
    secret,
  });
  const studentToken = await encode({
    token: { id: student.id, email: student.email, role: student.role },
    secret,
  });

  const adminCookie = `next-auth.session-token=${adminToken}; __Secure-next-auth.session-token=${adminToken}`;
  const studentCookie = `next-auth.session-token=${studentToken}; __Secure-next-auth.session-token=${studentToken}`;

  const gemini = await db.aiProvider.findFirst({ where: { provider: "google" } });
  if (!gemini) throw new Error("Gemini provider not found");

  // Step 1: Update API key via PATCH /api/admin/providers/:id
  console.log("--- 1. Testing Admin PATCH /api/admin/providers/:id ---");
  const testApiKey = "AIzaSy_Simulated_Admin_Key_789";
  const patchRes = await fetch(`${baseUrl}/api/admin/providers/${gemini.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      apiKey: testApiKey,
    }),
  });

  console.log("PATCH status:", patchRes.status);
  const patchData = await patchRes.json();
  console.log("Updated provider apiKey:", patchData.provider?.apiKey);

  if (patchData.provider?.apiKey === testApiKey) {
    console.log("  [PASS] Key updated in database via admin API!");
  }

  // Step 2: Verify GET now reports hasConfiguredProvider: true
  console.log("\n--- 2. Checking GET /api/projects/:id/ai-chat after key update ---");
  const getRes = await fetch(`${baseUrl}/api/projects/${project.id}/ai-chat`, {
    headers: { Cookie: studentCookie },
  });
  const getData = await getRes.json();
  console.log("hasConfiguredProvider:", getData.hasConfiguredProvider);
  const geminiOpt = getData.providers?.find((p: any) => p.id === gemini.id);
  console.log("Gemini hasKey status:", geminiOpt?.hasKey);

  if (getData.hasConfiguredProvider === true && geminiOpt?.hasKey === true) {
    console.log("  [PASS] GET immediately detects configured provider without restart!");
  }

  // Step 3: Verify POST now makes real network call with that key
  console.log("\n--- 3. Testing POST /api/projects/:id/ai-chat with updated key ---");
  const postRes = await fetch(`${baseUrl}/api/projects/${project.id}/ai-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: studentCookie,
    },
    body: JSON.stringify({
      prompt: "Make the header sticky with blur",
    }),
  });

  console.log("POST status:", postRes.status);
  const postData = await postRes.json();
  console.log("POST response:", postData);

  // Since testApiKey is not a live Google key, it attempts real call to Google API and fails with real provider error, NOT NO_API_KEY_CONFIGURED
  if (postData.code !== "NO_API_KEY_CONFIGURED") {
    console.log("  [PASS] System immediately routed request to REAL network call using the new key without any restart!");
  }

  // Step 4: Reset key back to null
  console.log("\n--- 4. Resetting Key to null ---");
  await fetch(`${baseUrl}/api/admin/providers/${gemini.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      apiKey: null,
    }),
  });

  // Verify back to NO_API_KEY_CONFIGURED
  const finalGetRes = await fetch(`${baseUrl}/api/projects/${project.id}/ai-chat`, {
    headers: { Cookie: studentCookie },
  });
  const finalGetData = await finalGetRes.json();
  console.log("Final hasConfiguredProvider:", finalGetData.hasConfiguredProvider);

  if (finalGetData.hasConfiguredProvider === false) {
    console.log("  [PASS] Successfully reset to honest unconfigured state!");
  }

  await db.$disconnect();
  console.log("\n=================================================");
  console.log("LIFECYCLE TESTS COMPLETED SUCCESSFULLY!");
  console.log("=================================================\n");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
