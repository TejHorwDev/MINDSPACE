import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserCreditBalance } from "@/lib/credits";
import { getUserAccountPlan } from "@/lib/account-plans";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { UpgradeView } from "@/components/upgrade/upgrade-view";

export const metadata: Metadata = {
  title: "Upgrade Account Plan & Credits · MINDSPACE",
  description: "Upgrade to Pro tier for higher daily AI limits, or buy credit top-up packs that never expire.",
};

export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/upgrade");
  }

  const userId = session.user.id;

  const [
    balance,
    currentPlan,
    allAccountPlans,
    creditPlans,
    contactChannels,
    recentRequests,
  ] = await Promise.all([
    getUserCreditBalance(userId),
    getUserAccountPlan(userId),
    db.accountPlan.findMany({
      where: { active: true },
      orderBy: { dailyFreeCreditUSD: "asc" },
    }),
    db.creditPlan.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
    }),
    db.contactChannel.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
    }),
    db.purchaseRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        targetPlan: { select: { id: true, name: true, dailyFreeCreditUSD: true } },
        creditPlan: { select: { id: true, name: true, creditsGrantedUSD: true, priceNPR: true } },
      },
    }),
  ]);

  const sanitizedRequests = recentRequests.map((r) => ({
    id: r.id,
    type: r.type,
    planName: r.planName,
    amountUSD: r.amountUSD,
    priceNPR: r.priceNPR,
    status: r.status,
    contactHandle: r.contactHandle,
    notes: r.notes,
    rejectionReason: r.rejectionReason,
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
        <UpgradeView
          user={session.user}
          currentPlan={currentPlan}
          allAccountPlans={allAccountPlans}
          creditPlans={creditPlans}
          channels={contactChannels}
          initialRequests={sanitizedRequests}
          balance={balance}
        />
      </main>

      <SiteFooter />
    </>
  );
}
