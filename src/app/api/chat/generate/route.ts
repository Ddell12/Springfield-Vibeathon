import { anthropic } from "@ai-sdk/anthropic";
import { streamObject } from "ai";
import { NextResponse } from "next/server";

import { getCodeGenSystemPrompt } from "@/features/builder-v2/lib/prompt";
import { FragmentSchema } from "@/features/builder-v2/lib/schema";

export async function POST(req: Request): Promise<Response> {
  const body = await req.json();
  const messages = body?.messages;
  const context = body?.context;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages are required" }, { status: 400 });
  }

  const result = streamObject({
    model: anthropic("claude-sonnet-4-5-20251001"),
    system: getCodeGenSystemPrompt(context),
    schema: FragmentSchema,
    messages,
  });

  return result.toTextStreamResponse();
}
