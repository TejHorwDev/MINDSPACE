// scratch/measure_page_timings.ts
async function measureRoute(url: string) {
  const start = performance.now();
  try {
    const res = await fetch(url);
    const duration = performance.now() - start;
    const text = await res.text();
    return {
      status: res.status,
      durationMs: Math.round(duration),
      sizeBytes: text.length,
    };
  } catch (err: any) {
    return { status: "error", durationMs: -1, error: err.message };
  }
}

async function runBenchmark() {
  console.log("=== MEASURING CURRENT PAGE TIMINGS (HTTP TTFB & PAYLOAD) ===");
  const routes = [
    { name: "Landing Page", url: "http://localhost:3000/" },
    { name: "Login Page", url: "http://localhost:3000/login" },
    { name: "Developers Page", url: "http://localhost:3000/developers" },
    { name: "Templates Page", url: "http://localhost:3000/templates" },
    { name: "Credits Page", url: "http://localhost:3000/credits" },
    { name: "Editor Page (Build)", url: "http://localhost:3000/project/cmv2hvgz60001uh00k5veh2hw/build" },
  ];

  for (const route of routes) {
    // Warm up run
    await measureRoute(route.url);
    // Measured run
    const result = await measureRoute(route.url);
    console.log(
      `${route.name.padEnd(25)}: Status ${result.status} | Time: ${result.durationMs}ms | Size: ${((result.sizeBytes ?? 0) / 1024).toFixed(1)} KB`
    );
  }
}

runBenchmark().catch(console.error);
