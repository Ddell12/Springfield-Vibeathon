import { ConvexError } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

function getAuthIdentifiers(
  identity: { subject?: string | null; tokenIdentifier?: string | null } | null,
): string[] {
  return Array.from(
    new Set(
      [identity?.subject, identity?.tokenIdentifier].filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      ),
    ),
  );
}

async function getCurrentAuthIdentifiers(
  ctx: QueryCtx | MutationCtx,
): Promise<string[]> {
  const identity = await ctx.auth.getUserIdentity();
  return getAuthIdentifiers(identity);
}

/** Returns the preferred auth user id or null (for queries that return null on auth failure). */
export async function getAuthUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? identity?.tokenIdentifier ?? null;
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

  const authIdentifiers = await getCurrentAuthIdentifiers(ctx);
  if (authIdentifiers.length === 0 || !authIdentifiers.includes(session.userId)) {
    if (opts?.soft) return null;
    throw new Error(authIdentifiers.length > 0 ? "Not authorized" : "Not authenticated");
  }

  return session;
}

export type UserRole = "slp" | "caregiver";

export async function getAuthRole(
  ctx: QueryCtx | MutationCtx,
): Promise<UserRole | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  // Role comes from Clerk publicMetadata, included in JWT via template customization.
  // convex-test surfaces public_metadata as a JSON string; production Clerk JWTs
  // surface it as an already-parsed object. Handle both forms.
  const raw = (identity as Record<string, unknown>).public_metadata;
  let metadata: { role?: string } | undefined;
  if (typeof raw === "string") {
    try {
      metadata = JSON.parse(raw) as { role?: string };
    } catch {
      metadata = undefined;
    }
  } else {
    metadata = raw as { role?: string } | undefined;
  }
  return (metadata?.role as UserRole) ?? null;
}

/**
 * Assert the caller has SLP privileges.
 * Design: null role (no Clerk metadata) defaults to SLP because new
 * sign-ups start as SLPs. Caregivers get role set via acceptInvite →
 * clerkActions.setCaregiverRole. Patient ownership checks in every
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
  const authIdentifiers = await getCurrentAuthIdentifiers(ctx);
  if (authIdentifiers.length === 0) throw new ConvexError("Not authenticated");

  for (const authIdentifier of authIdentifiers) {
    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId_patientId", (q) =>
        q.eq("caregiverUserId", authIdentifier).eq("patientId", patientId)
      )
      .first();
    if (link?.inviteStatus === "accepted") {
      return link.caregiverUserId ?? authIdentifier;
    }
  }

  {
    throw new ConvexError("Not authorized to access this patient");
  }
}

export async function assertPatientAccess(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<"patients">,
): Promise<{ userId: string; role: UserRole }> {
  const authIdentifiers = await getCurrentAuthIdentifiers(ctx);
  if (authIdentifiers.length === 0) throw new ConvexError("Not authenticated");
  const patient = await ctx.db.get(patientId);
  if (!patient) throw new ConvexError("Patient not found");

  if (authIdentifiers.includes(patient.slpUserId)) {
    return { userId: patient.slpUserId, role: "slp" };
  }

  for (const authIdentifier of authIdentifiers) {
    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId_patientId", (q) =>
        q.eq("caregiverUserId", authIdentifier).eq("patientId", patientId)
      )
      .first();
    if (link?.inviteStatus === "accepted") {
      return { userId: link.caregiverUserId ?? authIdentifier, role: "caregiver" };
    }
  }

  throw new ConvexError("Not authorized");
}
