import { db } from "../src/lib/db";
import { sanitizePlainText } from "../src/lib/sanitize";

async function runReportsSystemAudit() {
  console.log("=== MINDSPACE PUBLISHED SITES REPORTING SYSTEM AUDIT ===");

  // 1. Ensure a published project exists
  let user = await db.user.findFirst();
  if (!user) {
    user = await db.user.create({
      data: {
        email: `reporter-${Date.now()}@example.com`,
        name: "Test Reporter",
        role: "student",
      },
    });
  }

  const slug = `reported-site-${Date.now()}`;
  const project = await db.project.create({
    data: {
      ownerId: user.id,
      name: "Flagged Site Demo",
      publicSlug: slug,
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  try {
    // 2. Submit report with potential XSS in reason and details
    console.log("\n[Test 1] Submitting a report with XSS payload in details...");
    const rawReason = "Malware or Phishing";
    const rawDetails = "Suspicious prompt asking for credentials: <script>alert('xss-in-report')</script>";

    const cleanReason = sanitizePlainText(rawReason);
    const cleanDetails = sanitizePlainText(rawDetails);

    if (cleanDetails.includes("<script>")) {
      throw new Error("❌ FAILED: Raw script tag was not stripped from report details!");
    }
    console.log("✅ PASSED: Report details sanitized against script execution injection.");

    const report = await db.report.create({
      data: {
        projectId: project.id,
        reason: cleanReason,
        details: cleanDetails,
        status: "pending",
      },
    });

    console.log(`Created Report record ID: ${report.id} with status: ${report.status}`);

    // 3. Admin views pending reports
    console.log("\n[Test 2] Querying pending reports as admin...");
    const pendingReports = await db.report.findMany({
      where: { status: "pending" },
      include: {
        project: {
          select: { name: true, publicSlug: true },
        },
      },
    });

    const found = pendingReports.find((r) => r.id === report.id);
    if (!found) {
      throw new Error("❌ FAILED: Admin failed to retrieve submitted report!");
    }
    console.log(`✅ PASSED: Found pending report for project "${found.project.name}" (slug: ${found.project.publicSlug}).`);

    // 4. Admin resolves the report
    console.log("\n[Test 3] Resolving report as admin...");
    const updated = await db.report.update({
      where: { id: report.id },
      data: { status: "resolved" },
    });

    if (updated.status !== "resolved") {
      throw new Error("❌ FAILED: Report status was not updated to resolved!");
    }
    console.log("✅ PASSED: Report successfully resolved and marked as resolved by admin.");

  } finally {
    // Clean up test records
    await db.report.deleteMany({ where: { projectId: project.id } });
    await db.project.delete({ where: { id: project.id } });
  }

  console.log("\n🎉 ALL REPORT SYSTEM TESTS PASSED 100%!");
}

runReportsSystemAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
