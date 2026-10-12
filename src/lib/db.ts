import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const SLOW_QUERY_THRESHOLD_MS = 200;

function createPrismaClient(): PrismaClient {
  const isDebugQueries = process.env.DEBUG_QUERIES === "true";

  const client = new PrismaClient({
    log: isDebugQueries
      ? [
          { emit: "stdout", level: "query" },
          { emit: "stdout", level: "info" },
          { emit: "stdout", level: "warn" },
          { emit: "stdout", level: "error" },
        ]
      : [
          { emit: "event", level: "query" },
          { emit: "stdout", level: "warn" },
          { emit: "stdout", level: "error" },
        ],
  });

  // Log any query exceeding 200ms to detect database bottlenecks
  if (!isDebugQueries) {
    (client as any).$on("query", (e: { query: string; params: string; duration: number }) => {
      if (e.duration >= SLOW_QUERY_THRESHOLD_MS) {
        console.warn(
          `[Prisma Slow Query] Execution took ${e.duration}ms (Threshold: ${SLOW_QUERY_THRESHOLD_MS}ms):`,
          e.query.slice(0, 300)
        );
      }
    });
  }

  return client;
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

// Ensure single shared connection pool across all imports in dev & production
globalForPrisma.prisma = db;