import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { assertCaregiverAccess, assertPatientAccess } from "./lib/auth";

// ── Mutations ────────────────────────────────────────────────────────────────

export const log = mutation({
  args: {
    homeProgramId: v.id("homePrograms"),
    date: v.string(),
    duration: v.optional(v.number()),
    confidence: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate fields
    if (args.confidence !== undefined) {
      if (args.confidence < 1 || args.confidence > 5) {
        throw new ConvexError("Confidence must be between 1 and 5");
      }
    }
    if (args.duration !== undefined && args.duration < 0) {
      throw new ConvexError("Duration must be >= 0");
    }

    // Derive patientId from homeProgram — never trust client
    const program = await ctx.db.get(args.homeProgramId);
    if (!program) throw new ConvexError("Home program not found");

    // Auth: caregiver must have an accepted link to this patient
    const caregiverUserId = await assertCaregiverAccess(ctx, program.patientId);

    const logId = await ctx.db.insert("practiceLog", {
      homeProgramId: args.homeProgramId,
      patientId: program.patientId,
      caregiverUserId,
      date: args.date,
      duration: args.duration,
      confidence: args.confidence,
      notes: args.notes,
      timestamp: Date.now(),
    });

    await ctx.db.insert("activityLog", {
      patientId: program.patientId,
      actorUserId: caregiverUserId,
      action: "practice-logged",
      details: `Practice logged for program: ${program.title}`,
      timestamp: Date.now(),
    });

    return logId;
  },
});

// ── Queries ──────────────────────────────────────────────────────────────────

export const listByProgram = query({
  args: { homeProgramId: v.id("homePrograms") },
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.homeProgramId);
    if (!program) throw new ConvexError("Home program not found");

    await assertPatientAccess(ctx, program.patientId);

    return await ctx.db
      .query("practiceLog")
      .withIndex("by_homeProgramId", (q) =>
        q.eq("homeProgramId", args.homeProgramId)
      )
      .order("desc")
      .take(200);
  },
});

export const listByPatientDateRange = query({
  args: {
    patientId: v.id("patients"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);

    return await ctx.db
      .query("practiceLog")
      .withIndex("by_patientId_date", (q) =>
        q
          .eq("patientId", args.patientId)
          .gte("date", args.startDate)
          .lte("date", args.endDate)
      )
      .take(200);
  },
});

export const getStreakData = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);

    // Get the last 30 days of logs
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const todayStr = today.toISOString().slice(0, 10);
    const startStr = thirtyDaysAgo.toISOString().slice(0, 10);

    const logs = await ctx.db
      .query("practiceLog")
      .withIndex("by_patientId_date", (q) =>
        q
          .eq("patientId", args.patientId)
          .gte("date", startStr)
          .lte("date", todayStr)
      )
      .take(200);

    // Deduplicate by date
    const practicedDates = new Set(logs.map((l) => l.date));

    // Compute current streak: count consecutive days backwards from today
    // If today is not practiced, start from yesterday
    let currentStreak = 0;
    const cursor = new Date(today);

    if (!practicedDates.has(todayStr)) {
      // Start from yesterday
      cursor.setDate(cursor.getDate() - 1);
    }

    while (true) {
      const dateStr = cursor.toISOString().slice(0, 10);
      if (!practicedDates.has(dateStr)) break;
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    // Compute weeklyPracticeDays: unique dates in current Mon-Sun week
    const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ...
    // Monday of the current week
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const mondayStr = monday.toISOString().slice(0, 10);
    const sundayStr = sunday.toISOString().slice(0, 10);

    let weeklyPracticeDays = 0;
    for (const date of practicedDates) {
      if (date >= mondayStr && date <= sundayStr) {
        weeklyPracticeDays++;
      }
    }

    return {
      currentStreak,
      weeklyPracticeDays,
      weeklyTarget: 7,
    };
  },
});
