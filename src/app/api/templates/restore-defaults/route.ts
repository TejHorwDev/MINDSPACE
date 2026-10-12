import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { restoreDefaultTemplates, getAllTemplates } from "@/lib/templates/service";

/**
 * POST /api/templates/restore-defaults
 * Admin only: Restores default system templates if any have been deleted.
 * Does not overwrite or delete any custom templates.
 */
export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id || (session.user.role !== "admin" && session.user.role !== "moderator")) {
    return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
  }

  try {
    const result = await restoreDefaultTemplates();

    // Log admin activity
    try {
      await db.adminActivityLog.create({
        data: {
          adminUserId: session.user.id,
          action: "templates_restored",
          targetType: "template",
          details: {
            restoredCount: result.restoredCount,
            restoredSlugs: result.restoredSlugs,
          },
        },
      });
    } catch {}

    const updatedTemplates = await getAllTemplates();

    return NextResponse.json({
      success: true,
      message:
        result.restoredCount > 0
          ? `Successfully restored ${result.restoredCount} default template(s).`
          : "All default templates are already present.",
      restoredCount: result.restoredCount,
      restoredSlugs: result.restoredSlugs,
      templates: updatedTemplates,
    });
  } catch (error) {
    console.error("Restore templates error:", error);
    return NextResponse.json(
      { error: "Failed to restore default templates." },
      { status: 500 }
    );
  }
}
