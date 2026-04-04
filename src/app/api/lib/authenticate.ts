import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

import { api } from "../../../../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export interface AuthResult {
  convex: ConvexHttpClient;
  userId: string | undefined;
}

export async function authenticate(): Promise<AuthResult> {
  const convex = new ConvexHttpClient(CONVEX_URL);
  let userId: string | undefined;

  try {
    const token = await convexAuthNextjsToken();
    if (token) {
      convex.setAuth(token);
      const user = await convex.query(api.users.currentUser, {});
      userId = user?._id;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    console.warn("[auth] Could not retrieve Convex Auth token:", msg);
  }

  return { convex, userId };
}
