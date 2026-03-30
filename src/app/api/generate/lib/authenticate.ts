import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export interface AuthResult {
  convex: ConvexHttpClient;
  userId: string | undefined;
}

// Module-scoped singleton — reused across requests, auth set per-request
const sharedConvex = new ConvexHttpClient(CONVEX_URL);

export async function authenticate(): Promise<AuthResult> {
  sharedConvex.clearAuth();
  let userId: string | undefined;

  try {
    const { userId: clerkUserId, getToken } = await auth();
    userId = clerkUserId ?? undefined;

    if (clerkUserId) {
      const token = await getToken({ template: "convex" });
      if (token) {
        sharedConvex.setAuth(token);
      }
    }
  } catch (err) {
    // Only swallow expected "not configured" errors — re-throw infrastructure failures
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Clerk") || msg.includes("publishableKey") || msg.includes("secretKey")) {
      console.warn("[auth] Clerk not configured:", msg);
    } else {
      console.error("[auth] Unexpected auth error:", err);
    }
  }

  return { convex: sharedConvex, userId };
}
