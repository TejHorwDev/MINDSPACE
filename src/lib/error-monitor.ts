import * as Sentry from "@sentry/nextjs";

export interface SystemErrorEvent {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  source: "frontend" | "backend" | "api";
  url?: string;
  userAgent?: string;
  context?: Record<string, unknown>;
}

// In-memory buffer of recent errors (keeps last 50) for immediate admin inspection
const errorBuffer: SystemErrorEvent[] = [];
const MAX_BUFFER_SIZE = 50;

/**
 * Initializes error monitoring.
 * Safe to call multiple times.
 */
export function initErrorMonitoring() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (dsn && typeof Sentry.init === "function") {
    try {
      Sentry.init({
        dsn,
        tracesSampleRate: 1.0,
        environment: process.env.NODE_ENV || "development",
      });
    } catch (e) {
      console.warn("[ErrorMonitor] Failed to initialize Sentry:", e);
    }
  }
}

/**
 * Captures an exception across server or client boundaries.
 */
export function captureException(
  error: unknown,
  context?: {
    source?: "frontend" | "backend" | "api";
    url?: string;
    userAgent?: string;
    extra?: Record<string, unknown>;
  }
): SystemErrorEvent {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const source = context?.source || "backend";

  const event: SystemErrorEvent = {
    id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    message,
    stack,
    source,
    url: context?.url,
    userAgent: context?.userAgent,
    context: context?.extra,
  };

  // Prepend to recent error buffer
  errorBuffer.unshift(event);
  if (errorBuffer.length > MAX_BUFFER_SIZE) {
    errorBuffer.pop();
  }

  // Forward to Sentry if configured
  try {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
      Sentry.captureException(error, {
        extra: { ...context?.extra, source, eventId: event.id },
      });
    }
  } catch {
    // Sentry forwarding failure shouldn't throw
  }

  console.error(`[MINDSPACE ErrorMonitor][${source.toUpperCase()}]`, message, stack || "");

  return event;
}

/**
 * Returns recent captured errors for diagnostics.
 */
export function getRecentErrors(): SystemErrorEvent[] {
  return [...errorBuffer];
}

/**
 * Clears the error buffer.
 */
export function clearErrorBuffer() {
  errorBuffer.length = 0;
}
