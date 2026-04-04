import { ConvexError } from "convex/values";

function getDeveloperAllowlistEnv() {
  return process.env.DEVELOPER_ALLOWLIST ?? process.env.NEXT_PUBLIC_DEVELOPER_ALLOWLIST;
}

export function parseAllowlist(raw: string | undefined) {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function assertDeveloperGate(ctx: { auth: { getUserIdentity(): Promise<{ email?: string; subject?: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  const email = identity?.email?.toLowerCase();
  const allowlist = parseAllowlist(getDeveloperAllowlistEnv());

  if (!email || !allowlist.has(email)) {
    throw new ConvexError("Developer shortcuts are not enabled");
  }

  return identity;
}
