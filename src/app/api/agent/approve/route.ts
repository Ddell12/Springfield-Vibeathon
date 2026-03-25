import { ConvexHttpClient } from "convex/browser";

import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud");

export async function POST(req: Request) {
  const { sessionId } = await req.json();

  if (!sessionId || typeof sessionId !== "string") {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  await convex.mutation(api.blueprints.approve, { sessionId: sessionId as Id<"sessions"> });

  return Response.json({ success: true });
}
