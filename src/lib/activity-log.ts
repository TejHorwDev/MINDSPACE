import { db } from "@/lib/db";

export interface LogAdminActionParams {
  adminUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
}

export async function logAdminAction({
  adminUserId,
  action,
  targetType,
  targetId,
  details,
}: LogAdminActionParams) {
  try {
    return await db.adminActivityLog.create({
      data: {
        adminUserId,
        action,
        targetType,
        targetId: targetId ?? null,
        details: details ? (details as any) : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write to admin activity log:", error);
    return null;
  }
}
