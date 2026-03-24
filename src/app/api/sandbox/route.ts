import { NextResponse } from "next/server";

import { createSandbox } from "@/features/builder-v2/lib/e2b";
import { FragmentSchema } from "@/features/builder-v2/lib/schema";

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);

  if (!body || !body.fragment) {
    return NextResponse.json({ error: "fragment is required" }, { status: 400 });
  }

  const parsed = FragmentSchema.safeParse(body.fragment);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid fragment", details: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await createSandbox(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sandbox creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
