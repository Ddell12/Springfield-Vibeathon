import { getAuthUserId } from "@convex-dev/auth/server";
import { Resend, vOnEmailEventArgs } from "@convex-dev/resend";
import { ConvexError, v } from "convex/values";

import { components, internal } from "./_generated/api";
import { action, internalMutation } from "./_generated/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.vocali.health";
const INVITE_FROM_EMAIL = "Bridges <onboarding@resend.dev>";
const FINAL_EMAIL_STATUSES = new Set(["delivered", "bounced", "failed", "cancelled"]);
const PLACEHOLDER_EMAIL_DOMAINS = new Set(["example.com", "example.org", "example.net", "test.com"]);

function normalizeRecipientEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ConvexError("Enter a valid email address.");
  }

  const domain = normalized.split("@")[1] ?? "";
  if (PLACEHOLDER_EMAIL_DOMAINS.has(domain) || domain.endsWith(".test")) {
    throw new ConvexError("Use a real caregiver email address, not a placeholder test domain.");
  }

  return normalized;
}

export const resend: Resend = new Resend(components.resend, {
  testMode: false,
  onEmailEvent: internal.email.handleInviteEmailEvent,
});

export const queueInviteEmail = internalMutation({
  args: {
    toEmail: v.string(),
    toName: v.optional(v.string()),
    slpName: v.string(),
    bookingUrl: v.string(),
  },
  handler: async (ctx, args) => {
    return await resend.sendEmail(ctx, {
      from: INVITE_FROM_EMAIL,
      to: args.toEmail,
      subject: `${args.slpName} invited you to a therapy session`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #00595c; margin-bottom: 16px;">You're invited to a therapy session</h2>
          <p>Hi${args.toName ? ` ${args.toName}` : ""},</p>
          <p><strong>${args.slpName}</strong> has invited you to schedule a therapy session.</p>
          <a href="${args.bookingUrl}"
            style="display:inline-block;background:linear-gradient(135deg,#00595c,#0d7377);color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">
            Book your session
          </a>
          <p style="margin-top:24px;color:#888;font-size:12px;">Powered by Bridges therapy platform</p>
        </div>
      `,
    });
  },
});

export const handleInviteEmailEvent = internalMutation({
  args: vOnEmailEventArgs,
  handler: async (_ctx, args) => {
    console.info("[email] invite status update", {
      emailId: args.id,
      type: args.event.type,
      to: args.event.data.to,
      subject: args.event.data.subject,
    });
  },
});

export const sendVideoCallInvite = action({
  args: {
    toEmail: v.string(),
    toName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    // Auth check — only authenticated SLPs may send invites
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const role = await ctx.runQuery(internal.users.getRoleById, { userId });
    if (role !== null && role !== "slp") {
      throw new ConvexError("Only SLPs can send session invites");
    }

    const slpName =
      identity.name ??
      ((identity as Record<string, unknown>).email as string | undefined) ??
      "Your therapist";
    const bookingUrl = `${APP_URL}/sessions/book/${identity.subject}`;
    const toEmail = normalizeRecipientEmail(args.toEmail);

    return await ctx.runMutation(internal.email.queueInviteEmail, {
      toEmail,
      toName: args.toName,
      slpName,
      bookingUrl,
    });
  },
});

export const getInviteEmailStatus = action({
  args: {
    emailId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const status = await ctx.runQuery(components.resend.lib.getStatus, {
      emailId: args.emailId,
    });
    const email = await ctx.runQuery(components.resend.lib.get, {
      emailId: args.emailId,
    });

    if (!status || !email) {
      return null;
    }

    return {
      status: status.status,
      failed: status.failed,
      bounced: status.bounced,
      complained: status.complained,
      deliveryDelayed: status.deliveryDelayed,
      errorMessage: status.errorMessage,
      finalized: FINAL_EMAIL_STATUSES.has(status.status),
      from: email.from,
      to: email.to,
      subject: email.subject ?? null,
      resendId: email.resendId ?? null,
    };
  },
});
