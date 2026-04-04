/**
 * Provisions deterministic E2E data for the current auth-backed test users.
 *
 * Usage: npx tsx scripts/seed-e2e.ts
 *
 * Requires: NEXT_PUBLIC_CONVEX_URL plus E2E_SLP_EMAIL and E2E_CAREGIVER_EMAIL
 * to be provided via env vars in .env.local. Both accounts must have already
 * signed up so they exist in the Convex users table.
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

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const slpEmail = process.env.E2E_SLP_EMAIL;
  const caregiverEmail = process.env.E2E_CAREGIVER_EMAIL;

  if (!convexUrl) {
    console.error("❌  NEXT_PUBLIC_CONVEX_URL must be set in .env.local");
    process.exit(1);
  }

  if (!slpEmail || !caregiverEmail) {
    console.error(
      "❌  E2E_SLP_EMAIL and E2E_CAREGIVER_EMAIL must be set in .env.local",
    );
    process.exit(1);
  }

  const slpUser = JSON.parse(
    execSync(
      `npx convex run users:getByEmail '${JSON.stringify({ email: slpEmail })}'`,
      { encoding: "utf-8" },
    ),
  );
  const caregiverUser = JSON.parse(
    execSync(
      `npx convex run users:getByEmail '${JSON.stringify({ email: caregiverEmail })}'`,
      { encoding: "utf-8" },
    ),
  );

  if (!slpUser?._id || !caregiverUser?._id) {
    console.error(
      "❌  Both E2E users must exist before seeding. Sign up the SLP and caregiver test accounts first.",
    );
    process.exit(1);
  }

  console.log("🌱  Seeding E2E test data…");

  run(
    `npx convex run e2e_seed:seedTestCaregiverLink '${JSON.stringify({
      slpUserId: slpUser._id,
      caregiverUserId: caregiverUser._id,
      caregiverEmail,
    })}'`,
  );

  console.log("✅  E2E seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
