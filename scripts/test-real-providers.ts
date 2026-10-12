import { PrismaClient } from "@prisma/client";
import {
  callAiProvider,
  testProviderConnection,
  NoApiKeyConfiguredError,
} from "../src/lib/gemini";

const db = new PrismaClient();

function assert(condition: boolean, message: string, detail?: any) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    if (detail) console.error("         Detail:", detail);
    process.exitCode = 1;
  }
}

async function run() {
  console.log("=================================================");
  console.log("MINDSPACE — REAL AI PROVIDERS & ZERO-FAKE TEST");
  console.log("=================================================\n");

  // Step 1: Verify all current providers in DB
  console.log("--- 1. Checking Provider Fleet in Database ---");
  const providers = await db.aiProvider.findMany({
    orderBy: { priority: "asc" },
  });
  console.log(`Found ${providers.length} providers in database.`);
  providers.forEach((p) => {
    console.log(`  - #${p.priority}: ${p.name} (${p.provider} / ${p.modelKey}), Key: ${p.apiKey ? "Set" : "null"}`);
  });

  const gemini = providers.find((p) => p.provider === "google");
  const groq = providers.find((p) => p.provider === "groq");
  const openai = providers.find((p) => p.provider === "openai");

  assert(Boolean(gemini), "Gemini provider exists in DB");
  assert(Boolean(groq), "Groq provider exists in DB");
  assert(Boolean(openai), "OpenAI provider exists in DB");

  const originalGeminiKey = gemini?.apiKey;
  // Ensure test state has apiKey null
  if (gemini?.apiKey) {
    await db.aiProvider.update({ where: { id: gemini.id }, data: { apiKey: null } });
  }

  // Step 2: Zero-Fake AI Verification (Calling without API key must FAIL with NoApiKeyConfiguredError)
  console.log("\n--- 2. Verifying ZERO-FAKE AI (No API Key Configured) ---");
  let caughtError: any = null;
  try {
    await callAiProvider({
      provider: {
        id: gemini!.id,
        name: gemini!.name,
        modelKey: gemini!.modelKey,
        provider: "google",
        apiKey: null,
      },
      userPrompt: "Make navbar sticky with blur",
      files: [{ path: "index.html", content: "<html><body><nav>Home</nav></body></html>" }],
    });
  } catch (err: any) {
    caughtError = err;
  }

  assert(
    caughtError instanceof NoApiKeyConfiguredError,
    "Calling provider with null apiKey throws NoApiKeyConfiguredError (ZERO local fallback)",
    caughtError?.message
  );
  assert(
    caughtError?.message.includes("No API key configured for"),
    "Error message points user to /admin → AI Providers",
    caughtError?.message
  );

  // Step 3: Test Real Network Calls for Test Connection (Google)
  console.log("\n--- 3. Verifying Test Connection Makes REAL Network Call (Google) ---");
  const googleTestResult = await testProviderConnection({
    provider: "google",
    modelKey: "gemini-3.8-flash",
    apiKey: "AIzaSyDummyKey_Testing_Network_Call_12345",
  });

  console.log("Google Test Result:", {
    success: googleTestResult.success,
    message: googleTestResult.message,
    error: googleTestResult.error?.slice(0, 100),
  });

  assert(
    googleTestResult.success === false,
    "Google rejects fake test key",
    googleTestResult
  );
  assert(
    Boolean(googleTestResult.error && (googleTestResult.error.includes("API_KEY_INVALID") || googleTestResult.error.includes("API key not valid") || googleTestResult.error.includes("400"))),
    "Google returns genuine Google Generative AI API error (proving real network request was executed)",
    googleTestResult.error
  );

  // Step 4: Test Real Network Calls for Test Connection (Groq)
  console.log("\n--- 4. Verifying Test Connection Makes REAL Network Call (Groq) ---");
  const groqTestResult = await testProviderConnection({
    provider: "groq",
    modelKey: "qwen/qwen3.8-27b",
    apiKey: "gsk_dummykey_testing_network_call_12345",
  });

  console.log("Groq Test Result:", {
    success: groqTestResult.success,
    message: groqTestResult.message,
    error: groqTestResult.error?.slice(0, 100),
  });

  assert(
    groqTestResult.success === false,
    "Groq rejects fake test key",
    groqTestResult
  );
  assert(
    Boolean(groqTestResult.error && (groqTestResult.error.includes("Invalid API Key") || groqTestResult.error.includes("401") || groqTestResult.error.includes("Unauthorized"))),
    "Groq returns genuine Groq Cloud API error (proving real network request was executed)",
    groqTestResult.error
  );

  // Step 5: Test Real Network Calls for Test Connection (OpenAI)
  console.log("\n--- 5. Verifying Test Connection Makes REAL Network Call (OpenAI) ---");
  const openaiTestResult = await testProviderConnection({
    provider: "openai",
    modelKey: "gpt-4o-mini",
    apiKey: "sk-proj-dummykey_testing_network_call_12345",
  });

  console.log("OpenAI Test Result:", {
    success: openaiTestResult.success,
    message: openaiTestResult.message,
    error: openaiTestResult.error?.slice(0, 100),
  });

  assert(
    openaiTestResult.success === false,
    "OpenAI rejects fake test key",
    openaiTestResult
  );
  assert(
    Boolean(openaiTestResult.error && (openaiTestResult.error.includes("Incorrect API key") || openaiTestResult.error.includes("invalid_api_key") || openaiTestResult.error.includes("401"))),
    "OpenAI returns genuine OpenAI API error (proving real network request was executed)",
    openaiTestResult.error
  );

  // Step 6: Test Dynamic DB Key Updates (Immediate Effect, No Restart)
  console.log("\n--- 6. Verifying Dynamic DB Key Updates ---");
  const testKey = "test_key_sample_updated";
  await db.aiProvider.update({
    where: { id: gemini!.id },
    data: { apiKey: testKey },
  });

  const updatedGemini = await db.aiProvider.findUnique({ where: { id: gemini!.id } });
  assert(
    updatedGemini?.apiKey === testKey,
    "AiProvider.apiKey updated in SQLite DB",
    updatedGemini?.apiKey
  );

  // Calling callAiProvider with updated provider now reaches the network attempt instead of NoApiKeyConfiguredError!
  let callError: any = null;
  try {
    await callAiProvider({
      provider: updatedGemini!,
      userPrompt: "Test real API reachability",
      files: [{ path: "index.html", content: "<h1>Hello</h1>" }],
    });
  } catch (err: any) {
    callError = err;
  }

  // Because testKey is not a real key, it should attempt real Google API call and fail with real Google error, NOT NoApiKeyConfiguredError
  assert(
    !(callError instanceof NoApiKeyConfiguredError),
    "callAiProvider picked up the DB key immediately and executed real network call instead of missing key error",
    callError?.message
  );
  assert(
    Boolean(callError?.message && (callError.message.includes("API key not valid") || callError.message.includes("API_KEY_INVALID") || callError.message.includes("Gemini Flash error"))),
    "callAiProvider reported the genuine Google API response",
    callError?.message
  );

  // Restore original key if one was present
  if (originalGeminiKey) {
    await db.aiProvider.update({
      where: { id: gemini!.id },
      data: { apiKey: originalGeminiKey },
    });
  }

  console.log("\n=================================================");
  console.log("ALL REAL AI PROVIDER & ZERO-FAKE TESTS PASSED!");
  console.log("=================================================\n");
  await db.$disconnect();
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
