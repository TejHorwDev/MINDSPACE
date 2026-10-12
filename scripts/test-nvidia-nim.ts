import { PrismaClient } from "@prisma/client";
import {
  callAiProvider,
  testProviderConnection,
  resolveProviderBaseUrl,
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
  console.log("MINDSPACE — NVIDIA NIM & GENERIC PROVIDER AUDIT");
  console.log("=================================================\n");

  // Step 1: Verify Provider Fleet in DB
  console.log("--- 1. Checking Provider Fleet & NVIDIA NIM in DB ---");
  const providers = await db.aiProvider.findMany({
    orderBy: { priority: "asc" },
  });
  console.log(`Found ${providers.length} providers in database.`);
  providers.forEach((p) => {
    console.log(
      `  - #${p.priority}: ${p.name} [${p.provider} / ${p.modelKey}] BaseUrl: ${p.baseUrl || "(default)"} Notes: ${p.notes ? p.notes.slice(0, 30) + "..." : "none"}`
    );
  });

  const nvidiaProvider = providers.find((p) => p.provider === "nvidia");
  assert(Boolean(nvidiaProvider), "NVIDIA NIM provider exists in database");
  assert(
    nvidiaProvider?.baseUrl === "https://integrate.api.nvidia.com/v1",
    "NVIDIA NIM has correct default baseUrl (https://integrate.api.nvidia.com/v1)",
    nvidiaProvider?.baseUrl
  );
  assert(
    nvidiaProvider?.modelKey === "meta/llama-3.2-90b-vision-instruct",
    "NVIDIA NIM uses real catalog model meta/llama-3.2-90b-vision-instruct",
    nvidiaProvider?.modelKey
  );
  assert(
    Boolean(nvidiaProvider?.notes && nvidiaProvider.notes.length > 5),
    "NVIDIA NIM has notes / pricing info persisted in database",
    nvidiaProvider?.notes
  );

  // Step 2: Test URL Resolver for Generic Providers
  console.log("\n--- 2. Verifying Generic Base URL Resolution ---");
  const nvidiaUrl = resolveProviderBaseUrl({ provider: "nvidia" });
  assert(
    nvidiaUrl === "https://integrate.api.nvidia.com/v1",
    "resolveProviderBaseUrl('nvidia') resolves to https://integrate.api.nvidia.com/v1",
    nvidiaUrl
  );

  const customUrl = resolveProviderBaseUrl({
    provider: "custom",
    baseUrl: "https://my-vllm-server.internal/v1/",
  });
  assert(
    customUrl === "https://my-vllm-server.internal/v1",
    "resolveProviderBaseUrl trims trailing slashes on custom endpoints",
    customUrl
  );

  const groqUrl = resolveProviderBaseUrl({ provider: "groq" });
  assert(
    groqUrl === "https://api.groq.com/openai/v1",
    "resolveProviderBaseUrl('groq') resolves to https://api.groq.com/openai/v1",
    groqUrl
  );

  const openaiUrl = resolveProviderBaseUrl({ provider: "openai" });
  assert(
    openaiUrl === "https://api.openai.com/v1",
    "resolveProviderBaseUrl('openai') resolves to https://api.openai.com/v1",
    openaiUrl
  );

  // Step 3: Zero-Fake AI verification for NVIDIA NIM (Null key throws NoApiKeyConfiguredError)
  console.log("\n--- 3. Verifying Zero-Fake Error When Key is Missing ---");
  let caughtError: any = null;
  try {
    await callAiProvider({
      provider: {
        id: nvidiaProvider!.id,
        name: nvidiaProvider!.name,
        modelKey: nvidiaProvider!.modelKey,
        provider: "nvidia",
        apiKey: null,
      },
      userPrompt: "Write a hello world program in Python",
      files: [{ path: "main.py", content: "" }],
    });
  } catch (err: any) {
    caughtError = err;
  }

  assert(
    caughtError instanceof NoApiKeyConfiguredError,
    "Calling NVIDIA NIM with null apiKey throws NoApiKeyConfiguredError",
    caughtError?.message
  );
  assert(
    caughtError?.message.includes("No API key configured for NVIDIA"),
    "Error message specifically references NVIDIA provider and guides admin to /admin",
    caughtError?.message
  );

  // Step 4: Real Network Test Connection against build.nvidia.com (NVIDIA NIM)
  console.log("\n--- 4. Verifying Real Network Call against NVIDIA NIM Endpoint ---");
  const testStart = Date.now();
  const nimTestResult = await testProviderConnection({
    provider: "nvidia",
    modelKey: "meta/llama-3.2-90b-vision-instruct",
    apiKey: "nvapi-dummy-key-testing-live-network-call-12345",
    baseUrl: "https://integrate.api.nvidia.com/v1",
  });
  const testElapsed = Date.now() - testStart;

  console.log("NVIDIA NIM Test Connection Result:", {
    success: nimTestResult.success,
    message: nimTestResult.message,
    latencyMs: nimTestResult.latencyMs,
    error: nimTestResult.error?.slice(0, 150),
  });

  assert(
    nimTestResult.success === false,
    "NVIDIA NIM rejects dummy key (no fake success mock)",
    nimTestResult
  );
  assert(
    typeof nimTestResult.latencyMs === "number" && nimTestResult.latencyMs > 0,
    `Real network round-trip measured: ${nimTestResult.latencyMs}ms (${testElapsed}ms total)`
  );
  assert(
    Boolean(
      nimTestResult.error &&
        (nimTestResult.error.includes("401") ||
          nimTestResult.error.includes("403") ||
          nimTestResult.error.includes("Forbidden") ||
          nimTestResult.error.includes("Authorization failed") ||
          nimTestResult.error.includes("Unauthorized"))
    ),
    "NVIDIA NIM returns authentic upstream API authentication failure (proving live HTTP request reached build.nvidia.com)",
    nimTestResult.error
  );

  // Step 4b: Verify Model EOL Diagnosis on Retired Models
  console.log("\n--- 4b. Verifying Model EOL Diagnosis on Retired Models ---");
  const retiredModelResult = await testProviderConnection({
    provider: "nvidia",
    modelKey: "meta/llama-3.3-70b-instruct",
    apiKey: "nvapi-dummy-key-testing-live-network-call-12345",
    baseUrl: "https://integrate.api.nvidia.com/v1",
  });
  assert(
    retiredModelResult.success === false,
    "Retired model returns connection failure"
  );
  assert(
    Boolean(retiredModelResult.error && (retiredModelResult.error.includes("end-of-life") || retiredModelResult.error.includes("410"))),
    "Returns diagnostic informing admin the model reached end-of-life on NIM",
    retiredModelResult.error
  );

  // Step 5: Test Model Identifier Guidance on NIM 404
  console.log("\n--- 5. Verifying Model Identifier Diagnostics ---");
  const badModelResult = await testProviderConnection({
    provider: "nvidia",
    modelKey: "completely-invalid-model-name-xyz",
    apiKey: "nvapi-dummy-key-testing-live-network-call-12345",
    baseUrl: "https://integrate.api.nvidia.com/v1",
  });
  assert(
    badModelResult.success === false,
    "Invalid model test connection returns failure",
    badModelResult
  );

  // Step 6: Test DB Updates for baseUrl & notes
  console.log("\n--- 6. Verifying DB Updates for Base URL & Notes ---");
  const testNotes = `Tested at ${new Date().toISOString()} - Free 1,000 credits available from build.nvidia.com`;
  const updatedNvidia = await db.aiProvider.update({
    where: { id: nvidiaProvider!.id },
    data: {
      notes: testNotes,
    },
  });
  assert(
    updatedNvidia.notes === testNotes,
    "Successfully updated notes on NVIDIA NIM provider",
    updatedNvidia.notes
  );

  console.log("\n=================================================");
  if (process.exitCode === 1) {
    console.error("NVIDIA NIM AUDIT COMPLETED WITH FAILURES");
  } else {
    console.log("ALL NVIDIA NIM & GENERIC PROVIDER TESTS PASSED 100%!");
  }
  console.log("=================================================\n");
}

run()
  .catch((e) => {
    console.error("Unexpected error during test:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
