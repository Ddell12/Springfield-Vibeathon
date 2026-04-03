import { v } from "convex/values";

import { query } from "./_generated/server";
import { assertPatientAccess } from "./lib/auth";

type ProgressTrendEntry = {
  sound: string;
  position: "initial" | "medial" | "final" | "unknown";
  firstAccuracy: number;
  latestAccuracy: number;
  sessionCount: number;
};

type PracticeFrequency = {
  sessionsLast30Days: number;
  avgPerWeek: number;
  lastSessionAt: number | null;
  soundsSummary: Array<{ sound: string; count: number }>;
};

function toAccuracy(correct: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

export const getProgressTrend = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args): Promise<ProgressTrendEntry[]> => {
    await assertPatientAccess(ctx, args.patientId);

    const records = await ctx.db
      .query("speechCoachProgress")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("asc")
      .take(200);

    const grouped = new Map<
      string,
      {
        sound: string;
        position: "initial" | "medial" | "final" | "unknown";
        firstAccuracy: number;
        latestAccuracy: number;
        sessionCount: number;
      }
    >();

    for (const record of records) {
      for (const row of record.positionAccuracy ?? []) {
        const key = `${row.sound}::${row.position}`;
        const accuracy = toAccuracy(row.correct, row.total);
        const existing = grouped.get(key);

        if (!existing) {
          grouped.set(key, {
            sound: row.sound,
            position: row.position,
            firstAccuracy: accuracy,
            latestAccuracy: accuracy,
            sessionCount: 1,
          });
          continue;
        }

        existing.latestAccuracy = accuracy;
        existing.sessionCount += 1;
      }
    }

    return Array.from(grouped.values()).sort((a, b) => {
      const deltaDiff =
        Math.abs(b.latestAccuracy - b.firstAccuracy) -
        Math.abs(a.latestAccuracy - a.firstAccuracy);
      if (deltaDiff !== 0) return deltaDiff;
      return a.sound.localeCompare(b.sound);
    });
  },
});

export const getRecentPatientSessions = query({
  args: {
    patientId: v.id("patients"),
    limitDays: v.number(),
  },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);

    const since = Date.now() - args.limitDays * 24 * 60 * 60 * 1000;
    return await ctx.db
      .query("speechCoachSessions")
      .withIndex("by_patientId_startedAt", (q) =>
        q.eq("patientId", args.patientId).gte("startedAt", since)
      )
      .order("desc")
      .take(60);
  },
});

export const getPracticeFrequency = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args): Promise<PracticeFrequency> => {
    await assertPatientAccess(ctx, args.patientId);

    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const sessions = await ctx.db
      .query("speechCoachSessions")
      .withIndex("by_patientId_startedAt", (q) =>
        q.eq("patientId", args.patientId).gte("startedAt", since)
      )
      .order("desc")
      .take(60);

    const completedSessions = sessions.filter(
      (session) => session.status === "analyzed" || session.status === "completed"
    );

    const soundsSummaryMap = new Map<string, number>();
    for (const session of completedSessions) {
      for (const sound of session.config.targetSounds) {
        soundsSummaryMap.set(sound, (soundsSummaryMap.get(sound) ?? 0) + 1);
      }
    }

    const sessionsLast30Days = completedSessions.length;
    return {
      sessionsLast30Days,
      avgPerWeek:
        sessionsLast30Days > 0
          ? Math.round((sessionsLast30Days / 4.3) * 10) / 10
          : 0,
      lastSessionAt: completedSessions[0]?.startedAt ?? null,
      soundsSummary: Array.from(soundsSummaryMap.entries())
        .map(([sound, count]) => ({ sound, count }))
        .sort((a, b) => b.count - a.count || a.sound.localeCompare(b.sound))
        .slice(0, 6),
    };
  },
});
