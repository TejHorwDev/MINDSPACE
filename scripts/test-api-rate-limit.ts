import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const db = new PrismaClient();
const secret = process.env.NEXTAUTH_SECRET || "mindspace-development-secret-change-in-production";

async function run() {
  console.log("=================================================");
  console.log("TESTING HTTP 429 RATE LIMIT (2 REQ/MIN)");
  console.log("=================================================\n");

  const baseUrl = "http://localhost:3000";
  const student = await db.user.findFirst({ where: { role: "student" } });
  const project = await db.project.findFirst({
    where: { ownerId: student?.id },
    select: { id: true, name: true },
  });

  if (!student || !project) {
    console.error("Missing test fixtures");
    process.exit(1);
  }

  const token = await encode({
    token: { id: student.id, email: student.email, role: student.role },
    secret,
  });

  const cookieHeader = `next-auth.session-token=${token}; __Secure-next-auth.session-token=${token}`;

  // Fire Request 1
  console.log("Sending Request 1...");
  const res1 = await fetch(`${baseUrl}/api/projects/${project.id}/ai-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ prompt: "Hello 1" }),
  });
  console.log("Request 1 status:", res1.status);

  // Fire Request 2
  console.log("Sending Request 2...");
  const res2 = await fetch(`${baseUrl}/api/projects/${project.id}/ai-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ prompt: "Hello 2" }),
  });
  console.log("Request 2 status:", res2.status);

  // Fire Request 3 (must be rejected with 429)
  console.log("Sending Request 3 (should be blocked by rate limiter)...");
  const res3 = await fetch(`${baseUrl}/api/projects/${project.id}/ai-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ prompt: "Hello 3" }),
  });
  console.log("Request 3 status:", res3.status);
  const data3 = await res3.json();
  console.log("Request 3 response body:", data3);

  if (res3.status === 429 && data3.code === "RATE_LIMITED") {
    console.log("\n[PASS] HTTP 429 RATE_LIMITED successfully triggered on 3rd request!");
  } else {
    console.error("\n[FAIL] Expected 429 on 3rd request");
    process.exitCode = 1;
  }

  await db.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
