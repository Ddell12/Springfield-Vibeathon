"use node";
import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { Resend } from "@convex-dev/resend";
import { components } from "./_generated/api";

const resend = new Resend(components.resend);

export const sendVideoCallInvite = action({
  args: {
    toEmail: v.string(),
    toName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Auth check — only authenticated SLPs may send invites
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    // Role comes from Clerk publicMetadata JWT claim.
    // convex-test surfaces public_metadata as a JSON string; production Clerk
    // JWTs surface it as an already-parsed object. Handle both forms.
    const raw = (identity as Record<string, unknown>).public_metadata;
    let role: string | null = null;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw) as { role?: string };
        role = parsed.role ?? null;
      } catch {
        role = null;
      }
    } else if (raw && typeof raw === "object") {
      role = ((raw as { role?: string }).role) ?? null;
    }
    // null role = new sign-up (defaults to SLP). Explicit "caregiver" is blocked.
    if (role !== null && role !== "slp") {
      throw new ConvexError("Only SLPs can send session invites");
    }

    // Construct slpName and bookingUrl server-side from verified identity
    const slpUserId = identity.subject;
    const slpName =
      identity.name ??
      (identity as Record<string, unknown>).email as string ??
      "Your therapist";
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://bridgeai-iota.vercel.app";
    const bookingUrl = `${origin}/sessions/book/${slpUserId}`;

    await resend.sendEmail(ctx, {
      from: "Bridges <noreply@bridges.ai>",
      to: args.toEmail,
      subject: `${slpName} invited you to a therapy session`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #00595c; margin-bottom: 16px;">You're invited to a therapy session</h2>
          <p>Hi${args.toName ? ` ${args.toName}` : ""},</p>
          <p><strong>${slpName}</strong> has invited you to schedule a therapy session.</p>
          <a href="${bookingUrl}"
            style="display:inline-block;background:linear-gradient(135deg,#00595c,#0d7377);color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">
            Book your session
          </a>
          <p style="margin-top:24px;color:#888;font-size:12px;">Powered by Bridges therapy platform</p>
        </div>
      `,
    });
  },
});
