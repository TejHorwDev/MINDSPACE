import { callAiProvider } from "../src/lib/gemini";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function run() {
  const gemini = await db.aiProvider.findFirst({ where: { provider: "google" } });
  if (!gemini || !gemini.apiKey) {
    console.error("Gemini provider has no key");
    process.exit(1);
  }

  console.log(`Testing real model call with provider: ${gemini.name}, model: gemini-2.5-flash...`);

  const res = await callAiProvider({
    provider: {
      ...gemini,
      modelKey: "gemini-2.5-flash",
    },
    userPrompt: "Change the navbar background to dark obsidian with a subtle border",
    files: [
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html>
<head><title>My Site</title></head>
<body>
  <nav class="bg-white p-4">
    <a href="#">Home</a>
  </nav>
</body>
</html>`,
      },
    ],
  });

  console.log("\n================ REAL AI MODEL RESPONSE ================");
  console.log("Model:", res.model);
  console.log("Reply:", res.reply);
  console.log("Tokens - Input:", res.inputTokens, "Output:", res.outputTokens);
  console.log("Proposed Changes Count:", res.proposedChanges.length);
  if (res.proposedChanges[0]) {
    console.log("File:", res.proposedChanges[0].path);
    console.log("Proposed Content:\n", res.proposedChanges[0].proposedContent);
  }
  console.log("========================================================\n");
}

run().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
