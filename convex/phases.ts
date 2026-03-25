import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

const phaseStatusValidator = v.union(
  v.literal("pending"),
  v.literal("generating"),
  v.literal("implementing"),
  v.literal("deploying"),
  v.literal("validating"),
  v.literal("completed"),
  v.literal("failed")
);

export const create = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    index: v.number(),
    name: v.string(),
    description: v.string(),
    files: v.array(v.object({
      path: v.string(),
      purpose: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("generating"),
        v.literal("completed"),
        v.literal("failed")
      ),
    })),
    installCommands: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("phases", {
      sessionId: args.sessionId,
      index: args.index,
      name: args.name,
      description: args.description,
      files: args.files,
      installCommands: args.installCommands,
      status: "pending",
    });
  },
});

export const list = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("phases")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
  },
});

export const updateStatus = internalMutation({
  args: {
    phaseId: v.id("phases"),
    status: phaseStatusValidator,
    errors: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.errors !== undefined) {
      patch.errors = args.errors;
    }
    if (args.status === "implementing" || args.status === "generating") {
      patch.startedAt = Date.now();
    }
    if (args.status === "completed" || args.status === "failed") {
      patch.completedAt = Date.now();
    }
    await ctx.db.patch(args.phaseId, patch);
  },
});

export const get = query({
  args: {
    sessionId: v.id("sessions"),
    index: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("phases")
      .withIndex("by_session_index", (q) =>
        q.eq("sessionId", args.sessionId).eq("index", args.index)
      )
      .first();
  },
});
