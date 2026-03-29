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
      if (existingRole === "slp") {
        console.warn(`Skipping setCaregiverRole: user ${args.userId} already has SLP role`);
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
