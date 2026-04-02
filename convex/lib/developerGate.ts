import { ConvexError } from "convex/values";

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
  const allowlist = parseAllowlist(process.env.DEVELOPER_ALLOWLIST);

  if (!email || !allowlist.has(email)) {
    throw new ConvexError("Developer shortcuts are not enabled");
  }

  return identity;
}
