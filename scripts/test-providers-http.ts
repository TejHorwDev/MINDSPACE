async function test() {
  console.log("Checking /api/ai/providers endpoint...");
  const res = await fetch("http://localhost:3000/api/ai/providers");
  console.log(`Unauthenticated GET /api/ai/providers status: ${res.status} (Expected: 401)`);
  if (res.status === 401) {
    console.log("[PASS] /api/ai/providers requires authentication");
  } else {
    console.log(`[FAIL] Expected 401 but got ${res.status}`);
    process.exit(1);
  }
}

test()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
