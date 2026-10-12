import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const db = new PrismaClient();

const secret = process.env.NEXTAUTH_SECRET || "mindspace-development-secret-change-in-production";

async function run() {
  console.log("=================================================");
  console.log("TESTING HTTP API ROUTES FOR ZERO-FAKE AI");
  console.log("=================================================\n");

  const baseUrl = "http://localhost:3000";

  const admin = await db.user.findFirst({ where: { role: "admin" } });
  const student = await db.user.findFirst({ where: { role: "student" } });
  const project = await db.project.findFirst({
    where: { ownerId: student?.id },
    select: { id: true, name: true },
  });

  if (!admin || !student || !project) {
    console.error("Missing test fixtures:", { admin: !!admin, student: !!student, project: !!project });
    process.exit(1);
  }

  console.log(`Student: ${student.email}, Project: ${project.name} (${project.id})`);
  console.log(`Admin: ${admin.email}`);

  // Generate valid NextAuth JWT tokens
  const studentToken = await encode({
    token: { id: student.id, email: student.email, role: student.role },
    secret,
  });

  const adminToken = await encode({
    token: { id: admin.id, email: admin.email, role: admin.role },
    secret,
  });

  const studentCookie = `next-auth.session-token=${studentToken}; __Secure-next-auth.session-token=${studentToken}`;
  const adminCookie = `next-auth.session-token=${adminToken}; __Secure-next-auth.session-token=${adminToken}`;

  try {
    // Test 1: GET /api/projects/:id/ai-chat
    console.log("\n--- 1. Testing GET /api/projects/:id/ai-chat ---");
    const getRes = await fetch(`${baseUrl}/api/projects/${project.id}/ai-chat`, {
      headers: { Cookie: studentCookie },
    });
    console.log(`GET Status: ${getRes.status}`);
    const getData = await getRes.json();
    console.log("hasConfiguredProvider:", getData.hasConfiguredProvider);
    console.log("Providers received:", getData.providers?.map((p: any) => `${p.name} (hasKey: ${p.hasKey})`));

    // Test 2: POST /api/projects/:id/ai-chat without API key
    console.log("\n--- 2. Testing POST /api/projects/:id/ai-chat without API key ---");
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
    console.log(`POST Status: ${postRes.status}`);
    const postData = await postRes.json();
    console.log("POST Response:", postData);

    if (postRes.status === 503 && postData.code === "NO_API_KEY_CONFIGURED") {
      console.log("  [PASS] Correctly rejected with 503 NO_API_KEY_CONFIGURED and ZERO fake response!");
    } else {
      console.log("  [CHECK] Response status/code:", postRes.status, postData.code);
    }

    // Test 3: Admin Test Connection POST /api/admin/providers/:id/test
    console.log("\n--- 3. Testing Admin Test Connection Route ---");
    const provider = await db.aiProvider.findFirst({ where: { provider: "google" } });
    if (provider) {
      const testRes = await fetch(`${baseUrl}/api/admin/providers/${provider.id}/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookie,
        },
        body: JSON.stringify({
          apiKey: "AIzaSyTest_Real_Network_Ping_Key_9999",
        }),
      });
      console.log(`Admin Test Ping Status: ${testRes.status}`);
      const testData = await testRes.json();
      console.log("Admin Test Ping Response:", testData);

      if (testData.success === false && testData.error?.includes("API key not valid")) {
        console.log("  [PASS] Admin test ping correctly executed real Google API call and reported genuine error!");
      }
    }
  } finally {
    await db.$disconnect();
  }

  console.log("\n=================================================");
  console.log("API ROUTE TESTS COMPLETE!");
  console.log("=================================================\n");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
