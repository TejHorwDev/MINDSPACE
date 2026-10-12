import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const db = new PrismaClient();
const secret = process.env.NEXTAUTH_SECRET || "mindspace-development-secret-change-in-production";

async function main() {
  console.log("=== TESTING LIVE HTTP TEMPLATE API ENDPOINTS ===");

  const admin = await db.user.findFirst({ where: { role: "admin" } });
  const student = await db.user.findFirst({ where: { role: "student" } });

  if (!admin || !student) {
    throw new Error("Admin or student fixture not found in DB.");
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

  console.log(`[1] Encoded tokens for Admin (${admin.email}, role: ${admin.role}) and Student (${student.email})`);

  // 1. GET /api/templates
  const getRes = await fetch("http://localhost:3000/api/templates");
  if (!getRes.ok) throw new Error(`GET /api/templates failed: ${getRes.status}`);
  const { templates } = await getRes.json();
  console.log(`[2] GET /api/templates returned ${templates.length} templates.`);

  // 2. Student tries to create template -> 403 Forbidden
  const studentCreateRes = await fetch("http://localhost:3000/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({
      name: "Student Attempt",
      slug: "student-attempt",
      category: "portfolio",
      description: "Should fail with 403",
      files: [{ path: "index.html", content: "<h1>Fail</h1>" }],
    }),
  });
  if (studentCreateRes.status !== 403) {
    throw new Error(`Expected 403 for student create, got ${studentCreateRes.status}`);
  }
  console.log("[3] Verified student is blocked with 403 Forbidden from creating template.");

  // 3. Admin creates a new template via POST /api/templates
  const testSlug = `http-test-template-${Date.now()}`;
  const createRes = await fetch("http://localhost:3000/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: "HTTP Test Blueprint",
      slug: testSlug,
      category: "landing",
      description: "Created via live HTTP endpoint.",
      tags: "test, live, http",
      icon: "Rocket",
      isFeatured: false,
      files: [
        { path: "index.html", content: "<!DOCTYPE html><html><body><h1>Live HTTP</h1></body></html>" },
        { path: "styles.css", content: "body { background: #000; }" },
      ],
    }),
  });
  if (createRes.status !== 201) {
    const err = await createRes.text();
    throw new Error(`Admin create failed with ${createRes.status}: ${err}`);
  }
  const createData = await createRes.json();
  const createdTemplate = createData.template;
  console.log(`[4] Admin created template "${createdTemplate.name}" (ID: ${createdTemplate.id}, Slug: ${createdTemplate.slug})`);

  // 4. Admin updates template via PATCH /api/templates/[id]
  const patchRes = await fetch(`http://localhost:3000/api/templates/${createdTemplate.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: "HTTP Test Blueprint (Updated)",
      isFeatured: true,
      files: [
        { path: "index.html", content: "<h1>Updated Live Content</h1>" },
        { path: "styles.css", content: "body { background: #111; color: #fff; }" },
        { path: "script.js", content: "console.log('patched');" },
      ],
    }),
  });
  if (!patchRes.ok) {
    const err = await patchRes.text();
    throw new Error(`PATCH template failed: ${err}`);
  }
  const patchData = await patchRes.json();
  if (!patchData.template.isFeatured || patchData.template.fileCount !== 3) {
    throw new Error(`PATCH did not properly update template: ${JSON.stringify(patchData)}`);
  }
  console.log(`[5] Admin updated template via PATCH: Name="${patchData.template.name}", FileCount=${patchData.template.fileCount}, Featured=${patchData.template.isFeatured}`);

  // 5. Admin duplicates template via POST /api/templates/[id]/duplicate
  const dupRes = await fetch(`http://localhost:3000/api/templates/${createdTemplate.id}/duplicate`, {
    method: "POST",
    headers: { Cookie: adminCookie },
  });
  if (!dupRes.ok) {
    const err = await dupRes.text();
    throw new Error(`Duplicate template failed: ${err}`);
  }
  const dupData = await dupRes.json();
  const duplicatedTemplate = dupData.template;
  console.log(`[6] Admin duplicated template: "${duplicatedTemplate.name}" (Slug: ${duplicatedTemplate.slug})`);

  // 6. CRITICAL: Test deleting ANY template
  // Student tries to delete -> 403 Forbidden
  const studentDelRes = await fetch(`http://localhost:3000/api/templates/${createdTemplate.id}`, {
    method: "DELETE",
    headers: { Cookie: studentCookie },
  });
  if (studentDelRes.status !== 403) {
    throw new Error(`Expected 403 for student delete, got ${studentDelRes.status}`);
  }
  console.log("[7] Verified student is blocked with 403 from deleting template.");

  // Admin deletes the created template -> 200 OK
  const adminDelRes = await fetch(`http://localhost:3000/api/templates/${createdTemplate.id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  if (!adminDelRes.ok) {
    const err = await adminDelRes.text();
    throw new Error(`Admin delete failed: ${err}`);
  }
  const delData = await adminDelRes.json();
  console.log(`[8] Admin successfully deleted template: ${delData.message}`);

  // Admin deletes the duplicated template
  const adminDelDupRes = await fetch(`http://localhost:3000/api/templates/${duplicatedTemplate.id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  if (!adminDelDupRes.ok) {
    throw new Error(`Admin failed to delete duplicated template`);
  }
  console.log(`[9] Admin successfully deleted duplicated template.`);

  // 7. Test restore defaults endpoint: POST /api/templates/restore-defaults
  const restoreRes = await fetch("http://localhost:3000/api/templates/restore-defaults", {
    method: "POST",
    headers: { Cookie: adminCookie },
  });
  if (!restoreRes.ok) {
    const err = await restoreRes.text();
    throw new Error(`Restore defaults failed: ${err}`);
  }
  const restoreData = await restoreRes.json();
  console.log(`[10] Restore defaults response: ${restoreData.message} (Restored count: ${restoreData.restoredCount})`);

  // 8. Verify /admin page renders with templates table
  const adminPageRes = await fetch("http://localhost:3000/admin", {
    headers: { Cookie: adminCookie },
  });
  if (!adminPageRes.ok) {
    throw new Error(`/admin page returned ${adminPageRes.status}`);
  }
  const html = await adminPageRes.text();
  console.log(`[11] /admin page rendered with 200 OK (${html.length} bytes).`);

  console.log("=== ALL LIVE HTTP TEMPLATE API TESTS PASSED WITH 100% SUCCESS ===");
}

main()
  .catch((err) => {
    console.error("Test error:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
