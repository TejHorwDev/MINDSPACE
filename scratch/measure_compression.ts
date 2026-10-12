// scratch/measure_compression.ts
import http from "http";

function testCompression(url: string) {
  return new Promise((resolve) => {
    const req = http.request(
      url,
      {
        headers: {
          "Accept-Encoding": "gzip, deflate, br",
          "User-Agent": "Mozilla/5.0 PerformanceAudit",
        },
      },
      (res) => {
        let rawBytes = 0;
        res.on("data", (chunk) => {
          rawBytes += chunk.length;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            contentEncoding: res.headers["content-encoding"] || "none",
            contentType: res.headers["content-type"],
            cacheControl: res.headers["cache-control"],
            transferEncoding: res.headers["transfer-encoding"],
            wireBytes: rawBytes,
          });
        });
      }
    );
    req.on("error", (err) => resolve({ error: err.message }));
    req.end();
  });
}

async function main() {
  const routes = [
    "http://localhost:3000/",
    "http://localhost:3000/login",
    "http://localhost:3000/templates",
    "http://localhost:3000/developers",
  ];

  console.log("=== COMPRESSION & ENCODING AUDIT ===");
  for (const r of routes) {
    const res: any = await testCompression(r);
    console.log(`${r.padEnd(35)} -> Encoding: ${res.contentEncoding} | Wire: ${(res.wireBytes / 1024).toFixed(1)} KB`);
  }
}

main();
