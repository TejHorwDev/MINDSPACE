import { NextResponse } from "next/server";
import { resetAllUsersDailyCredits } from "@/lib/credits";
import { getAdminSession } from "@/lib/admin";

export async function POST(req: Request) {
  // Allow if admin or if matching CRON_SECRET auth header
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  let authorized = false;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    authorized = true;
  } else {
    const { session } = await getAdminSession();
    if (session) {
      authorized = true;
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await resetAllUsersDailyCredits();
    return NextResponse.json({
      success: true,
      message: `Reset ${result.resetCount} users out of ${result.totalUsers}`,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to reset credits." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
