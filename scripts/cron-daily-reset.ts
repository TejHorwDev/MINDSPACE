import { resetAllUsersDailyCredits } from "../src/lib/credits";

async function main() {
  console.log("Running Daily Free Credit Reset Cron...");
  const result = await resetAllUsersDailyCredits();
  console.log(`Daily reset complete: ${result.resetCount} of ${result.totalUsers} users refreshed to $20.00.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Daily reset cron failed:", err);
  process.exit(1);
});
