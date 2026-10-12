import { db } from "../src/lib/db";

async function checkIndexes() {
  const indexes: any = await db.$queryRawUnsafe(
    "SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND tbl_name IN ('Project', 'User', 'PurchaseRequest') ORDER BY tbl_name, name"
  );
  console.log("Indexes in Database:");
  for (const idx of indexes) {
    console.log(`  [${idx.tbl_name}] -> ${idx.name}`);
  }
}

checkIndexes().catch(console.error);
