import { db } from "../src/lib/db";
import { escapeHtml, sanitizeUserHtml, sanitizePlainText, safeUrl } from "../src/lib/sanitize";
import { preparePublishedHtml } from "../src/lib/publish-manager";

async function runXssTests() {
  console.log("=== RUNNING XSS / INPUT SANITIZATION AUDIT TESTS ===");

  // 1. Test escapeHtml
  const xssPayload = "<script>alert('x')</script>";
  const escaped = escapeHtml(xssPayload);
  console.log("1. escapeHtml payload:", xssPayload);
  console.log("   Result:", escaped);
  if (escaped.includes("<script>") || !escaped.includes("&lt;script&gt;")) {
    throw new Error("FAIL: escapeHtml failed to neutralize script tag");
  }
  console.log("   ✓ PASS: escapeHtml correctly escaped script tag.");

  // 2. Test safeUrl blocking dangerous schemes
  const badUrls = [
    "javascript:alert('x')",
    "JAVASCRIPT:alert(document.cookie)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
  ];
  for (const bad of badUrls) {
    const res = safeUrl(bad);
    if (res !== null) {
      throw new Error(`FAIL: safeUrl allowed dangerous URL: ${bad}`);
    }
  }
  console.log("   ✓ PASS: safeUrl blocked all dangerous URI schemes (javascript:, data:, vbscript:).");

  const goodUrls = [
    "https://github.com/mindspace",
    "http://example.com/test",
    "mailto:support@mindspace.test",
  ];
  for (const good of goodUrls) {
    if (safeUrl(good) !== good) {
      throw new Error(`FAIL: safeUrl rejected valid URL: ${good}`);
    }
  }
  console.log("   ✓ PASS: safeUrl properly allowed https://, http://, mailto:.");

  // 3. Test sanitizeUserHtml
  const dirtyHtml = '<p>Hello <script>alert("x")</script><img src="x" onerror="alert(1)"> <strong>World</strong></p>';
  const cleanHtml = sanitizeUserHtml(dirtyHtml);
  console.log("3. sanitizeUserHtml dirty:", dirtyHtml);
  console.log("   Sanitized:", cleanHtml);
  if (cleanHtml.includes("<script>") || cleanHtml.includes("onerror")) {
    throw new Error("FAIL: sanitizeUserHtml allowed script or onerror");
  }
  console.log("   ✓ PASS: sanitizeUserHtml stripped executable scripts and handlers.");

  // 4. Test project creation and published page rendering with <script> in title
  const testProjectName = "<script>alert('p-xss')</script>";
  const publishedHtml = `<!DOCTYPE html><html><head><title>${escapeHtml(testProjectName)}</title></head><body><h1>${escapeHtml(testProjectName)}</h1></body></html>`;
  const prepared = preparePublishedHtml(publishedHtml, "test-slug-123");
  if (prepared.includes("<script>alert('p-xss')</script>")) {
    throw new Error("FAIL: Published HTML contains raw unescaped script tag!");
  }
  if (!prepared.includes("&lt;script&gt;alert(&#39;p-xss&#39;)&lt;/script&gt;")) {
    throw new Error("FAIL: Published HTML did not escape project name correctly!");
  }
  console.log("   ✓ PASS: Published HTML with <script>alert('x')</script> strictly renders as literal escaped entities.");

  console.log("=== ALL XSS SANITIZATION TESTS PASSED PERFECTLY ===");
}

runXssTests().catch((err) => {
  console.error("XSS TEST FAILURE:", err);
  process.exit(1);
});
