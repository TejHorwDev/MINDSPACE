import { db } from "@/lib/db";

/**
 * Visual & Dynamic Pricing Model:
 * Free-tier users receive a generous visual allowance of $20.00 per day.
 * Each AI call has a calibrated cost (base $0.60 + dynamic token rates),
 * allowing ~15-20 normal prompts (or 4-5 heavy prompts) per day.
 *
 * Paid-tier users:
 * When a user buys a plan, they receive purchased credits.
 * Paid plans NEVER receive daily free credits until all purchased credits are completely exhausted (<= 0).
 * Once their purchased credits hit 0, their account reverts to the free tier and receives daily resets.
 */
export const DAILY_FREE_CREDITS = 20.0;

// Dynamic pricing parameters
export const AI_BASE_FEE_USD = 0.60;
export const AI_INPUT_RATE_PER_TOKEN = 0.00030;
export const AI_OUTPUT_RATE_PER_TOKEN = 0.00075;
export const AI_MIN_COST_USD = 0.75;

// Backwards-compatible aliases
export const GEMINI_INPUT_PRICE_PER_TOKEN = AI_INPUT_RATE_PER_TOKEN;
export const GEMINI_OUTPUT_PRICE_PER_TOKEN = AI_OUTPUT_RATE_PER_TOKEN;

export class InsufficientCreditsError extends Error {
  constructor(message = "You have run out of AI credits for today.") {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

/**
 * Calculates cost in USD based on input & output token counts.
 * Uses a base fee + token rate to provide rapid, realistic drain
 * against the $20.00 daily allowance.
 */
export function calculateAiCostUSD(inputTokens: number, outputTokens: number): number {
  const variableCost = inputTokens * AI_INPUT_RATE_PER_TOKEN + outputTokens * AI_OUTPUT_RATE_PER_TOKEN;
  const rawCost = AI_BASE_FEE_USD + variableCost;
  const total = Math.max(AI_MIN_COST_USD, rawCost);
  // Round to 4 decimal places
  return Math.round(total * 10000) / 10000;
}

/**
 * Checks if a date is from a previous calendar day (UTC).
 */
export function isPreviousDay(date: Date): boolean {
  const now = new Date();
  const d = new Date(date);
  return (
    now.getUTCFullYear() > d.getUTCFullYear() ||
    now.getUTCMonth() > d.getUTCMonth() ||
    now.getUTCDate() > d.getUTCDate()
  );
}

/**
 * Ensures a user's daily free credits are reset if today is a new calendar day.
 * Uses the user's CURRENT Account Plan's dailyFreeCreditUSD (e.g. Free vs Pro tier).
 * CRITICAL RULE:
 * Paid users with purchasedCreditsBalance > 0 rely on their purchased credits.
 * Once all paid credits are exhausted (<= 0), users receive their tier's daily credit allowance.
 */
export async function ensureDailyCredits(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      freeCreditsBalance: true,
      purchasedCreditsBalance: true,
      creditsResetAt: true,
      accountPlan: {
        select: {
          id: true,
          name: true,
          dailyFreeCreditUSD: true,
        },
      },
    },
  });

  if (!user) return null;

  const dailyAllowance = user.accountPlan?.dailyFreeCreditUSD ?? DAILY_FREE_CREDITS;

  // Reset daily if it's a new UTC day or negative
  if (isPreviousDay(user.creditsResetAt) || user.freeCreditsBalance < 0) {
    const previousFree = user.freeCreditsBalance;

    return await db.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          freeCreditsBalance: dailyAllowance,
          creditsResetAt: new Date(),
        },
        include: {
          accountPlan: {
            select: {
              id: true,
              name: true,
              dailyFreeCreditUSD: true,
            },
          },
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          amount: dailyAllowance,
          type: "daily_reset",
          reason: `Daily free AI credit refresh ($${dailyAllowance.toFixed(2)} - ${user.accountPlan?.name ?? "Default"} Plan)`,
          metadata: {
            previousFreeBalance: previousFree,
            planName: user.accountPlan?.name ?? "Default",
            dailyAllowance,
          },
        },
      });

      return updated;
    });
  }

  return user;
}

/**
 * Returns the current live credit balances for a user.
 * Combines their account plan daily free credit allowance + purchased top-ups.
 */
export async function getUserCreditBalance(userId: string) {
  const user = await ensureDailyCredits(userId);
  if (!user) {
    return {
      freeCredits: 0,
      purchasedCredits: 0,
      totalCredits: 0,
      isPaidUser: false,
      creditsResetAt: new Date(),
    };
  }

  const purchased = Math.max(0, user.purchasedCreditsBalance);
  const free = Math.max(0, user.freeCreditsBalance);
  const isPaidUser = purchased > 0 || (Boolean(user.accountPlan) && user.accountPlan?.name !== "Free");
  const total = purchased + free;

  return {
    freeCredits: free,
    purchasedCredits: purchased,
    totalCredits: Math.round(total * 10000) / 10000,
    isPaidUser,
    creditsResetAt: user.creditsResetAt,
  };
}

