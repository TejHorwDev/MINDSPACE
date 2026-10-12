import { formatGreeting } from "../src/components/dashboard/dashboard-view";

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    console.error(`FAIL [${label}]: expected "${expected}", got "${actual}"`);
    process.exit(1);
  }
  console.log(`PASS [${label}]: "${actual}"`);
}

console.log("=== VERIFYING FORMAT GREETING LOGIC ===");

// 1. Raw system admin username in caps
assertEqual(formatGreeting("ADMIN"), "Welcome to your Studio", "ADMIN uppercase raw username");
assertEqual(formatGreeting("admin"), "Welcome to your Studio", "admin lowercase raw username");
assertEqual(formatGreeting("Administrator"), "Welcome to your Studio", "Administrator role");
assertEqual(formatGreeting("student"), "Welcome to your Studio", "student role");
assertEqual(formatGreeting("developer"), "Welcome to your Studio", "developer role");

// 2. Normal user display name
assertEqual(formatGreeting("Tej"), "Welcome back, Tej", "Normal display name Tej");
assertEqual(formatGreeting("Tej Kumar"), "Welcome back, Tej", "Full name Tej Kumar");

// 3. All-caps real name
assertEqual(formatGreeting("TEJ"), "Welcome back, Tej", "All-caps real name TEJ title-cased");

// 4. Missing name falls back cleanly (no raw/internal field)
assertEqual(formatGreeting(null), "Welcome to your Studio", "Null name falls back to Studio welcome");
assertEqual(formatGreeting(""), "Welcome to your Studio", "Empty name falls back to Studio welcome");

console.log("=== ALL GREETING TESTS PASSED 100% ===");
