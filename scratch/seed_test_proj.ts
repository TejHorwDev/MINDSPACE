import { db } from "../src/lib/db";

async function seed() {
  const user = await db.user.findFirst();
  if (!user) {
    console.log("No user found");
    return;
  }
  const project = await db.project.create({
    data: {
      name: "Visual Edit Demo",
      ownerId: user.id,
      files: {
        create: [
          {
            path: "index.html",
            content: `<!DOCTYPE html>
<html>
<head>
  <title>MINDSPACE Demo</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1 class="hero-title">Build with MINDSPACE</h1>
    <p class="hero-desc">Visual inline editing enables instant live changes directly in preview.</p>
    <button class="cta-btn">Get Started</button>
  </div>
</body>
</html>`,
          },
          {
            path: "style.css",
            content: `body { font-family: system-ui, sans-serif; background: #09090b; color: #f4f4f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
.container { text-align: center; padding: 2rem; background: #18181b; border-radius: 12px; border: 1px solid #27272a; max-width: 480px; }
.hero-title { font-size: 1.75rem; color: #a78bfa; margin-bottom: 0.5rem; }
.hero-desc { color: #a1a1aa; font-size: 0.95rem; line-height: 1.5; }
.cta-btn { background: #8b5cf6; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 1rem; }`,
          },
        ],
      },
    },
  });
  console.log("CREATED_PROJECT_ID:", project.id);
}

seed().catch(console.error);
