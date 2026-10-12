import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserCreditBalance } from "@/lib/credits";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [balance, transactions, plans, channels] = await Promise.all([
    getUserCreditBalance(userId),
    db.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.creditPlan.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
    }),
    db.contactChannel.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  return NextResponse.json({
    balance,
    transactions,
    plans,
    channels,
  });
}
