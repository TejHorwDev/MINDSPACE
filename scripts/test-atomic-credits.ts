import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const user = await db.user.findFirst();
  console.log("User:", user?.id, "Free:", user?.freeCreditsBalance, "Purchased:", user?.purchasedCreditsBalance);
  if (!user) return;

  const aff1 = await db.$executeRawUnsafe(
    "UPDATE User SET purchasedCreditsBalance = purchasedCreditsBalance - ? WHERE id = ? AND purchasedCreditsBalance >= ?",
    0.01,
    user.id,
    0.01
  );
  console.log("Aff1 with purchasedCreditsBalance:", aff1);

  // Restore
  await db.$executeRawUnsafe(
    "UPDATE User SET purchasedCreditsBalance = purchasedCreditsBalance + ? WHERE id = ?",
    0.01,
    user.id
  );
  console.log("Restored!");
}

main().catch(console.error).finally(() => db.$disconnect());
