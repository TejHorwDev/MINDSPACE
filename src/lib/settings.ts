import { db } from "@/lib/db";

export const DEFAULT_DAILY_REQUEST_LIMIT = 15;
export const DEFAULT_RATE_LIMIT_PER_MINUTE = 2;
export const DEFAULT_LOW_BALANCE_THRESHOLD_USD = 4.0;

/**
 * Reads a system setting by key from the database with a fallback default.
 */
export async function getSystemSetting<T extends string>(
  key: string,
  defaultValue: T
): Promise<string> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key },
    });
    return setting?.value ?? defaultValue;
  } catch (error) {
    console.error(`Failed to read system setting "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Sets or updates a system setting by key in the database.
 */
export async function setSystemSetting(key: string, value: string): Promise<void> {
  await db.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/**
 * Retrieves all platform system settings as a key-value record.
 */
export async function getAllSystemSettings(): Promise<Record<string, string>> {
  try {
    const settings = await db.systemSetting.findMany();
    const result: Record<string, string> = {
      daily_request_limit: String(DEFAULT_DAILY_REQUEST_LIMIT),
      rate_limit_per_minute: String(DEFAULT_RATE_LIMIT_PER_MINUTE),
      low_balance_threshold_usd: String(DEFAULT_LOW_BALANCE_THRESHOLD_USD),
    };

    for (const s of settings) {
      result[s.key] = s.value;
    }

    return result;
  } catch (error) {
    console.error("Failed to fetch all system settings:", error);
    return {
      daily_request_limit: String(DEFAULT_DAILY_REQUEST_LIMIT),
      rate_limit_per_minute: String(DEFAULT_RATE_LIMIT_PER_MINUTE),
      low_balance_threshold_usd: String(DEFAULT_LOW_BALANCE_THRESHOLD_USD),
    };
  }
}

/**
 * Returns the maximum number of AI requests a free-tier user can execute per day.
 */
export async function getDailyRequestLimit(): Promise<number> {
  const val = await getSystemSetting("daily_request_limit", String(DEFAULT_DAILY_REQUEST_LIMIT));
  const parsed = parseInt(val, 10);
  return isNaN(parsed) || parsed <= 0 ? DEFAULT_DAILY_REQUEST_LIMIT : parsed;
}

/**
 * Sets the maximum number of AI requests a free-tier user can execute per day.
 */
export async function setDailyRequestLimit(limit: number): Promise<void> {
  const safeLimit = Math.max(1, Math.min(1000, Math.round(limit)));
  await setSystemSetting("daily_request_limit", String(safeLimit));
}

/**
 * Returns the maximum requests per minute rate limit per user.
 */
export async function getRateLimitPerMinute(): Promise<number> {
  const val = await getSystemSetting("rate_limit_per_minute", String(DEFAULT_RATE_LIMIT_PER_MINUTE));
  const parsed = parseInt(val, 10);
  return isNaN(parsed) || parsed <= 0 ? DEFAULT_RATE_LIMIT_PER_MINUTE : parsed;
}

/**
 * Returns the low balance warning threshold in USD.
 * Default is $4.00 (or 20% of the $20 daily allowance).
 */
export async function getLowBalanceThresholdUSD(): Promise<number> {
  const val = await getSystemSetting(
    "low_balance_threshold_usd",
    String(DEFAULT_LOW_BALANCE_THRESHOLD_USD)
  );
  const parsed = parseFloat(val);
  return isNaN(parsed) || parsed < 0 ? DEFAULT_LOW_BALANCE_THRESHOLD_USD : parsed;
}

/**
 * Sets the low balance warning threshold in USD.
 */
export async function setLowBalanceThresholdUSD(threshold: number): Promise<void> {
  const safe = Math.max(0, Math.min(100, Number(threshold.toFixed(2))));
  await setSystemSetting("low_balance_threshold_usd", String(safe));
}
