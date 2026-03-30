"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const setCaregiverRole = internalAction({
  args: { userId: v.string() },
  handler: async (_ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.error("CLERK_SECRET_KEY not set in Convex environment");
      return;
    }

    // Check existing role before overwriting
    const userRes = await fetch(
      `https://api.clerk.com/v1/users/${args.userId}`,
      { headers: { Authorization: `Bearer ${clerkSecretKey}` } }
    );
    if (userRes.ok) {
      const userData = await userRes.json();
      const existingRole = userData.public_metadata?.role;
      if (existingRole) {
        console.warn(`Skipping setCaregiverRole: user ${args.userId} already has role "${existingRole}"`);
        return;
      }
    }

    const response = await fetch(
      `https://api.clerk.com/v1/users/${args.userId}/metadata`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          public_metadata: { role: "caregiver" },
        }),
      }
    );

    if (!response.ok) {
      console.error(
        `Failed to set caregiver role for ${args.userId}: ${response.status}`
      );
    }
  },
});

/** Internal-only: restore a user's Clerk role. For admin/CLI repair of overwritten roles. */
export const setUserRole = internalAction({
  args: { userId: v.string(), role: v.string() },
  handler: async (_ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      throw new Error("CLERK_SECRET_KEY not set in Convex environment");
    }

    const response = await fetch(
      `https://api.clerk.com/v1/users/${args.userId}/metadata`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          public_metadata: { role: args.role },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to set role for ${args.userId}: ${response.status} ${text}`);
    }

    console.log(`Successfully set role "${args.role}" for user ${args.userId}`);
  },
});
