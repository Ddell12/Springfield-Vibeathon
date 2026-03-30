import { ConvexError } from "convex/values";
import {
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";

import { mutation, query } from "../_generated/server";
import { assertSLP, getAuthRole, getAuthUserId } from "./auth";

// ─── authedQuery ───────────────────────────────────────────────────────────────
// Query wrapper that injects nullable userId into ctx.
// Callers should return null/[] when ctx.userId is null.
export const authedQuery = customQuery(query, {
  args: {},
  input: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return { ctx: { ...ctx, userId }, args: {} };
  },
});

// ─── authedMutation ────────────────────────────────────────────────────────────
// Mutation wrapper that injects userId. Throws ConvexError if unauthenticated.
export const authedMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    return { ctx: { ...ctx, userId }, args: {} };
  },
});

// ─── slpQuery ──────────────────────────────────────────────────────────────────
// Query wrapper that injects slpUserId (string | null).
// Returns null context when caller is not an SLP — handlers should return null/[].
export const slpQuery = customQuery(query, {
  args: {},
  input: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { ctx: { ...ctx, slpUserId: null as string | null }, args: {} };
    }
    const role = await getAuthRole(ctx);
    if (role !== null && role !== "slp") {
      return { ctx: { ...ctx, slpUserId: null as string | null }, args: {} };
    }
    return { ctx: { ...ctx, slpUserId: userId as string | null }, args: {} };
  },
});

// ─── slpMutation ───────────────────────────────────────────────────────────────
// Mutation wrapper that injects slpUserId. Throws ConvexError if not an SLP.
export const slpMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => {
    const slpUserId = await assertSLP(ctx);
    return { ctx: { ...ctx, slpUserId }, args: {} };
  },
});
