import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Account Plans...");

  // 1. Free plan
  const freePlan = await prisma.accountPlan.upsert({
    where: { name: "Free" },
    update: {
      dailyFreeCreditUSD: 20.00,
      maxProjects: 5,
      maxStorageMB: 50,
      isDefault: true,
      active: true,
    },
    create: {
      name: "Free",
      dailyFreeCreditUSD: 20.00,
      maxProjects: 5,
      maxStorageMB: 50,
      isDefault: true,
      active: true,
    },
  });

  // 2. Pro plan
  const proPlan = await prisma.accountPlan.upsert({
    where: { name: "Pro" },
    update: {
      dailyFreeCreditUSD: 50.00,
      maxProjects: 50,
      maxStorageMB: 500,
      isDefault: false,
      active: true,
    },
    create: {
      name: "Pro",
      dailyFreeCreditUSD: 50.00,
      maxProjects: 50,
      maxStorageMB: 500,
      isDefault: false,
      active: true,
    },
  });

  console.log(`Plans ready: Free (${freePlan.id}), Pro (${proPlan.id})`);

  // 3. Link all users with null planId to Free plan
  const updatedUsers = await prisma.user.updateMany({
    where: { planId: null },
    data: { planId: freePlan.id },
  });
  console.log(`Updated ${updatedUsers.count} users to Free plan.`);

  // 4. Migrate any existing AiChatMessages without a chatSessionId into a default session per project
  const orphanedMessages = await prisma.aiChatMessage.findMany({
    where: { chatSessionId: null },
    select: { id: true, projectId: true, userId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (orphanedMessages.length > 0) {
    console.log(`Migrating ${orphanedMessages.length} orphaned chat messages to sessions...`);
    const projectUserPairs = new Map<string, string>(); // projectId -> userId
    for (const msg of orphanedMessages) {
      if (!projectUserPairs.has(msg.projectId)) {
        projectUserPairs.set(msg.projectId, msg.userId);
      }
    }

    for (const [projectId, userId] of projectUserPairs.entries()) {
      // Find or create default session
      let session = await prisma.chatSession.findFirst({
        where: { projectId, userId },
        orderBy: { createdAt: "asc" },
      });

      if (!session) {
        session = await prisma.chatSession.create({
          data: {
            projectId,
            userId,
            title: "Initial Conversation",
          },
        });
      }

      await prisma.aiChatMessage.updateMany({
        where: { projectId, chatSessionId: null },
        data: { chatSessionId: session.id },
      });
    }
    console.log("Orphaned messages migrated successfully.");
  }

  console.log("Account plans and chat sessions seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
