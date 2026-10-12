import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserCreditBalance } from "@/lib/credits";
import { getUserAccountPlan } from "@/lib/account-plans";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CreditsView } from "@/components/credits/credits-view";

export const metadata: Metadata = {
  title: "AI Credits & Account Plans · MINDSPACE",
  description: "Manage your daily AI credit allowance, Account Plans (Free vs Pro), and one-time top-ups.",
};

export const dynamic = "force-dynamic";

export default async function CreditsPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/credits");
  }

  const userId = session.user.id;

  const [balance, rawTransactions, topUpPlans, channels, currentPlan, allAccountPlans, rawRequests] =
    await Promise.all([
      getUserCreditBalance(userId),
      db.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          amount: true,
          type: true,
          reason: true,
          createdAt: true,
        },
      }),
      db.creditPlan.findMany({
        where: { active: true },
        orderBy: { displayOrder: "asc" },
        select: {
          id: true,
          name: true,
          priceNPR: true,
          creditsGrantedUSD: true,
          active: true,
        },
      }),
      db.contactChannel.findMany({
        where: { active: true },
        orderBy: { displayOrder: "asc" },
        select: {
          id: true,
          name: true,
          iconType: true,
          contactLink: true,
          instructions: true,
          active: true,
        },
      }),
      getUserAccountPlan(userId),
      db.accountPlan.findMany({
        where: { active: true },
        orderBy: { dailyFreeCreditUSD: "asc" },
      }),
      db.purchaseRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          type: true,
          planName: true,
          amountUSD: true,
          priceNPR: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

  const usageTransactions = await db.creditTransaction.findMany({
    where: {
      userId,
      type: "ai_usage",
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      amount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();
  const usageBucketsMap = new Map<string, { date: string; label: string; spendUSD: number; count: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    usageBucketsMap.set(dateKey, { date: dateKey, label, spendUSD: 0, count: 0 });
  }

  for (const tx of usageTransactions) {
    const dateKey = tx.createdAt.toISOString().slice(0, 10);
    const bucket = usageBucketsMap.get(dateKey);
    if (bucket) {
      bucket.spendUSD += Math.abs(tx.amount);
      bucket.count += 1;
    }
  }

  const dailyUsage = Array.from(usageBucketsMap.values()).map((b) => ({
    date: b.date,
    label: b.label,
    spendUSD: Math.round(b.spendUSD * 1000) / 1000,
    count: b.count,
  }));

  const transactions = rawTransactions.map((tx) => ({
    id: tx.id,
    amount: tx.amount,
    type: tx.type,
    reason: tx.reason,
    createdAt: tx.createdAt.toISOString(),
  }));

  const purchaseRequests = rawRequests.map((r) => ({
    id: r.id,
    type: r.type,
    planName: r.planName,
    amountUSD: r.amountUSD,
    priceNPR: r.priceNPR,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <>
      <SiteHeader
        authed
        isAdmin={session.user.role === "admin"}
        name={session.user.name}
        email={session.user.email}
      />

      <main className="w-full flex-1 px-4 sm:px-8 lg:px-12 py-8 sm:py-12">
        <CreditsView
          freeCredits={balance.freeCredits}
          purchasedCredits={balance.purchasedCredits}
          totalCredits={balance.totalCredits}
          creditsResetAt={balance.creditsResetAt.toISOString()}
          currentAccountPlan={currentPlan}
          allAccountPlans={allAccountPlans}
          transactions={transactions}
          dailyUsage={dailyUsage}
          purchaseRequests={purchaseRequests}
          plans={topUpPlans}
          channels={channels}
        />
      </main>

      <SiteFooter />
    </>
  );
}
