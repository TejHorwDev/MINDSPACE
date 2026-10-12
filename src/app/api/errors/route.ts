import { NextRequest, NextResponse } from "next/server";
import { captureException, getRecentErrors, clearErrorBuffer } from "@/lib/error-monitor";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/errors
 * Frontend error logging endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, stack, url, userAgent, extra } = body || {};

    const syntheticError = new Error(message || "Frontend unhandled exception");
    if (stack) syntheticError.stack = stack;

    const event = captureException(syntheticError, {
      source: "frontend",
      url,
      userAgent: userAgent || req.headers.get("user-agent") || undefined,
      extra,
    });

    return NextResponse.json({ success: true, eventId: event.id });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to log error" }, { status: 500 });
  }
}

/**
 * GET /api/errors
 * Admin-only: list recent captured system errors.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const errors = getRecentErrors();
  return NextResponse.json({
    sentryConfigured: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN),
    errors,
  });
}

/**
 * DELETE /api/errors
 * Admin-only: clear error buffer.
 */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  clearErrorBuffer();
  return NextResponse.json({ success: true });
}
