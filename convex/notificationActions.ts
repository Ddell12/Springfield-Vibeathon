"use node";

import { v } from "convex/values";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const onAppointmentBooked = internalAction({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const appointment = await ctx.runQuery(internal.appointments.getInternal, {
      appointmentId: args.appointmentId,
    });
    if (!appointment) return;

    const patientName = appointment.patient
      ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
      : "Patient";

    const date = new Date(appointment.scheduledAt).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    await ctx.runMutation(internal.notifications.createNotification, {
      userId: appointment.slpId,
      type: "session-booked",
      title: "Session Booked",
      body: `Session with ${patientName} on ${date}`,
      link: `/sessions/${args.appointmentId}`,
      appointmentId: args.appointmentId,
    });

    if (appointment.caregiverId) {
      await ctx.runMutation(internal.notifications.createNotification, {
        userId: appointment.caregiverId,
        type: "session-booked",
        title: "Session Booked",
        body: `Session for ${patientName} on ${date}`,
        link: `/sessions/${args.appointmentId}`,
        appointmentId: args.appointmentId,
      });
    }

    const scheduledAt = appointment.scheduledAt;
    const now = Date.now();
    const twentyFourHoursBefore = scheduledAt - 24 * 60 * 60 * 1000;
    const oneHourBefore = scheduledAt - 60 * 60 * 1000;

    if (twentyFourHoursBefore > now) {
      await ctx.scheduler.runAt(twentyFourHoursBefore, internal.notificationActions.sendReminder, {
        appointmentId: args.appointmentId,
        type: "24h",
      });
    }

    if (oneHourBefore > now) {
      await ctx.scheduler.runAt(oneHourBefore, internal.notificationActions.sendReminder, {
        appointmentId: args.appointmentId,
        type: "1h",
      });
    }
  },
});

export const onAppointmentCancelled = internalAction({
  args: {
    appointmentId: v.id("appointments"),
    cancelledBy: v.string(),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.runQuery(internal.appointments.getInternal, {
      appointmentId: args.appointmentId,
    });
    if (!appointment) return;

    const patientName = appointment.patient
      ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
      : "Patient";

    const notifyUserId =
      args.cancelledBy === appointment.slpId
        ? appointment.caregiverId
        : appointment.slpId;

    if (notifyUserId) {
      await ctx.runMutation(internal.notifications.createNotification, {
        userId: notifyUserId,
        type: "session-cancelled",
        title: "Session Cancelled",
        body: `Session with ${patientName} has been cancelled`,
        link: `/sessions/${args.appointmentId}`,
        appointmentId: args.appointmentId,
      });
    }
  },
});

export const sendReminder = internalAction({
  args: {
    appointmentId: v.id("appointments"),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.runQuery(internal.appointments.getInternal, {
      appointmentId: args.appointmentId,
    });
    if (!appointment || appointment.status !== "scheduled") return;

    const patientName = appointment.patient
      ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
      : "Patient";

    const label = args.type === "24h" ? "tomorrow" : "in 1 hour";

    await ctx.runMutation(internal.notifications.createNotification, {
      userId: appointment.slpId,
      type: "session-reminder",
      title: "Session Reminder",
      body: `Session with ${patientName} ${label}`,
      link: `/sessions/${args.appointmentId}/call`,
      appointmentId: args.appointmentId,
    });

    if (appointment.caregiverId) {
      await ctx.runMutation(internal.notifications.createNotification, {
        userId: appointment.caregiverId,
        type: "session-reminder",
        title: "Session Reminder",
        body: `Session for ${patientName} ${label}`,
        link: `/sessions/${args.appointmentId}/call`,
        appointmentId: args.appointmentId,
      });
    }
  },
});
