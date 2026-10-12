// scratch/analyze_build_bundles.ts
import fs from "fs";
import path from "path";

function getDirSize(dirPath: string): { totalBytes: number; files: { file: string; sizeKB: number }[] } {
  let totalBytes = 0;
  const files: { file: string; sizeKB: number }[] = [];

  function walk(current: string) {
    if (!fs.existsSync(current)) return;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const stats = fs.statSync(fullPath);
        totalBytes += stats.size;
        files.push({
          file: path.relative(dirPath, fullPath).replace(/\\/g, "/"),
          sizeKB: Math.round((stats.size / 1024) * 10) / 10,
        });
      }
    }
  }

  walk(dirPath);
  return { totalBytes, files };
}

const staticDir = path.join(process.cwd(), ".next", "static");
const chunksDir = path.join(staticDir, "chunks");

console.log("=== NEXT.JS PRODUCTION JS CHUNK SIZE AUDIT ===");
if (fs.existsSync(chunksDir)) {
  const { totalBytes, files } = getDirSize(chunksDir);
  console.log(`Total Chunks Size: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
  
  // Sort descending by size
  files.sort((a, b) => b.sizeKB - a.sizeKB);
  console.log("\nTop 15 Largest JS Chunks in Build:");
  files.slice(0, 15).forEach((f, idx) => {
    console.log(`  ${(idx + 1).toString().padStart(2)}. ${f.file.padEnd(50)}: ${f.sizeKB} KB`);
  });
} else {
  console.log("No chunks directory found");
}
