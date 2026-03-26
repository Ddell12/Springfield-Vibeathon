import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/** Returns identity.subject or null (for queries that return null on auth failure). */
export async function getAuthUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

/**
 * Verify the caller owns the given session.
 *
 * - Legacy sessions (userId === undefined) are allowed through.
 * - `soft: true` → return null instead of throwing (use in queries).
 * - Default → throw on failure (use in mutations).
 */
export async function assertSessionOwner(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"sessions">,
  opts?: { soft?: boolean },
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    if (opts?.soft) return null;
    throw new Error("Not authenticated");
  }
  const session = await ctx.db.get(sessionId);
  if (!session) {
    if (opts?.soft) return null;
    throw new Error("Session not found");
  }
  // Legacy sessions without userId remain accessible to any authenticated user
  if (session.userId && session.userId !== userId) {
    if (opts?.soft) return null;
    throw new Error("Not authorized");
  }
  return session;
}
