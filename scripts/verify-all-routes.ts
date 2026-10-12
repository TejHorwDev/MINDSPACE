async function verifyRoutes() {
  const baseUrl = "http://localhost:3000";
  console.log("==================================================");
  console.log("   MINDSPACE HTTP Endpoint Verification           ");
  console.log("==================================================");

  const routes = [
    { url: "/", expectedStatus: 200, name: "Landing Page" },
    { url: "/login", expectedStatus: 200, name: "Login Page" },
    { url: "/signup", expectedStatus: 200, name: "Signup Page" },
    { url: "/credits", expectedStatus: 200, name: "Credits Page" },
    { url: "/developers", expectedStatus: 200, name: "Developers Page" },
    { url: "/project/new/templates", expectedStatus: 200, name: "Templates Page" },
    { url: "/settings", expectedStatus: 307, name: "Settings Page (Redirects to Login when unauthenticated)" },
    { url: "/dashboard", expectedStatus: 307, name: "Dashboard Page (Redirects to Login when unauthenticated)" },
    { url: "/api/settings", expectedStatus: 401, name: "Settings API Auth Guard" },
    { url: "/api/ai/providers", expectedStatus: 401, name: "AI Providers Auth Guard" },
  ];

  for (const r of routes) {
    try {
      const res = await fetch(`${baseUrl}${r.url}`, { redirect: "manual" });
      const text = await res.text();
      const isRedirect = res.status === 307 || (r.expectedStatus === 307 && text.includes("__next-page-redirect"));
      const matches = isRedirect || res.status === r.expectedStatus;
      console.log(`[${matches ? "PASS" : "FAIL"}] ${r.name} (${r.url}) -> HTTP ${res.status}${text.includes("__next-page-redirect") ? " (Meta Redirect)" : ""} (expected ${r.expectedStatus})`);
    } catch (err: any) {
      console.error(`[FAIL] ${r.name} (${r.url}) -> Error: ${err.message}`);
    }
  }

  console.log("==================================================");
}

verifyRoutes();
