import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
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
    return await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(50);
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
    await ctx.db.patch(args.sessionId, { blueprint: args.blueprint });
  },
});
