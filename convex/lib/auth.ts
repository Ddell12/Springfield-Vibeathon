import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

import type { Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";

// Re-export so all existing `import { getAuthUserId } from "./lib/auth"` work
export { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Build a set of all identifiers for the current user — the Convex user ID,
 * the Clerk subject, and the tokenIdentifier. Used for ownership checks on
 * records that may store any of these formats.
 */
export async function getAuthIdentifierSet(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<string[]> {
  const userId = await getAuthUserId(ctx);
  const identity = await ctx.auth.getUserIdentity();
  return Array.from(
    new Set(
      [userId as string | null, identity?.subject, identity?.tokenIdentifier].filter(
        (v): v is string => typeof v === "string" && v.length > 0,
      ),
    ),
  );
}

/**
 * Verify the caller owns the given session.
 *
 * - Legacy sessions (userId === undefined) are rejected.
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

  // Legacy sessions without a userId are not accessible.
  if (!session.userId) {
    if (opts?.soft) return null;
    throw new Error("Session has no owner — legacy session access denied");
  }

  const authIds = await getAuthIdentifierSet(ctx);
  if (authIds.length === 0 || !authIds.includes(session.userId)) {
    if (opts?.soft) return null;
    throw new Error(authIds.length > 0 ? "Not authorized" : "Not authenticated");
  }

  return session;
}

export type UserRole = "slp" | "caregiver";

export async function getAuthRole(
  ctx: QueryCtx | MutationCtx,
): Promise<UserRole | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const user = await ctx.db.get(userId);
  return ((user as { role?: string } | null)?.role as UserRole) ?? null;
}

/**
 * Assert the caller has SLP privileges.
 * Design: null role (no role set) defaults to SLP because new
 * sign-ups start as SLPs. Caregivers get role set via acceptInvite →
 * users.setCaregiverRole. Patient ownership checks in every
 * SLP-only mutation provide a secondary gate.
 */
export async function assertSLP(
  ctx: QueryCtx | MutationCtx,
): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");
  const role = await getAuthRole(ctx);
  if (role !== null && role !== "slp") {
    throw new ConvexError("Only SLPs can perform this action");
  }
  return userId;
}

export async function assertCaregiverAccess(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<"patients">,
): Promise<string> {
  const authIds = await getAuthIdentifierSet(ctx);
  if (authIds.length === 0) throw new ConvexError("Not authenticated");

  for (const authId of authIds) {
    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId_patientId", (q) =>
        q.eq("caregiverUserId", authId).eq("patientId", patientId)
      )
      .first();
    if (link?.inviteStatus === "accepted") {
      return link.caregiverUserId ?? authId;
    }
  }

  throw new ConvexError("Not authorized to access this patient");
}

export async function assertPatientAccess(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<"patients">,
): Promise<{ userId: string; role: UserRole }> {
  const authIds = await getAuthIdentifierSet(ctx);
  if (authIds.length === 0) throw new ConvexError("Not authenticated");
  const patient = await ctx.db.get(patientId);
  if (!patient) throw new ConvexError("Patient not found");

  if (authIds.includes(patient.slpUserId)) {
    return { userId: patient.slpUserId, role: "slp" };
  }

  for (const authId of authIds) {
    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId_patientId", (q) =>
        q.eq("caregiverUserId", authId).eq("patientId", patientId)
      )
      .first();
    if (link?.inviteStatus === "accepted") {
      return { userId: link.caregiverUserId ?? authId, role: "caregiver" };
    }
  }

  throw new ConvexError("Not authorized");
}
