/**
 * Creates demo accounts via @convex-dev/auth and seeds all Bridges demo data.
 *
 * Usage:  npx tsx scripts/seed-demo.ts
 *         npx tsx scripts/seed-demo.ts --reset   (wipe + reseed)
 *
 * Requires: NEXT_PUBLIC_CONVEX_URL in .env.local
 */

import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// ─── Demo credentials (share these with anyone testing the app) ───────────────

export const DEMO = {
  slp: {
    email: "slp@bridges.ai",
    password: "BridgesDemo2026!",
    firstName: "Dr. Sarah",
    lastName: "Mitchell",
    role: "slp" as const,
  },
  caregiver: {
    email: "parent@bridges.ai",
    password: "BridgesDemo2026!",
    firstName: "Jamie",
    lastName: "Rivera",
    role: "caregiver" as const,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌  .env.local not found");
    process.exit(1);
  }
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const raw = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    // Strip inline comments (e.g. "value # comment")
    const val = raw.replace(/\s+#.*$/, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

function signUpAccount(email: string, password: string, name: string) {
  // @convex-dev/auth password auth is a Convex action, not an HTTP endpoint
  const result = spawnSync(
    "npx",
    ["convex", "run", "auth:signIn", JSON.stringify({ provider: "password", params: { email, password, flow: "signUp", name } })],
    { encoding: "utf-8" },
  );
  if (result.status !== 0) {
    const stderr = result.stderr ?? "";
    if (/already.?exists|duplicate|account.*exists/i.test(stderr)) {
      console.log(`  Sign-up for ${email}: already exists (skipped)`);
      return;
    }
    throw new Error(`Sign-up for ${email} failed: ${stderr}`);
  }
  console.log(`  Sign-up for ${email}: created`);
}

function convexRunJson(fn: string, args: Record<string, unknown>): Record<string, unknown> | null {
  const result = spawnSync("npx", ["convex", "run", fn, JSON.stringify(args)], {
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    console.error(`convexRunJson(${fn}) failed:`, result.stderr || result.error);
    return null;
  }
  try {
    return JSON.parse(result.stdout) as Record<string, unknown>;
  } catch {
    console.error(`convexRunJson(${fn}): could not parse output:`, result.stdout);
    return null;
  }
}

function convexRun(fn: string, args: Record<string, unknown>) {
  const result = spawnSync("npx", ["convex", "run", fn, JSON.stringify(args)], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.warn(`convexRun(${fn}) exited non-zero:`, result.error?.message ?? result.status);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv();

  const reset = process.argv.includes("--reset");
  if (reset) console.log("⚠️   --reset: existing demo data will be wiped and reseeded\n");

  console.log("🔑  Setting up demo accounts...\n");
  signUpAccount(DEMO.slp.email, DEMO.slp.password, `${DEMO.slp.firstName} ${DEMO.slp.lastName}`);
  signUpAccount(DEMO.caregiver.email, DEMO.caregiver.password, `${DEMO.caregiver.firstName} ${DEMO.caregiver.lastName}`);

  console.log("\n🔍  Looking up Convex user IDs...\n");
  const slpUser = convexRunJson("users:getByEmail", { email: DEMO.slp.email });
  const cgUser = convexRunJson("users:getByEmail", { email: DEMO.caregiver.email });

  if (!slpUser?._id || !cgUser?._id) {
    throw new Error("Could not find created users in Convex — check that sign-up succeeded");
  }

  console.log(`  ✓ SLP user: ${slpUser._id as string}`);
  console.log(`  ✓ Caregiver user: ${cgUser._id as string}`);

  console.log("\n👤  Setting caregiver role...\n");
  convexRun("users:setUserRole", { userId: cgUser._id as string, role: "caregiver" });

  console.log("\n🌱  Seeding Convex demo data...\n");
  convexRun("demo_seed:seedDemoData", {
    slpUserId: slpUser._id as string,
    caregiverUserId: cgUser._id as string,
    caregiverEmail: DEMO.caregiver.email,
    reset,
  });

  console.log(`
✅  Demo environment ready!

  ┌─────────────────────────────────────────────┐
  │  👩‍⚕️  SLP (Speech-Language Pathologist)      │
  │     Email:    ${DEMO.slp.email.padEnd(29)} │
  │     Password: ${DEMO.slp.password.padEnd(29)} │
  │     URL:      /dashboard                     │
  ├─────────────────────────────────────────────┤
  │  👨‍👦  Caregiver (Parent)                       │
  │     Email:    ${DEMO.caregiver.email.padEnd(29)} │
  │     Password: ${DEMO.caregiver.password.padEnd(29)} │
  │     URL:      /family                        │
  └─────────────────────────────────────────────┘

  Kid Mode PIN: 1234
`);
}

main().catch((err) => {
  console.error("❌  Seed failed:", err.message ?? err);
  process.exit(1);
});
