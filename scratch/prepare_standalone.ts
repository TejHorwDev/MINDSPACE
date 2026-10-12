import fs from "fs";
import path from "path";

function copyRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log("Syncing static assets to standalone folder...");
const nextStatic = path.join(process.cwd(), ".next", "static");
const standaloneNextStatic = path.join(process.cwd(), ".next", "standalone", ".next", "static");
copyRecursive(nextStatic, standaloneNextStatic);

const pub = path.join(process.cwd(), "public");
const standalonePub = path.join(process.cwd(), ".next", "standalone", "public");
copyRecursive(pub, standalonePub);

console.log("Standalone preparation complete!");
