/**
 * Provisions Clerk E2E test accounts with deterministic seed data.
 *
 * Usage: npx tsx scripts/seed-e2e.ts
 *
 * Requires: NEXT_PUBLIC_CONVEX_URL, and the E2E SLP/caregiver Clerk user IDs
 * to be provided via env vars in .env.local.
 *
 * E2E accounts:
 *   SLP:       e2e+clerk_test+slp@bridges.ai
 *   Caregiver: e2e+clerk_test+caregiver@bridges.ai
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

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

function run(cmd: string) {
  execSync(cmd, { stdio: "inherit" });
}

async function main() {
  loadEnv();

  const slpUserId = process.env.E2E_SLP_USER_ID;
  const caregiverUserId = process.env.E2E_CAREGIVER_USER_ID;
  const caregiverEmail = "e2e+clerk_test+caregiver@bridges.ai";

  if (!slpUserId || !caregiverUserId) {
    console.error(
      "❌  E2E_SLP_USER_ID and E2E_CAREGIVER_USER_ID must be set in .env.local",
    );
    process.exit(1);
  }

  console.log("🌱  Seeding E2E test data…");

  run(
    `npx convex run e2e_seed:seedTestCaregiverLink '${JSON.stringify({
      slpUserId,
      caregiverUserId,
      caregiverEmail,
    })}'`,
  );

  console.log("✅  E2E seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
