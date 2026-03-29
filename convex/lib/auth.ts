import { ConvexError } from "convex/values";
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
  const session = await ctx.db.get(sessionId);
  if (!session) {
    if (opts?.soft) return null;
    throw new Error("Session not found");
  }

  // Legacy/demo sessions (no owner) are accessible to everyone
  if (!session.userId) {
    return session;
  }

  // Owned sessions require matching auth
  const userId = await getAuthUserId(ctx);
  if (!userId || session.userId !== userId) {
    if (opts?.soft) return null;
    throw new Error(userId ? "Not authorized" : "Not authenticated");
  }

  return session;
}

export type UserRole = "slp" | "caregiver";

export async function getAuthRole(
  ctx: QueryCtx | MutationCtx,
): Promise<UserRole | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  // Role comes from Clerk publicMetadata, included in JWT via template customization
  const metadata = (identity as Record<string, unknown>).public_metadata as
    | { role?: string }
    | undefined;
  return (metadata?.role as UserRole) ?? null;
}

export async function assertSLP(
  ctx: QueryCtx | MutationCtx,
): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");
  const role = await getAuthRole(ctx);
  if (role !== null && role !== "slp") {
    throw new ConvexError("Only SLPs can perform this action");
  }
  // If role is null (no metadata set yet), treat as SLP (default role)
  return userId;
}

export async function assertCaregiverAccess(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<"patients">,
): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");
  const link = await ctx.db
    .query("caregiverLinks")
    .withIndex("by_caregiverUserId", (q) => q.eq("caregiverUserId", userId))
    .filter((q) => q.eq(q.field("patientId"), patientId))
    .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
    .first();
  if (!link) throw new ConvexError("Not authorized to access this patient");
  return userId;
}

export async function assertPatientAccess(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<"patients">,
): Promise<{ userId: string; role: UserRole }> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");
  const patient = await ctx.db.get(patientId);
  if (!patient) throw new ConvexError("Patient not found");
  if (patient.slpUserId === userId) return { userId, role: "slp" };
  const link = await ctx.db
    .query("caregiverLinks")
    .withIndex("by_caregiverUserId_patientId", (q) =>
      q.eq("caregiverUserId", userId).eq("patientId", patientId)
    )
    .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
    .first();
  if (link) return { userId, role: "caregiver" };
  throw new ConvexError("Not authorized");
}
