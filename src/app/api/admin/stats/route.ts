import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { status, session } = await getStaffSession();
  if (!session) {
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Staff access required." },
      { status }
    );
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "30d";
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;

  try {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);

    // 1. Total counters
    const [totalUsers, totalProjects, totalPlans, pendingReports] = await Promise.all([
      db.user.count(),
      db.project.count(),
      db.accountPlan.count({ where: { active: true } }),
      db.report.count({ where: { status: "pending" } }),
    ]);

    // Total AI credit spend across all time
    const allAiUsage = await db.creditTransaction.aggregate({
      where: { type: "ai_usage" },
      _sum: { amount: true },
    });
    const totalAiSpendUSD = Math.abs(allAiUsage._sum.amount || 0);

    // 2. Fetch data within range for charts
    const [recentUsers, recentProjects, recentTransactions, recentActivities] =
      await Promise.all([
        db.user.findMany({
          where: { createdAt: { gte: startDate } },
          select: { createdAt: true },
        }),
        db.project.findMany({
          where: { createdAt: { gte: startDate } },
          select: { createdAt: true },
        }),
        db.creditTransaction.findMany({
          where: {
            createdAt: { gte: startDate },
            type: "ai_usage",
          },
          select: { amount: true, createdAt: true, userId: true },
        }),
        db.projectActivity.findMany({
          where: { createdAt: { gte: startDate } },
          select: { createdAt: true, project: { select: { ownerId: true } } },
        }),
      ]);

    // Generate day buckets
    const chartMap = new Map<
      string,
      {
        date: string;
        label: string;
        signups: number;
        projects: number;
        aiSpend: number;
        activeUsersSet: Set<string>;
      }
    >();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      chartMap.set(dateKey, {
        date: dateKey,
        label,
        signups: 0,
        projects: 0,
        aiSpend: 0,
        activeUsersSet: new Set(),
      });
    }

    // Populate signups
    for (const u of recentUsers) {
      const key = u.createdAt.toISOString().slice(0, 10);
      const bucket = chartMap.get(key);
      if (bucket) bucket.signups += 1;
    }

    // Populate projects
    for (const p of recentProjects) {
      const key = p.createdAt.toISOString().slice(0, 10);
      const bucket = chartMap.get(key);
      if (bucket) bucket.projects += 1;
    }

    // Populate AI spend & active users
    for (const t of recentTransactions) {
      const key = t.createdAt.toISOString().slice(0, 10);
      const bucket = chartMap.get(key);
      if (bucket) {
        bucket.aiSpend += Math.abs(t.amount);
        if (t.userId) bucket.activeUsersSet.add(t.userId);
      }
    }

    for (const a of recentActivities) {
      const key = a.createdAt.toISOString().slice(0, 10);
      const bucket = chartMap.get(key);
      if (bucket && a.project?.ownerId) {
        bucket.activeUsersSet.add(a.project.ownerId);
      }
    }

    // Convert map to chart arrays
    const timeSeries = Array.from(chartMap.values()).map((b) => ({
      date: b.date,
      label: b.label,
      signups: b.signups,
      projects: b.projects,
      aiSpend: Math.round(b.aiSpend * 100) / 100,
      activeUsers: b.activeUsersSet.size,
    }));

    // Calculate active users in selected range
    const allActiveInRange = new Set<string>();
    chartMap.forEach((b) => b.activeUsersSet.forEach((u) => allActiveInRange.add(u)));

    // 3. Conversion Visibility: Users who hit $0 vs converted afterward
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const conversionCreditTxs = await db.creditTransaction.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        type: { in: ["ai_usage", "zero_balance_reached", "purchase", "plan_changed", "admin_grant"] },
      },
      select: {
        id: true,
        userId: true,
        type: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const zeroBalanceUsers = await db.user.findMany({
      where: {
        freeCreditsBalance: { lte: 0.001 },
        purchasedCreditsBalance: { lte: 0.001 },
      },
      select: { id: true },
    });
    const currentZeroUserIds = new Set(zeroBalanceUsers.map((u) => u.id));

    const hitZeroTodayMap = new Map<string, Date>();
    const hitZeroWeekMap = new Map<string, Date>();

    for (const tx of conversionCreditTxs) {
      const isToday = tx.createdAt >= todayStart;
      const meta = tx.metadata as any;
      const hitZero =
        tx.type === "zero_balance_reached" ||
        meta?.hitZeroBalance === true ||
        meta?.remainingTotal === 0 ||
        (tx.type === "ai_usage" && currentZeroUserIds.has(tx.userId));

      if (hitZero) {
        if (!hitZeroWeekMap.has(tx.userId)) {
          hitZeroWeekMap.set(tx.userId, tx.createdAt);
        }
        if (isToday && !hitZeroTodayMap.has(tx.userId)) {
          hitZeroTodayMap.set(tx.userId, tx.createdAt);
        }
      }
    }

    let convertedTodayCount = 0;
    let convertedWeekCount = 0;
    const convertedTodayUserIds = new Set<string>();
    const convertedWeekUserIds = new Set<string>();

    for (const tx of conversionCreditTxs) {
      const isConversion = tx.type === "purchase" || tx.type === "plan_changed" || tx.type === "admin_grant";
      if (!isConversion) continue;

      const firstZeroWeek = hitZeroWeekMap.get(tx.userId);
      if (firstZeroWeek && tx.createdAt >= firstZeroWeek && !convertedWeekUserIds.has(tx.userId)) {
        convertedWeekUserIds.add(tx.userId);
        convertedWeekCount++;
      }

      const firstZeroToday = hitZeroTodayMap.get(tx.userId);
      if (firstZeroToday && tx.createdAt >= firstZeroToday && !convertedTodayUserIds.has(tx.userId)) {
        convertedTodayUserIds.add(tx.userId);
        convertedTodayCount++;
      }
    }

    const hitZeroTodayCount = hitZeroTodayMap.size;
    const hitZeroWeekCount = hitZeroWeekMap.size;
    const conversionRateToday = hitZeroTodayCount > 0 ? (convertedTodayCount / hitZeroTodayCount) * 100 : 0;
    const conversionRateWeek = hitZeroWeekCount > 0 ? (convertedWeekCount / hitZeroWeekCount) * 100 : 0;

    return NextResponse.json({
      summary: {
        totalUsers,
        totalProjects,
        totalAiSpendUSD: Math.round(totalAiSpendUSD * 100) / 100,
        activeUsersInRange: allActiveInRange.size,
        pendingReports,
        totalPlans,
      },
      conversion: {
        today: {
          hitZero: hitZeroTodayCount,
          converted: convertedTodayCount,
          ratePercent: Math.round(conversionRateToday * 10) / 10,
        },
        week: {
          hitZero: hitZeroWeekCount,
          converted: convertedWeekCount,
          ratePercent: Math.round(conversionRateWeek * 10) / 10,
        },
      },
      timeSeries,
      days,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to generate overview stats." },
      { status: 500 }
    );
  }
}
