import { NextRequest, NextResponse } from "next/server";
import { captureException } from "@/lib/error-monitor";

/**
 * GET /api/test-error
 * Deliberately throws or captures a test exception to verify monitoring pipeline.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "captured";

  if (type === "unhandled") {
    // Deliberately throw an unhandled exception
    throw new Error("Deliberately thrown unhandled server exception for MINDSPACE error monitoring verification!");
  }

  // Captures a deliberate test error
  const testError = new Error("Deliberately thrown test error for MINDSPACE monitoring verification");
  const event = captureException(testError, {
    source: "api",
    url: req.url,
    userAgent: req.headers.get("user-agent") || undefined,
    extra: {
      testTimestamp: new Date().toISOString(),
      verifiedBy: "MINDSPACE Test Suite",
    },
  });

  return NextResponse.json({
    success: true,
    message: "Test error successfully triggered and captured by monitoring system.",
    eventId: event.id,
    timestamp: event.timestamp,
    sentryConfigured: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN),
  });
}
