import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const projects = await db.project.findMany({
    include: { files: true, assets: true },
  });
  console.log("Total projects:", projects.length);
  for (const p of projects) {
    console.log(`\n=== PROJECT: ${p.id} (${p.name}) ===`);
    console.log(`Files count: ${p.files.length}, Assets count: ${p.assets.length}`);
    for (const f of p.files) {
      console.log(`  File: ${f.path} (${f.id}) - size: ${f.content.length}`);
      if (f.path === "index.html") {
        const lines = f.content.split("\n");
        lines.slice(0, 25).forEach((line, idx) => {
          if (line.includes("avatar") || line.includes("img") || line.includes("avash") || idx < 15) {
            console.log(`    L${idx + 1}: ${line}`);
          }
        });
      }
    }
    for (const a of p.assets) {
      console.log(`  Asset: ${a.id} -> ${a.filename} (${a.sizeBytes} bytes, ${a.mimeType})`);
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
