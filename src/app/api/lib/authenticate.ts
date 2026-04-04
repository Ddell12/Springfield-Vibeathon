import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export interface AuthResult {
  convex: ConvexHttpClient;
  userId: string | undefined;
}

export async function authenticate(): Promise<AuthResult> {
  const convex = new ConvexHttpClient(CONVEX_URL);

  try {
    const token = await convexAuthNextjsToken();
    if (token) convex.setAuth(token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    console.warn("[auth] Could not retrieve Convex Auth token:", msg);
  }

  // userId is not directly available from the token without a DB roundtrip.
  // API routes that need the userId should call api.users.currentUser via convex.query().
  return { convex, userId: undefined };
}
