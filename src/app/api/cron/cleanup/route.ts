import { NextResponse } from "next/server";
import { cleanupExpiredProjects } from "@/lib/publish-manager";

/**
 * GET /api/cron/cleanup
 * Scans for projects published >30 minutes ago, deletes static files, and resets isPublished.
 */
export async function GET() {
  try {
    const cleanedCount = await cleanupExpiredProjects();
    return NextResponse.json({
      success: true,
      cleanedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cron cleanup error:", error);
    return NextResponse.json(
      { error: "Failed to run expiration cleanup" },
      { status: 500 }
    );
  }
}
