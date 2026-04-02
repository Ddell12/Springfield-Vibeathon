"use node";

import { Resend } from "@convex-dev/resend";
import { render } from "@react-email/render";
import { v } from "convex/values";

import { AppointmentBooked } from "../src/features/sessions/emails/appointment-booked";
import { AppointmentCancelled } from "../src/features/sessions/emails/appointment-cancelled";
import { NotesReady } from "../src/features/sessions/emails/notes-ready";
import { SessionReminder } from "../src/features/sessions/emails/session-reminder";
import { components } from "./_generated/api";
import { internalAction } from "./_generated/server";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.vocali.health";

export const resend = new Resend(components.resend, { testMode: false });

export const sendBookingEmail = internalAction({
  args: {
    to: v.string(),
    patientName: v.string(),
    dateTime: v.string(),
    joinLink: v.string(),
    recipientRole: v.union(v.literal("slp"), v.literal("caregiver")),
  },
  handler: async (ctx, args) => {
    try {
      const absoluteJoinLink = args.joinLink.startsWith("http")
        ? args.joinLink
        : `${BASE_URL}${args.joinLink}`;

      const html = await render(
        AppointmentBooked({
          patientName: args.patientName,
          dateTime: args.dateTime,
          joinLink: absoluteJoinLink,
          recipientRole: args.recipientRole,
        })
      );

      await resend.sendEmail(ctx, {
        from: "Bridges <sessions@bridges.ai>",
        to: args.to,
        subject: `Session Booked: ${args.patientName}`,
        html,
      });
    } catch (err) {
      console.error("[sendBookingEmail] failed:", err);
    }
  },
});

export const sendCancellationEmail = internalAction({
  args: {
    to: v.string(),
    patientName: v.string(),
    dateTime: v.string(),
    cancelledBy: v.union(v.literal("slp"), v.literal("caregiver")),
  },
  handler: async (ctx, args) => {
    try {
      const html = await render(
        AppointmentCancelled({
          patientName: args.patientName,
          dateTime: args.dateTime,
          cancelledBy: args.cancelledBy,
        })
      );

      await resend.sendEmail(ctx, {
        from: "Bridges <sessions@bridges.ai>",
        to: args.to,
        subject: `Session Cancelled: ${args.patientName}`,
        html,
      });
    } catch (err) {
      console.error("[sendCancellationEmail] failed:", err);
    }
  },
});

export const sendReminderEmail = internalAction({
  args: {
    to: v.string(),
    patientName: v.string(),
    dateTime: v.string(),
    joinLink: v.string(),
    reminderType: v.union(v.literal("24h"), v.literal("1h")),
  },
  handler: async (ctx, args) => {
    try {
      const absoluteJoinLink = args.joinLink.startsWith("http")
        ? args.joinLink
        : `${BASE_URL}${args.joinLink}`;

      const html = await render(
        SessionReminder({
          patientName: args.patientName,
          dateTime: args.dateTime,
          joinLink: absoluteJoinLink,
          reminderType: args.reminderType,
        })
      );

      const subjectPrefix =
        args.reminderType === "24h" ? "Tomorrow" : "Starting Soon";

      await resend.sendEmail(ctx, {
        from: "Bridges <sessions@bridges.ai>",
        to: args.to,
        subject: `Session ${subjectPrefix}: ${args.patientName}`,
        html,
      });
    } catch (err) {
      console.error("[sendReminderEmail] failed:", err);
    }
  },
});

export const sendNotesReadyEmail = internalAction({
  args: {
    to: v.string(),
    patientName: v.string(),
    notesLink: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const absoluteNotesLink = args.notesLink.startsWith("http")
        ? args.notesLink
        : `${BASE_URL}${args.notesLink}`;

      const html = await render(
        NotesReady({
          patientName: args.patientName,
          notesLink: absoluteNotesLink,
        })
      );

      await resend.sendEmail(ctx, {
        from: "Bridges <sessions@bridges.ai>",
        to: args.to,
        subject: `Session Notes Ready: ${args.patientName}`,
        html,
      });
    } catch (err) {
      console.error("[sendNotesReadyEmail] failed:", err);
    }
  },
});
