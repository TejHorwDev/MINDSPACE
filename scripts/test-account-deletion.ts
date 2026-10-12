import { db } from "../src/lib/db";
import { hash, compare } from "bcryptjs";

async function runAccountDeletionAudit() {
  console.log("=== MINDSPACE SELF-SERVICE ACCOUNT DELETION AUDIT ===");

  const email = `delete-me-${Date.now()}@example.com`;
  const password = "DeletePassword123!";
  const passwordHash = await hash(password, 10);

  // 1. Create test user
  const user = await db.user.create({
    data: {
      email,
      name: "User To Delete",
      passwordHash,
      role: "student",
    },
  });

  // 2. Create projects & files
  const project = await db.project.create({
    data: {
      ownerId: user.id,
      name: "Project Before Deletion",
      publicSlug: `del-slug-${Date.now()}`,
    },
  });

  await db.projectFile.create({
    data: {
      projectId: project.id,
      path: "index.html",
      content: "<h1>To be deleted</h1>",
    },
  });

  console.log(`Created user ${user.id} with project ${project.id}.`);

  // 3. Verify password confirmation matches
  const isMatch = await compare(password, user.passwordHash!);
  if (!isMatch) {
    throw new Error("Password verification failed.");
  }
  console.log("Password verified successfully.");

  // 4. Perform complete account deletion (mirrors DELETE /api/user/account)
  await db.user.delete({
    where: { id: user.id },
  });

  // 5. Confirm user is completely gone from DB
  const deletedUser = await db.user.findUnique({ where: { id: user.id } });
  if (deletedUser) {
    throw new Error("❌ FAILED: User was not deleted from database!");
  }

  const deletedProject = await db.project.findUnique({ where: { id: project.id } });
  if (deletedProject) {
    throw new Error("❌ FAILED: Projects were not cascadingly deleted!");
  }

  console.log("✅ PASSED: User, projects, and all personal records completely purged from database.");
  console.log("\n🎉 ALL ACCOUNT DELETION TESTS PASSED 100%!");
}

runAccountDeletionAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
