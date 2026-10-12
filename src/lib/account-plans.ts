import { db } from "@/lib/db";

export interface PlanLimits {
  planId: string;
  planName: string;
  dailyFreeCreditUSD: number;
  maxProjects: number;
  maxStorageMB: number;
  currentProjects: number;
  currentStorageBytes: number;
}

/**
 * Retrieves the user's active account plan (Free vs Pro).
 * If the user has no plan assigned, links them to the default active plan.
 */
export async function getUserAccountPlan(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      planId: true,
      accountPlan: true,
    },
  });

  if (!user) return null;

  if (user.accountPlan) {
    return user.accountPlan;
  }

  // Find default active plan or fallback to first active
  let defaultPlan = await db.accountPlan.findFirst({
    where: { isDefault: true, active: true },
  });

  if (!defaultPlan) {
    defaultPlan = await db.accountPlan.findFirst({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    });
  }

  if (defaultPlan) {
    // Automatically link user
    await db.user.update({
      where: { id: userId },
      data: { planId: defaultPlan.id },
    });
    return defaultPlan;
  }

  // Hardcoded fallback if DB has no plans yet
  return {
    id: "default-free",
    name: "Free",
    priceNPR: 0,
    dailyFreeCreditUSD: 20.0,
    maxProjects: 5,
    maxStorageMB: 50,
    isDefault: true,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Checks if the user is allowed to create another project.
 */
export async function checkCanCreateProject(userId: string): Promise<{
  allowed: boolean;
  maxProjects: number;
  currentCount: number;
  planName: string;
}> {
  const plan = await getUserAccountPlan(userId);
  const currentCount = await db.project.count({
    where: { ownerId: userId },
  });

  const maxProjects = plan?.maxProjects ?? 5;
  return {
    allowed: currentCount < maxProjects,
    maxProjects,
    currentCount,
    planName: plan?.name ?? "Free",
  };
}

/**
 * Checks if adding the specified bytes exceeds the user's plan storage quota.
 */
export async function checkStorageQuota(
  userId: string,
  additionalBytes: number = 0
): Promise<{
  allowed: boolean;
  maxStorageMB: number;
  usedBytes: number;
  planName: string;
}> {
  const plan = await getUserAccountPlan(userId);
  const maxStorageMB = plan?.maxStorageMB ?? 50;
  const maxStorageBytes = maxStorageMB * 1024 * 1024;

  // Calculate sum of file contents across all user projects
  const files = await db.projectFile.findMany({
    where: { project: { ownerId: userId } },
    select: { content: true },
  });

  const usedBytes = files.reduce((acc, f) => acc + Buffer.byteLength(f.content, "utf8"), 0);

  return {
    allowed: usedBytes + additionalBytes <= maxStorageBytes,
    maxStorageMB,
    usedBytes,
    planName: plan?.name ?? "Free",
  };
}
