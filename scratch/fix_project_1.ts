import { PrismaClient } from "@prisma/client";
import path from "path";

async function fixDb(dbPath: string) {
  console.log("Fixing DB at:", dbPath);
  const prisma = new PrismaClient({
    datasources: { db: { url: "file:" + dbPath.replace(/\\/g, "/") } },
  });

  const files = await prisma.projectFile.findMany({
    where: { path: "index.html" },
  });

  for (const file of files) {
    console.log(`Checking file ${file.id} (project ${file.projectId}): has avash? ${file.content.includes("avash")}`);
    if (file.content.includes("avash")) {
      // Clean up broken double quotes and clear inner 'ML'
      const fixed = file.content
        .replace(
          /<div style="background-image: url\("avash\.png"\); background-size: cover; background-position: center;" class="avatar">ML<\/div>/g,
          `<div style="background-image: url('avash.png'); background-size: cover; background-position: center;" class="avatar"></div>`
        )
        .replace(/url\("([^"]+)"\)/g, "url('$1')")
        .replace(/(class="avatar">)ML(<\/div>)/g, "$1$2");

      await prisma.projectFile.update({
        where: { id: file.id },
        data: { content: fixed },
      });
      console.log("Successfully fixed index.html for project", file.projectId);
    }
  }

  await prisma.$disconnect();
}

async function main() {
  const p1 = path.resolve("./prisma/db/custom.db");
  const p2 = path.resolve("./.next/standalone/prisma/db/custom.db");

  try {
    await fixDb(p1);
  } catch (e) {
    console.warn("Could not fix p1:", e);
  }

  try {
    await fixDb(p2);
  } catch (e) {
    console.warn("Could not fix p2:", e);
  }
}

main();
