// scratch/measure_load_stress.ts
async function loadTest() {
  console.log("=== RUNNING CONCURRENT LOAD STRESS TEST (100 REQUESTS) ===");
  const urls = [
    "http://localhost:3000/",
    "http://localhost:3000/login",
    "http://localhost:3000/templates",
    "http://localhost:3000/developers",
    "http://localhost:3000/credits",
  ];

  const total = 100;
  const timings: number[] = [];
  let successful = 0;
  let failed = 0;

  const startAll = performance.now();

  const promises = Array.from({ length: total }, async (_, i) => {
    const url = urls[i % urls.length];
    const reqStart = performance.now();
    try {
      const res = await fetch(url);
      const reqDuration = performance.now() - reqStart;
      if (res.ok) {
        successful++;
        timings.push(reqDuration);
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  });

  await Promise.all(promises);
  const totalDuration = performance.now() - startAll;

  timings.sort((a, b) => a - b);
  const p50 = timings[Math.floor(timings.length * 0.5)] || 0;
  const p95 = timings[Math.floor(timings.length * 0.95)] || 0;
  const p99 = timings[Math.floor(timings.length * 0.99)] || 0;
  const avg = timings.reduce((sum, v) => sum + v, 0) / (timings.length || 1);

  console.log(`Completed ${total} requests in ${totalDuration.toFixed(1)}ms`);
  console.log(`Success: ${successful}/${total} (${((successful / total) * 100).toFixed(0)}%)`);
  console.log(`Failed:  ${failed}`);
  console.log(`Avg Latency: ${avg.toFixed(1)}ms`);
  console.log(`p50 Latency: ${p50.toFixed(1)}ms`);
  console.log(`p95 Latency: ${p95.toFixed(1)}ms`);
  console.log(`p99 Latency: ${p99.toFixed(1)}ms`);
  console.log(`Throughput:  ${((total / totalDuration) * 1000).toFixed(1)} req/sec`);
}

loadTest().catch(console.error);
