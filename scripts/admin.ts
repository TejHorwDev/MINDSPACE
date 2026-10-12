/**
 * MINDSPACE admin helper script (run with bun).
 *
 * Usage:
 *   bun scripts/admin.ts                    — ensure the default admin account exists
 *   bun scripts/admin.ts promote <email>    — promote an existing user to admin
 *   bun scripts/admin.ts demote <email>     — demote an admin back to student
 */
import { db } from "../src/lib/db";
import { hash } from "bcryptjs";

const DEFAULT_ADMIN_EMAIL = "admin@mindspace.test";
const DEFAULT_ADMIN_PASSWORD = "mindspace-admin";

async function main() {
  const command = process.argv[2] ?? "seed";

  if (command === "promote" || command === "demote") {
    const email = process.argv[3]?.trim().toLowerCase();
    if (!email) {
      console.error(`Usage: bun scripts/admin.ts ${command} <email>`);
      process.exit(1);
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }

    const role = command === "promote" ? "admin" : "student";
    await db.user.update({ where: { id: user.id }, data: { role } });
    console.log(`OK — ${email} is now an ${role === "admin" ? "admin" : "student"}.`);
    return;
  }

  // Default: seed the built-in admin account.
  const existing = await db.user.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL },
  });

  if (existing) {
    if (existing.role !== "admin") {
      await db.user.update({
        where: { id: existing.id },
        data: { role: "admin" },
      });
    }
    console.log(`OK — admin account ready: ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD}`);
    return;
  }

  await db.user.create({
    data: {
      name: "MINDSPACE Admin",
      email: DEFAULT_ADMIN_EMAIL,
      passwordHash: await hash(DEFAULT_ADMIN_PASSWORD, 12),
      role: "admin",
    },
  });
  console.log(`OK — created admin account: ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
