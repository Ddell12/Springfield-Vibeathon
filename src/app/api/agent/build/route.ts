import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const { prompt, title } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  const sessionId = await convex.mutation(api.sessions.startBuild, {
    title: title ?? "New App",
    query: prompt,
  });

  return Response.json({ sessionId });
}
