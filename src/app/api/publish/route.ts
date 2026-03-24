import { NextResponse } from "next/server";

import { deployToVercel } from "@/features/builder-v2/lib/vercel";
import { FragmentSchema } from "@/features/builder-v2/lib/schema";

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { fragment, projectTitle } = body as { fragment?: unknown; projectTitle?: string };

  if (!fragment) {
    return NextResponse.json({ error: "fragment is required" }, { status: 400 });
  }

  const parsed = FragmentSchema.safeParse(fragment);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid fragment", details: parsed.error.issues }, { status: 400 });
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Publish is not configured. VERCEL_TOKEN missing." }, { status: 500 });
  }

  try {
    const result = await deployToVercel(parsed.data);
    return NextResponse.json({ url: result.url }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Deploy failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
