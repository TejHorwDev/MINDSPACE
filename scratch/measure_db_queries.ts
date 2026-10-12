// scratch/measure_db_queries.ts
import { db } from "../src/lib/db";

async function benchmarkQueries() {
  console.log("=== MEASURING DATABASE QUERY PERFORMANCE ===");

  // 1. Project listing by owner (indexed by ownerId and [ownerId, updatedAt])
  const user = await db.user.findFirst();
  if (!user) {
    console.log("No user found in DB");
    return;
  }

  const start1 = performance.now();
  const projects = await db.project.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: {
      _count: {
        select: { files: true },
      },
    },
  });
  const t1 = performance.now() - start1;
  console.log(`Query 1 (User projects with file counts): ${t1.toFixed(2)}ms (found ${projects.length} projects)`);

  // 2. Active plans query (indexed by planId)
  const start2 = performance.now();
  const plans = await db.accountPlan.findMany({
    where: { active: true },
    orderBy: { priceNPR: "asc" },
  });
  const t2 = performance.now() - start2;
  console.log(`Query 2 (Active Account Plans): ${t2.toFixed(2)}ms (found ${plans.length} plans)`);

  // 3. User with Plan and purchase requests
  const start3 = performance.now();
  const fullUser = await db.user.findUnique({
    where: { id: user.id },
    include: {
      accountPlan: true,
      purchaseRequests: {
        take: 5,
        orderBy: { createdAt: "desc" },
      },
    },
  });
  const t3 = performance.now() - start3;
  console.log(`Query 3 (User + Plan + Purchases): ${t3.toFixed(2)}ms`);

  // 4. Published projects catalog (indexed by [isPublished, publishedAt])
  const start4 = performance.now();
  const published = await db.project.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    take: 12,
  });
  const t4 = performance.now() - start4;
  console.log(`Query 4 (Public Projects by publishedAt): ${t4.toFixed(2)}ms (found ${published.length} projects)`);

  // 5. Stress test: 50 sequential queries to check connection pooling & latency
  const start5 = performance.now();
  for (let i = 0; i < 50; i++) {
    await db.user.findUnique({ where: { id: user.id }, select: { id: true, email: true, role: true } });
  }
  const t5 = performance.now() - start5;
  console.log(`Query 5 (50 sequential user lookups): ${t5.toFixed(2)}ms (avg ${(t5 / 50).toFixed(2)}ms/query)`);
}

benchmarkQueries().catch(console.error);
