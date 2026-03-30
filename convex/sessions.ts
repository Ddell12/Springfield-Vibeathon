import { ConvexError, v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";
import { assertSessionOwner, getAuthUserId } from "./lib/auth";
import {
  SESSION_STATES,
  type SessionState,
  VALID_TRANSITIONS,
} from "./lib/session_states";

export const create = mutation({
  args: {
    title: v.string(),
    query: v.string(),
    type: v.optional(v.union(v.literal("builder"), v.literal("flashcards"))),
    patientId: v.optional(v.id("patients")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    return await ctx.db.insert("sessions", {
      userId: identity?.subject,
      title: args.title,
      query: args.query,
      state: SESSION_STATES.IDLE,
      type: args.type,
      ...(args.patientId ? { patientId: args.patientId } : {}),
    });
  },
});

export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await assertSessionOwner(ctx, args.sessionId, { soft: true });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(100);
    return sessions.filter((s) => s.archived !== true);
  },
});

export const startGeneration = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    // Hard mode: throws on failure, so session is guaranteed non-null
    const session = (await assertSessionOwner(ctx, args.sessionId))!;
    const allowed = VALID_TRANSITIONS[session.state as SessionState];
    if (!allowed?.includes("generating")) {
      throw new Error(
        `Cannot start generation from state "${session.state}"`,
      );
    }
    await ctx.db.patch(args.sessionId, {
      state: SESSION_STATES.GENERATING,
      stateMessage: "Generating your app...",
    });
  },
});

export const setLive = mutation({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const session = (await assertSessionOwner(ctx, args.sessionId))!;
    const allowed = VALID_TRANSITIONS[session.state as SessionState];
    if (!allowed?.includes("live")) {
      throw new Error(`Cannot set live from state "${session.state}"`);
    }
    await ctx.db.patch(args.sessionId, {
      state: SESSION_STATES.LIVE,
      stateMessage: "Live",
    });
  },
});

export const setFailed = mutation({
  args: {
    sessionId: v.id("sessions"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const session = (await assertSessionOwner(ctx, args.sessionId))!;
    const allowed = VALID_TRANSITIONS[session.state as SessionState];
    if (!allowed?.includes("failed")) {
      throw new Error(`Cannot set failed from state "${session.state}"`);
    }
    await ctx.db.patch(args.sessionId, {
      state: SESSION_STATES.FAILED,
      error: args.error,
    });
  },
});

export const listByState = query({
  args: { state: v.union(v.literal("idle"), v.literal("generating"), v.literal("live"), v.literal("failed")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("sessions")
      .withIndex("by_state_user", (q) => q.eq("state", args.state).eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const remove = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.subject) {
      throw new Error("Not authorized");
    }

    // Cascade-delete messages in batches (loop prevents orphans for large sessions)
    while (true) {
      const batch = await ctx.db
        .query("messages")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .take(500);
      if (batch.length === 0) break;
      for (const msg of batch) {
        await ctx.db.delete(msg._id);
      }
    }

    // Cascade-delete files in batches
    while (true) {
      const batch = await ctx.db
        .query("files")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .take(200);
      if (batch.length === 0) break;
      for (const file of batch) {
        await ctx.db.delete(file._id);
      }
    }

    // Cascade-delete apps (typically 0-1 per session)
    const apps = await ctx.db
      .query("apps")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .take(10);
    for (const app of apps) {
      await ctx.db.delete(app._id);
    }

    // Cascade-delete flashcard decks and their cards
    const decks = await ctx.db
      .query("flashcardDecks")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .take(50);
    for (const deck of decks) {
      const cards = await ctx.db
        .query("flashcards")
        .withIndex("by_deck", (q) => q.eq("deckId", deck._id))
        .take(200);
      for (const card of cards) {
        await ctx.db.delete(card._id);
      }
      await ctx.db.delete(deck._id);
    }

    // Delete the session itself
    await ctx.db.delete(args.sessionId);
  },
});

export const updateTitle = mutation({
  args: {
    sessionId: v.id("sessions"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await assertSessionOwner(ctx, args.sessionId);
    const trimmed = args.title.slice(0, 100);
    await ctx.db.patch(args.sessionId, { title: trimmed });
  },
});

export const getMostRecent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_state_user", (q) =>
        q.eq("state", SESSION_STATES.LIVE).eq("userId", userId)
      )
      .order("desc")
      .take(1);
    return sessions[0] ?? null;
  },
});

export const setBlueprint = mutation({
  args: {
    sessionId: v.id("sessions"),
    blueprint: v.any(), // Validated via TherapyBlueprintSchema (Zod) at app layer before persistence
  },
  handler: async (ctx, args) => {
    await assertSessionOwner(ctx, args.sessionId);
    if (args.blueprint !== null && typeof args.blueprint !== "object") {
      throw new ConvexError("Blueprint must be an object");
    }
    if (args.blueprint !== null) {
      const serialized = JSON.stringify(args.blueprint);
      if (serialized.length > 50_000) {
        throw new ConvexError("Blueprint is too large (max 50KB)");
      }
    }
    await ctx.db.patch(args.sessionId, { blueprint: args.blueprint });
  },
});

export const archive = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    await assertSessionOwner(ctx, args.sessionId);
    await ctx.db.patch(args.sessionId, { archived: true });
  },
});

export const duplicateSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = (await assertSessionOwner(ctx, args.sessionId))!;
    const newSessionId = await ctx.db.insert("sessions", {
      userId: session.userId,
      title: `${session.title} (copy)`,
      query: session.query,
      state: SESSION_STATES.IDLE,
      type: session.type,
      blueprint: session.blueprint,
    });
    return newSessionId;
  },
});

export const recoverStuckSessions = mutation({
  args: { maxAgeMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const maxAge = args.maxAgeMs ?? 5 * 60 * 1000; // default 5 minutes
    const cutoff = Date.now() - maxAge;

    const stuck = await ctx.db
      .query("sessions")
      .withIndex("by_state_user", (q) =>
        q.eq("state", "generating").eq("userId", userId)
      )
      .take(20);

    let recovered = 0;
    for (const session of stuck) {
      if (session._creationTime < cutoff) {
        await ctx.db.patch(session._id, {
          state: "failed",
          error: "Generation timed out — please try again",
        });
        recovered++;
      }
    }
    return recovered;
  },
});

/** Internal-only: fail a specific stuck session by ID. For CLI/admin use. */
export const failStuckSession = internalMutation({
  args: { sessionId: v.id("sessions"), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found");
    if (session.state !== "generating") {
      throw new ConvexError(`Session is "${session.state}", not "generating"`);
    }
    await ctx.db.patch(args.sessionId, {
      state: "failed",
      error: args.error ?? "Generation timed out — please try again",
    });
  },
});