export interface CreditReservation {
  reservationId: string;
  userId: string;
  isPaidUser: boolean;
  reservedAmount: number;
}

/**
 * Atomically reserves AI credits before invoking the LLM.
 * Spends from the user's daily free tier allowance first, then falls back to purchased credits.
 * Uses an atomic conditional decrement at the database level:
 *   UPDATE "User" SET balance = balance - amount WHERE id = userId AND balance >= amount
 */
export async function reserveAiCredits(
  userId: string,
  amountUSD: number = AI_MIN_COST_USD
): Promise<CreditReservation> {
  const user = await ensureDailyCredits(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  const reserveAmount = Math.max(0.01, Math.round(amountUSD * 10000) / 10000);

  // Spend free credits first (from their daily tier allowance)
  if (user.freeCreditsBalance >= reserveAmount) {
    const rowsAffected = await db.$executeRaw`
      UPDATE "User"
      SET "freeCreditsBalance" = "freeCreditsBalance" - ${reserveAmount}
      WHERE "id" = ${userId} AND "freeCreditsBalance" >= ${reserveAmount}
    `;

    if (rowsAffected > 0) {
      return {
        reservationId: `res_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId,
        isPaidUser: false,
        reservedAmount: reserveAmount,
      };
    }
  }

  // If free credits aren't enough, try purchased credits (from top-up plans)
  if (user.purchasedCreditsBalance >= reserveAmount) {
    const rowsAffected = await db.$executeRaw`
      UPDATE "User"
      SET "purchasedCreditsBalance" = "purchasedCreditsBalance" - ${reserveAmount}
      WHERE "id" = ${userId} AND "purchasedCreditsBalance" >= ${reserveAmount}
    `;

    if (rowsAffected > 0) {
      return {
        reservationId: `res_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId,
        isPaidUser: true,
        reservedAmount: reserveAmount,
      };
    }
  }

  throw new InsufficientCreditsError(
    "You have run out of AI credits for today. Upgrade your Account Plan or top up credits to continue!"
  );
}

/**
 * Settles an atomic AI credit reservation after the LLM responds.
 * Adjusts the difference between actual token cost and reserved amount,
 * and records the audit transaction.
 */
export async function settleAiCreditReservation(
  reservation: CreditReservation,
  inputTokens: number,
  outputTokens: number,
  detail = "AI Help",
  providerMeta?: { providerId?: string; providerName?: string }
) {
  const actualCostUSD = calculateAiCostUSD(inputTokens, outputTokens);
  const diff = Math.round((actualCostUSD - reservation.reservedAmount) * 10000) / 10000;
  const userId = reservation.userId;
  const isPaid = reservation.isPaidUser;

  if (diff > 0) {
    // Actual cost was higher than reserved: deduct the difference atomically
    if (isPaid) {
      await db.$executeRaw`
        UPDATE "User"
        SET "purchasedCreditsBalance" = CASE
          WHEN "purchasedCreditsBalance" - ${diff} < 0 THEN 0.0
          ELSE "purchasedCreditsBalance" - ${diff}
        END
        WHERE "id" = ${userId}
      `;
    } else {
      await db.$executeRaw`
        UPDATE "User"
        SET "freeCreditsBalance" = CASE
          WHEN "freeCreditsBalance" - ${diff} < 0 THEN 0.0
          ELSE "freeCreditsBalance" - ${diff}
        END
        WHERE "id" = ${userId}
      `;
    }
  } else if (diff < 0) {
    // Actual cost was less than reserved: refund the over-reserved amount atomically
    const refundDiff = Math.abs(diff);
    if (isPaid) {
      await db.$executeRaw`
        UPDATE "User"
        SET "purchasedCreditsBalance" = "purchasedCreditsBalance" + ${refundDiff}
        WHERE "id" = ${userId}
      `;
    } else {
      await db.$executeRaw`
        UPDATE "User"
        SET "freeCreditsBalance" = "freeCreditsBalance" + ${refundDiff}
        WHERE "id" = ${userId}
      `;
    }
  }

  // Read latest final balance
  const updatedUser = await db.user.findUnique({
    where: { id: userId },
    select: { purchasedCreditsBalance: true, freeCreditsBalance: true },
  });

  const finalBalance = isPaid
    ? Math.max(0, updatedUser?.purchasedCreditsBalance || 0)
    : Math.max(0, updatedUser?.freeCreditsBalance || 0);

  const providerLabel = providerMeta?.providerName ? ` via ${providerMeta.providerName}` : "";
  const transaction = await db.creditTransaction.create({
    data: {
      userId,
      amount: -actualCostUSD,
      type: "ai_usage",
      reason: `${detail}${providerLabel} (${inputTokens.toLocaleString()} in, ${outputTokens.toLocaleString()} out) [${isPaid ? "Paid Plan" : "Free Tier"}]`,
      metadata: {
        planType: isPaid ? "paid" : "free",
        inputTokens,
        outputTokens,
        costUSD: actualCostUSD,
        reservedUSD: reservation.reservedAmount,
        remainingTotal: Math.round(finalBalance * 10000) / 10000,
        hitZeroBalance: finalBalance <= 0.0001,
        providerId: providerMeta?.providerId || null,
        providerName: providerMeta?.providerName || null,
      },
    },
  });

  return {
    success: true,
    costUSD: actualCostUSD,
    remainingBalance: Math.round(finalBalance * 10000) / 10000,
    freeBalance: isPaid ? 0 : Math.round(finalBalance * 10000) / 10000,
    purchasedBalance: isPaid ? Math.round(finalBalance * 10000) / 10000 : 0,
    isPaidUser: isPaid,
    transactionId: transaction.id,
  };
}

/**
 * Refunds an AI credit reservation if the LLM request errors out or is cancelled.
 */
export async function refundAiCreditReservation(reservation: CreditReservation) {
  const userId = reservation.userId;
  const isPaid = reservation.isPaidUser;
  const amount = reservation.reservedAmount;

  if (amount <= 0) return;

  if (isPaid) {
    await db.$executeRaw`
      UPDATE "User"
      SET "purchasedCreditsBalance" = "purchasedCreditsBalance" + ${amount}
      WHERE "id" = ${userId}
    `;
  } else {
    await db.$executeRaw`
      UPDATE "User"
      SET "freeCreditsBalance" = "freeCreditsBalance" + ${amount}
      WHERE "id" = ${userId}
    `;
  }
}

/**
 * Deducts AI usage cost atomically. Backward compatible convenience function.
 */
export async function deductAiCredits(
  userId: string,
  inputTokens: number,
  outputTokens: number,
  detail = "AI Help",
  providerMeta?: { providerId?: string; providerName?: string }
) {
  const cost = calculateAiCostUSD(inputTokens, outputTokens);
  const reservation = await reserveAiCredits(userId, cost);
  return settleAiCreditReservation(reservation, inputTokens, outputTokens, detail, providerMeta);
}

/**
 * Allows an admin to grant credits to any user (e.g. after purchasing a plan).
 * Logged with admin id and plan/reason.
 * RULE: When a user buys a plan, it only gives them credits.
 * The daily free credit is NOT added to paid plans.
 */
export async function grantCreditsToUser(
  adminId: string,
  targetUserId: string,
  amountUSD: number,
  reason: string,
  planId?: string
) {
  if (amountUSD <= 0) {
    throw new Error("Credit amount must be greater than $0.");
  }

  return await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, purchasedCreditsBalance: true, email: true },
    });

    if (!user) {
      throw new Error("Target user not found.");
    }

    // Set purchased balance and clear free balance so paid plans only use purchased credits
    const updatedUser = await tx.user.update({
      where: { id: targetUserId },
      data: {
        purchasedCreditsBalance: {
          increment: amountUSD,
        },
        freeCreditsBalance: 0,
      },
    });

    const txRecord = await tx.creditTransaction.create({
      data: {
        userId: targetUserId,
        amount: amountUSD,
        type: "admin_grant",
        reason,
        metadata: {
          grantedByAdminId: adminId,
          planId: planId || null,
          planType: "paid",
        },
      },
    });

    return { user: updatedUser, transaction: txRecord };
  });
}

