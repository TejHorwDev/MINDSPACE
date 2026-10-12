import { PrismaClient } from "@prisma/client";
import path from "path";
import { bundleProjectFiles } from "../src/lib/preview-bundler";

async function main() {
  const standaloneDbUrl = "file:" + path.resolve("./.next/standalone/prisma/db/custom.db").replace(/\\/g, "/");
  const prismaStandalone = new PrismaClient({
    datasources: { db: { url: standaloneDbUrl } },
  });

  const project = await prismaStandalone.project.findFirst({
    where: { name: "1" },
    include: { files: true, assets: true },
  });

  if (!project) {
    console.error("Project 1 not found!");
    return;
  }

  console.log("Found project:", project.name, project.id);
  const indexFile = project.files.find((f) => f.path === "index.html");
  console.log("Raw index.html content:\n------------------\n" + indexFile?.content + "\n------------------");

  const fileContents = Object.fromEntries(project.files.map((f) => [f.id, f.content]));
  const bundled = bundleProjectFiles("index.html", project.files as any, fileContents, { isEditorPreview: true });

  console.log("\nBundled HTML check:");
  console.log("Contains avash.png?", bundled.includes("avash.png"));
  console.log("Contains data:image/png;base64?", bundled.includes("data:image/png;base64"));

  // Check lines around avatar
  const lines = bundled.split("\n");
  const avatarLine = lines.find((l) => l.includes('class="avatar"') || l.includes("class='avatar'"));
  console.log("Avatar div line in bundled HTML:\n", avatarLine);

  await prismaStandalone.$disconnect();
}

main().catch(console.error);
