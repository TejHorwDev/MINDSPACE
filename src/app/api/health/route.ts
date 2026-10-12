import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface HealthCheckResponse {
  status: "ok" | "degraded" | "error";
  uptimeSeconds: number;
  uptimeHuman: string;
  timestamp: string;
  version: string;
  nodeEnv: string;
  checks: {
    system: "ok";
    database: "connected" | "disconnected" | "skipped";
    latencyMs?: number;
  };
  memory?: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  "X-Robots-Tag": "noindex, nofollow",
};

async function executeHealthCheck(checkDb: boolean = true): Promise<{
  data: HealthCheckResponse;
  httpStatus: number;
}> {
  const start = performance.now();
  let dbStatus: "connected" | "disconnected" | "skipped" = "skipped";
  let latencyMs: number | undefined;

  if (checkDb) {
    try {
      await db.$queryRawUnsafe("SELECT 1");
      latencyMs = Math.round(performance.now() - start);
      dbStatus = "connected";
    } catch (err) {
      console.warn("[Health Check] Database connectivity check failed:", err);
      dbStatus = "disconnected";
    }
  }

  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());
  const isHealthy = dbStatus !== "disconnected";

  const response: HealthCheckResponse = {
    status: isHealthy ? "ok" : "degraded",
    uptimeSeconds,
    uptimeHuman: formatUptime(uptimeSeconds),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.2.1",
    nodeEnv: process.env.NODE_ENV || "development",
    checks: {
      system: "ok",
      database: dbStatus,
      ...(latencyMs !== undefined ? { latencyMs } : {}),
    },
    memory: {
      rssMb: Math.round(mem.rss / (1024 * 1024)),
      heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
      heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
    },
  };

  return {
    data: response,
    httpStatus: 200,
  };
}

/**
 * GET /api/health
 * Ping endpoint for UptimeRobot, Render keep-alive, or container orchestration.
 * Query Params:
 *  - ?quick=true : skips the database ping for near 0ms execution
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const quick =
    url.searchParams.get("quick") === "true" ||
    url.searchParams.get("shallow") === "true";

  const { data, httpStatus } = await executeHealthCheck(!quick);

  return NextResponse.json(data, {
    status: httpStatus,
    headers: NO_CACHE_HEADERS,
  });
}

/**
 * HEAD /api/health
 * Returns headers only with 200 OK. Ideal for ultra-lightweight monitoring.
 */
export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: NO_CACHE_HEADERS,
  });
}
