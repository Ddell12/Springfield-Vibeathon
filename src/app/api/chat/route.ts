import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { NextResponse } from "next/server";

import { getInterviewSystemPrompt } from "@/features/builder-v2/lib/prompt";

export async function POST(req: Request): Promise<Response> {
  const body = await req.json();
  const messages = body?.messages;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages are required" }, { status: 400 });
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: getInterviewSystemPrompt(),
    messages,
  });

  return result.toTextStreamResponse();
}
