import { v } from "convex/values";
import { ConvexError } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  assertPatientAccess,
  getAuthRole,
  getAuthUserId,
} from "./lib/auth";
import { authedMutation, authedQuery, slpMutation } from "./lib/customFunctions";
import { assertDeveloperGate } from "./lib/developerGate";
import { buildDeveloperTestMetadata } from "./lib/testMetadata";

export const getAvailableSlots = authedQuery({
  args: {
    slpId: v.string(),
    weekStart: v.number(),
  },
  handler: async (ctx, args) => {
    if (!ctx.userId) return [];

    const weekEnd = args.weekStart + 7 * 24 * 60 * 60 * 1000;

    const availability = await ctx.db
      .query("availability")
      .withIndex("by_slpId", (q) => q.eq("slpId", args.slpId))
      .collect();

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_slpId_scheduledAt", (q) =>
        q.eq("slpId", args.slpId).gte("scheduledAt", args.weekStart)
      )
      .collect();

    const bookedTimes = new Set(
      appointments
        .filter((a) => a.status !== "cancelled")
        .filter((a) => a.scheduledAt < weekEnd)
        .map((a) => a.scheduledAt)
    );

    const slots: Array<{ timestamp: number; startTime: string; dayOfWeek: number }> =
      [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const dayTimestamp = args.weekStart + dayOffset * 24 * 60 * 60 * 1000;
      const dayOfWeek = dayOffset; // dayOffset 0–6 = Sun–Sat, matches JS getDay()

      const daySlots = availability.filter((a) => {
        if (a.dayOfWeek !== dayOfWeek) return false;
        if (a.isRecurring) return true;
        if (a.effectiveDate) {
          const dateStr = new Date(dayTimestamp).toISOString().split("T")[0];
          return a.effectiveDate === dateStr;
        }
        return false;
      });

      for (const slot of daySlots) {
        const [startHour, startMin] = slot.startTime.split(":").map(Number);
        const [endHour, endMin] = slot.endTime.split(":").map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        for (let m = startMinutes; m < endMinutes; m += 30) {
          const slotTimestamp = dayTimestamp + m * 60 * 1000;
          if (!bookedTimes.has(slotTimestamp) && slotTimestamp > Date.now()) {
            const hour = Math.floor(m / 60);
            const min = m % 60;
            slots.push({
              timestamp: slotTimestamp,
              startTime: `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
              dayOfWeek,
            });
          }
        }
      }
    }

    return slots;
  },
});

export const listBySlp = authedQuery({
  args: {
    weekStart: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!ctx.userId) return [];

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_slpId_scheduledAt", (q) =>
        args.weekStart !== undefined
          ? q.eq("slpId", ctx.userId!).gte("scheduledAt", args.weekStart)
          : q.eq("slpId", ctx.userId!)
      )
      .take(200);

    const enriched = await Promise.all(
      appointments.map(async (apt) => {
        const patient = await ctx.db.get(apt.patientId);
        return { ...apt, patient };
      })
    );

    return enriched;
  },
});

/** Appointments for all patients linked to the signed-in caregiver (accepted links). */
export const listForCaregiver = query({
  args: {
    weekStart: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const role = await getAuthRole(ctx);
    if (role !== "caregiver") return [];

    const links = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId", (q) => q.eq("caregiverUserId", userId))
      .collect();

    const patientIds = links
      .filter((l) => l.inviteStatus === "accepted")
      .map((l) => l.patientId);

    const merged: Doc<"appointments">[] = [];
    const seen = new Set<string>();

    for (const patientId of patientIds) {
      const forPatient = await ctx.db
        .query("appointments")
        .withIndex("by_patientId", (q) => q.eq("patientId", patientId))
        .collect();
      for (const apt of forPatient) {
        if (seen.has(apt._id)) continue;
        seen.add(apt._id);
        merged.push(apt);
      }
    }

    let filtered = merged;
    if (args.weekStart !== undefined) {
      const weekEnd = args.weekStart + 7 * 24 * 60 * 60 * 1000;
      filtered = merged.filter(
        (a) =>
          a.scheduledAt >= args.weekStart! && a.scheduledAt < weekEnd,
      );
    }

    filtered.sort((a, b) => a.scheduledAt - b.scheduledAt);

    const enriched = await Promise.all(
      filtered.map(async (apt) => {
        const patient = await ctx.db.get(apt.patientId);
        return { ...apt, patient };
      }),
    );

    return enriched;
  },
});

export const listByPatient = query({
  args: {
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);

    return await ctx.db
      .query("appointments")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

export const get = authedQuery({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    if (!ctx.userId) return null;

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) return null;

    await assertPatientAccess(ctx, appointment.patientId);

    const patient = await ctx.db.get(appointment.patientId);
    return { ...appointment, patient };
  },
});

export const getInternal = internalQuery({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) return null;
    const patient = await ctx.db.get(appointment.patientId);
    return { ...appointment, patient };
  },
});

export const create = slpMutation({
  args: {
    patientId: v.id("patients"),
    scheduledAt: v.number(),
    duration: v.optional(v.number()),
    notes: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slpId = ctx.slpUserId;

    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpId) throw new ConvexError("Not your patient");

    if (args.scheduledAt < Date.now()) {
      throw new ConvexError("Cannot schedule in the past");
    }

    const existing = await ctx.db
      .query("appointments")
      .withIndex("by_slpId_scheduledAt", (q) =>
        q.eq("slpId", slpId).eq("scheduledAt", args.scheduledAt)
      )
      .first();

    if (existing && existing.status !== "cancelled") {
      throw new ConvexError("Time slot already booked");
    }

    const appointmentId = await ctx.db.insert("appointments", {
      slpId,
      patientId: args.patientId,
      scheduledAt: args.scheduledAt,
      duration: args.duration ?? 30,
      status: "scheduled",
      joinLink: "",
      notes: args.notes,
      timezone: args.timezone,
    });

    await ctx.db.patch(appointmentId, {
      joinLink: `/sessions/${appointmentId}/call`,
    });

    await ctx.scheduler.runAfter(0, internal.notificationActions.onAppointmentBooked, {
      appointmentId,
    });

    return appointmentId;
  },
});

export const bookAsCaregiver = authedMutation({
  args: {
    slpId: v.string(),
    patientId: v.id("patients"),
    scheduledAt: v.number(),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = ctx.userId;

    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId_patientId", (q) =>
        q.eq("caregiverUserId", userId).eq("patientId", args.patientId)
      )
      .first();

    if (!link || link.inviteStatus !== "accepted") {
      throw new ConvexError("Not authorized to book for this patient");
    }

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.slpUserId !== args.slpId) {
      throw new ConvexError("Patient-SLP mismatch");
    }

    if (args.scheduledAt < Date.now()) {
      throw new ConvexError("Cannot schedule in the past");
    }

    const existing = await ctx.db
      .query("appointments")
      .withIndex("by_slpId_scheduledAt", (q) =>
        q.eq("slpId", args.slpId).eq("scheduledAt", args.scheduledAt)
      )
      .first();

    if (existing && existing.status !== "cancelled") {
      throw new ConvexError("Time slot already booked");
    }

    const appointmentId = await ctx.db.insert("appointments", {
      slpId: args.slpId,
      patientId: args.patientId,
      caregiverId: userId,
      scheduledAt: args.scheduledAt,
      duration: 30,
      status: "scheduled",
      joinLink: "",
      timezone: args.timezone,
    });

    await ctx.db.patch(appointmentId, {
      joinLink: `/sessions/${appointmentId}/call`,
    });

    await ctx.scheduler.runAfter(0, internal.notificationActions.onAppointmentBooked, {
      appointmentId,
    });

    return appointmentId;
  },
});

export const cancel = authedMutation({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const userId = ctx.userId;

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new ConvexError("Appointment not found");

    if (appointment.status !== "scheduled") {
      throw new ConvexError("Can only cancel scheduled appointments");
    }

    const isSLP = appointment.slpId === userId;
    const isCaregiver = appointment.caregiverId === userId;
    if (!isSLP && !isCaregiver) {
      const link = await ctx.db
        .query("caregiverLinks")
        .withIndex("by_caregiverUserId_patientId", (q) =>
          q.eq("caregiverUserId", userId).eq("patientId", appointment.patientId)
        )
        .first();
      if (!link || link.inviteStatus !== "accepted") {
        throw new ConvexError("Not authorized");
      }
    }

    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
      cancelledBy: userId,
    });

    await ctx.scheduler.runAfter(0, internal.notificationActions.onAppointmentCancelled, {
      appointmentId: args.appointmentId,
      cancelledBy: userId,
    });
  },
});

export const startSession = slpMutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const slpId = ctx.slpUserId;
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new ConvexError("Appointment not found");
    if (appointment.slpId !== slpId) throw new ConvexError("Not your appointment");
    if (appointment.status !== "scheduled") throw new ConvexError("Not in scheduled status");

    await ctx.db.patch(args.appointmentId, {
      status: "in-progress",
      livekitRoom: `session-${args.appointmentId}`,
    });
  },
});

export const completeSession = slpMutation({
  args: {
    appointmentId: v.id("appointments"),
    durationSeconds: v.number(),
    interactionLog: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slpId = ctx.slpUserId;
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new ConvexError("Appointment not found");
    if (appointment.slpId !== slpId) throw new ConvexError("Not your appointment");

    await ctx.db.patch(args.appointmentId, { status: "completed" });

    const meetingRecordId = await ctx.db.insert("meetingRecords", {
      appointmentId: args.appointmentId,
      slpId,
      patientId: appointment.patientId,
      duration: args.durationSeconds,
      interactionLog: args.interactionLog,
      status: "processing",
      testMetadata: appointment.testMetadata,
    });

    await ctx.scheduler.runAfter(0, internal.sessionActions.fetchAudio, {
      meetingRecordId,
    });

    return meetingRecordId;
  },
});

export const markNoShow = slpMutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const slpId = ctx.slpUserId;
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new ConvexError("Appointment not found");
    if (appointment.slpId !== slpId) throw new ConvexError("Not your appointment");
    if (appointment.status !== "scheduled") throw new ConvexError("Not in scheduled status");

    await ctx.db.patch(args.appointmentId, { status: "no-show" });
  },
});

export const startDeveloperTestCall = slpMutation({
  args: {},
  handler: async (ctx) => {
    const identity = await assertDeveloperGate(ctx);
    // assertDeveloperGate throws if identity is null — non-null assert is safe here
    const userId = identity!.subject ?? ctx.slpUserId;

    // Create a minimal synthetic patient for the test call
    const patientId = await ctx.db.insert("patients", {
      slpUserId: ctx.slpUserId,
      firstName: "Test",
      lastName: "Call",
      dateOfBirth: "2020-01-01",
      diagnosis: "articulation",
      status: "active",
      notes: "Synthetic developer teletherapy patient",
      testMetadata: buildDeveloperTestMetadata(userId),
    });

    const scheduledAt = Date.now() + 60_000;
    const appointmentId = await ctx.db.insert("appointments", {
      slpId: ctx.slpUserId,
      patientId,
      scheduledAt,
      duration: 30,
      status: "scheduled",
      joinLink: "",
      testMetadata: buildDeveloperTestMetadata(userId),
    });

    await ctx.db.patch(appointmentId, {
      joinLink: `/sessions/${appointmentId}/call`,
    });

    return appointmentId;
  },
});
