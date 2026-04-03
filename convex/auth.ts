import Google from "@auth/core/providers/google";
import Apple from "@auth/core/providers/apple";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Google, Apple],
  callbacks: {
    async createOrUpdateUser(ctx, { existingUserId, profile }) {
      if (existingUserId) {
        // User already exists — don't overwrite role on re-sign-in
        return existingUserId;
      }
      // New sign-up — insert into users table
      // role defaults to undefined; assertSLP treats null/undefined as "slp"
      return ctx.db.insert("users", {
        email: profile.email ?? undefined,
        name: profile.name ?? undefined,
        image: profile.picture ?? undefined,
      });
    },
  },
});
