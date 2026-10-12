import { validateSafeMcpUrl, SSRF_GENERIC_ERROR } from "../src/lib/ssrf";
import { fetchMcpServerTools, executeMcpToolCall } from "../src/lib/mcp";

async function runSsrfAudit() {
  console.log("=== MINDSPACE MCP SSRF SECURITY AUDIT ===");

  const blockedTargets = [
    // Localhost & Loopback
    "http://localhost",
    "http://localhost:3000",
    "http://sub.localhost",
    "http://127.0.0.1",
    "http://127.0.0.1:8080/mcp",
    "http://127.0.1.1",
    "http://[::1]",
    "http://[::]",
    "http://0.0.0.0",

    // Cloud Metadata Endpoints (AWS, GCP, Azure, Oracle Cloud)
    "http://169.254.169.254",
    "http://169.254.169.254/latest/meta-data/",
    "http://169.254.1.1",
    "http://instance-data",
    "http://metadata.google.internal",

    // RFC 1918 Private Ranges
    "http://10.0.0.1",
    "http://10.255.255.255",
    "http://172.16.0.1",
    "http://172.31.255.255",
    "http://192.168.0.1",
    "http://192.168.1.1",
    "http://192.168.255.255",

    // IPv6 Private / Link-Local
    "http://[fe80::1]",
    "http://[fc00::1]",
    "http://[fd12:3456::1]",

    // Non-HTTP(S) Schemes
    "file:///etc/passwd",
    "file:///C:/Windows/win.ini",
    "ftp://example.com/file",
    "gopher://127.0.0.1:70",
    "data:text/plain;base64,SGVsbG8=",
    "javascript:alert(1)",

    // DNS Rebinding / Hostname Aliases to 127.0.0.1 & Metadata
    "http://localtest.me",
    "http://127.0.0.1.nip.io",
    "http://169.254.169.254.nip.io",

    // Obfuscated Alternative IP Notations
    "http://0177.0.0.1",
    "http://2130706433",
    "http://0x7f000001",
  ];

  console.log(`\n[Test 1] Testing ${blockedTargets.length} SSRF break-attempt payloads...`);
  let passedCount = 0;

  for (const target of blockedTargets) {
    const result = await validateSafeMcpUrl(target);
    if (result.safe) {
      throw new Error(`❌ CRITICAL SECURITY VULNERABILITY: ${target} was incorrectly ALLOWED!`);
    }
    if (result.error !== SSRF_GENERIC_ERROR) {
      throw new Error(`❌ Error message leaked internal detail for ${target}: "${result.error}"`);
    }
    passedCount++;
  }

  console.log(`✅ PASSED: All ${passedCount} SSRF payloads correctly blocked with generic error: "${SSRF_GENERIC_ERROR}"`);

  // Test 2: Genuine External MCP server URLs
  console.log("\n[Test 2] Testing legitimate external URLs...");
  const legitimateTargets = [
    "https://api.github.com",
    "https://example.com",
    "https://example.com/mcp",
    "http://example.com:8080/mcp",
  ];

  for (const legitimate of legitimateTargets) {
    const result = await validateSafeMcpUrl(legitimate);
    if (!result.safe) {
      throw new Error(`❌ FAILED: Legitimate external URL was blocked: ${legitimate} (Error: ${result.error})`);
    }
    console.log(`✓ Allowed legitimate external endpoint: ${legitimate}`);
  }
  console.log("✅ PASSED: Legitimate external endpoints allowed without disruption.");

  // Test 3: Request-time validation in MCP execution functions
  console.log("\n[Test 3] Verifying request-time SSRF re-validation in mcp.ts...");
  const maliciousServer = {
    id: "malicious-srv-1",
    name: "Malicious Metadata Probe",
    url: "http://169.254.169.254/latest/meta-data/",
    authToken: null,
  };

  const discoveredTools = await fetchMcpServerTools(maliciousServer);
  if (discoveredTools.length > 0) {
    throw new Error("❌ CRITICAL FAILED: fetchMcpServerTools sent outbound request to metadata endpoint!");
  }
  console.log("✓ fetchMcpServerTools refused outbound call to metadata endpoint at request time.");

  const toolExecResult = await executeMcpToolCall(maliciousServer, "probe", {});
  if (toolExecResult.error !== SSRF_GENERIC_ERROR) {
    throw new Error(`❌ FAILED: executeMcpToolCall error did not match generic error: ${toolExecResult.error}`);
  }
  console.log("✓ executeMcpToolCall refused outbound call at request time with generic error.");

  console.log("\n🎉 ALL SSRF VALIDATION & PROTECTION TESTS PASSED 100%!");
}

runSsrfAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
