const fs = require("fs");
const path = require("path");

function copyRecursive(src, dest) {
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

const root = path.resolve(__dirname, "..");
const nextStatic = path.join(root, ".next", "static");
const standaloneNextStatic = path.join(root, ".next", "standalone", ".next", "static");
copyRecursive(nextStatic, standaloneNextStatic);

const pub = path.join(root, "public");
const standalonePub = path.join(root, ".next", "standalone", "public");
copyRecursive(pub, standalonePub);

// Sync native binary modules for sharp so production standalone server never fails DLOPEN
const imgModules = path.join(root, "node_modules", "@img");
const standaloneImgModules = path.join(root, ".next", "standalone", "node_modules", "@img");
copyRecursive(imgModules, standaloneImgModules);

const sharpModule = path.join(root, "node_modules", "sharp");
const standaloneSharpModule = path.join(root, ".next", "standalone", "node_modules", "sharp");
copyRecursive(sharpModule, standaloneSharpModule);

// Sync .env file if present
const envFile = path.join(root, ".env");
const standaloneEnvFile = path.join(root, ".next", "standalone", ".env");
if (fs.existsSync(envFile)) {
  fs.copyFileSync(envFile, standaloneEnvFile);
}

console.log("[MINDSPACE] Standalone static assets, db, and native binary modules synced successfully.");
