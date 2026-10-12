import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import {
  getAllSystemSettings,
  setDailyRequestLimit,
  setLowBalanceThresholdUSD,
  setSystemSetting,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  const settings = await getAllSystemSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const { status, session } = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin access required." }, { status });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { dailyRequestLimit, rateLimitPerMinute, lowBalanceThresholdUSD } = body;

  if (dailyRequestLimit !== undefined) {
    const parsed = Number(dailyRequestLimit);
    if (isNaN(parsed) || parsed < 1 || parsed > 1000) {
      return NextResponse.json(
        { error: "Daily request limit must be a number between 1 and 1000." },
        { status: 400 }
      );
    }
    await setDailyRequestLimit(parsed);
  }

  if (rateLimitPerMinute !== undefined) {
    const parsed = Number(rateLimitPerMinute);
    if (isNaN(parsed) || parsed < 1 || parsed > 60) {
      return NextResponse.json(
        { error: "Rate limit per minute must be a number between 1 and 60." },
        { status: 400 }
      );
    }
    await setSystemSetting("rate_limit_per_minute", String(parsed));
  }

  if (lowBalanceThresholdUSD !== undefined) {
    const parsed = Number(lowBalanceThresholdUSD);
    if (isNaN(parsed) || parsed < 0.5 || parsed > 100) {
      return NextResponse.json(
        { error: "Low balance threshold must be a number between $0.50 and $100.00." },
        { status: 400 }
      );
    }
    await setLowBalanceThresholdUSD(parsed);
  }

  const updatedSettings = await getAllSystemSettings();
  return NextResponse.json({
    success: true,
    settings: updatedSettings,
  });
}

export async function POST(req: NextRequest) {
  return PATCH(req);
}
