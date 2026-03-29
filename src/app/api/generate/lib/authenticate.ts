import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export interface AuthResult {
  convex: ConvexHttpClient;
  userId: string | undefined;
}

export async function authenticate(): Promise<AuthResult> {
  const convex = new ConvexHttpClient(CONVEX_URL);
  let userId: string | undefined;

  try {
    const { userId: clerkUserId, getToken } = await auth();
    userId = clerkUserId ?? undefined;

    if (clerkUserId) {
      const token = await getToken({ template: "convex" });
      if (token) {
        convex.setAuth(token);
      }
    }
  } catch {
    // Auth not configured yet — allow unauthenticated generation for demo
  }

  return { convex, userId };
}
