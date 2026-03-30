/**
 * Creates demo Clerk users (SLP + Caregiver) and seeds all Bridges demo data.
 *
 * Usage:  npx tsx scripts/seed-demo.ts
 *         npx tsx scripts/seed-demo.ts --reset   (wipe + reseed)
 *
 * Requires: CLERK_SECRET_KEY and NEXT_PUBLIC_CONVEX_URL in .env.local
 */

import { execSync } from "child_process";
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
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

async function clerkFetch(secretKey: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Clerk ${method} ${path} → ${res.status}: ${err}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

async function upsertClerkUser(
  secretKey: string,
  user: typeof DEMO.slp | typeof DEMO.caregiver,
): Promise<string> {
  // Search by email
  const res = await fetch(
    `https://api.clerk.com/v1/users?email_address[]=${encodeURIComponent(user.email)}&limit=1`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  const list = (await res.json()) as { data: Array<{ id: string }> };

  if (list.data.length > 0) {
    const userId = list.data[0].id;
    // Ensure password + metadata are current
    await clerkFetch(secretKey, "PATCH", `/users/${userId}`, {
      password: user.password,
      first_name: user.firstName,
      last_name: user.lastName,
      skip_password_checks: true,
    });
    await clerkFetch(secretKey, "PATCH", `/users/${userId}/metadata`, {
      public_metadata: { role: user.role },
    });
    console.log(`  ✓ ${user.role.padEnd(9)} already exists  → ${userId}`);
    return userId;
  }

  // Create
  const created = await clerkFetch(secretKey, "POST", "/users", {
    email_address: [user.email],
    password: user.password,
    first_name: user.firstName,
    last_name: user.lastName,
    public_metadata: { role: user.role },
    skip_password_checks: false,
  });
  const userId = created.id as string;
  console.log(`  ✓ ${user.role.padEnd(9)} created           → ${userId}`);
  return userId;
}

function convexRun(fn: string, args: Record<string, string>, reset: boolean) {
  const payload = JSON.stringify({ ...args, reset });
  try {
    execSync(`npx convex run demo_seed:seedDemoData '${payload}'`, {
      stdio: "inherit",
    });
  } catch {
    // Non-zero exit on "skipped" is not a fatal error
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv();

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error("❌  CLERK_SECRET_KEY missing from .env.local");
    process.exit(1);
  }

  const reset = process.argv.includes("--reset");
  if (reset) console.log("⚠️   --reset: existing demo data will be wiped and reseeded\n");

  console.log("🔑  Setting up demo Clerk accounts...\n");
  const slpUserId = await upsertClerkUser(secretKey, DEMO.slp);
  const caregiverUserId = await upsertClerkUser(secretKey, DEMO.caregiver);

  console.log("\n🌱  Seeding Convex demo data...\n");
  convexRun("demo_seed:seedDemoData", { slpUserId, caregiverUserId, caregiverEmail: DEMO.caregiver.email }, reset);

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