/**
 * Resets users' daily free credit balance based on their Account Plan.
 * Used by the daily cron job.
 * CRITICAL RULE: Paid users (purchasedCreditsBalance > 0) rely on purchased credits.
 */
export async function resetAllUsersDailyCredits() {
  const users = await db.user.findMany({
    select: {
      id: true,
      freeCreditsBalance: true,
      purchasedCreditsBalance: true,
      creditsResetAt: true,
      accountPlan: {
        select: {
          id: true,
          name: true,
          dailyFreeCreditUSD: true,
        },
      },
    },
  });

  let resetCount = 0;
  for (const user of users) {
    const dailyAllowance = user.accountPlan?.dailyFreeCreditUSD ?? DAILY_FREE_CREDITS;
    if (isPreviousDay(user.creditsResetAt) || user.freeCreditsBalance < dailyAllowance) {
      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            freeCreditsBalance: dailyAllowance,
            creditsResetAt: new Date(),
          },
        });

        await tx.creditTransaction.create({
          data: {
            userId: user.id,
            amount: dailyAllowance,
            type: "daily_reset",
            reason: `Daily free AI credit refresh ($${dailyAllowance.toFixed(2)} - ${user.accountPlan?.name ?? "Default"} Plan)`,
            metadata: {
              planName: user.accountPlan?.name ?? "Default",
              dailyAllowance,
            },
          },
        });
      });
      resetCount++;
    }
  }

  return { resetCount, totalUsers: users.length };
}
