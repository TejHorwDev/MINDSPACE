import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Phase 6: Contact Channels & Credit Plans...");

  // 1. Seed default Purchase Contact Channels (Discord & WhatsApp)
  const discordExists = await prisma.contactChannel.findFirst({
    where: { name: "Discord" },
  });

  if (!discordExists) {
    await prisma.contactChannel.create({
      data: {
        name: "Discord",
        iconType: "discord",
        contactLink: "https://discord.gg/mindspace",
        instructions: "Join our official Discord server and open a ticket or message #credits-support to arrange payment.",
        active: true,
        displayOrder: 0,
      },
    });
    console.log("Seeded Discord channel.");
  }

  const whatsappExists = await prisma.contactChannel.findFirst({
    where: { name: "WhatsApp" },
  });

  if (!whatsappExists) {
    await prisma.contactChannel.create({
      data: {
        name: "WhatsApp",
        iconType: "whatsapp",
        contactLink: "https://wa.me/9779800000000?text=Hi%20MINDSPACE%20team,%20I%20would%20like%20to%20purchase%20AI%20credits",
        instructions: "Send a direct message on WhatsApp to arrange payment via eSewa, Khalti, or Bank transfer.",
        active: true,
        displayOrder: 1,
      },
    });
    console.log("Seeded WhatsApp channel.");
  }

  // 2. Seed default Credit Plans
  const existingPlans = await prisma.creditPlan.count();
  if (existingPlans === 0) {
    await prisma.creditPlan.createMany({
      data: [
        {
          name: "Starter Boost",
          priceNPR: 500,
          creditsGrantedUSD: 10.0,
          active: true,
          displayOrder: 0,
        },
        {
          name: "Pro Creator Pack",
          priceNPR: 1200,
          creditsGrantedUSD: 25.0,
          active: true,
          displayOrder: 1,
        },
        {
          name: "Studio Supercharge",
          priceNPR: 2500,
          creditsGrantedUSD: 60.0,
          active: true,
          displayOrder: 2,
        },
      ],
    });
    console.log("Seeded default Credit Plans.");
  }

  // 3. Ensure existing users have free credits initialized to $20.00
  const users = await prisma.user.findMany({
    where: {
      freeCreditsBalance: 0,
      purchasedCreditsBalance: 0,
    },
  });

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        freeCreditsBalance: 20.0,
        creditsResetAt: new Date(),
      },
    });
    // Record initial daily_reset transaction
    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: 20.0,
        type: "daily_reset",
        reason: "Initial daily free credit allocation ($20.00)",
      },
    });
  }

  console.log("Phase 6 seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
