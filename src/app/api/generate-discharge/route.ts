import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";

import {
  buildDischargePrompt,
  parseDischargeResponse,
} from "@/features/discharge/lib/discharge-prompt";

import { anyApi } from "convex/server";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { sseEncode } from "../generate/sse";

export const runtime = "nodejs";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required for /api/generate-discharge");
}
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required for /api/generate-discharge");
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const InputSchema = z.object({ dischargeId: z.string().min(1) });

export async function POST(request: Request): Promise<Response> {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const { userId, getToken } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const token = await getToken({ template: "convex" });
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  convex.setAuth(token);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const parsedBody = InputSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return new Response(
      JSON.stringify({ error: parsedBody.error.issues[0]?.message ?? "Invalid request" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const dischargeId = parsedBody.data.dischargeId as Id<"dischargeSummaries">;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const discharge = await convex.query(anyApi.dischargeSummaries.get, { dischargeId });
  if (!discharge) {
    return new Response(JSON.stringify({ error: "Discharge summary not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (discharge.status === "signed") {
    return new Response(
      JSON.stringify({ error: "Cannot generate for a signed discharge summary" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const patient = await convex.query(api.patients.get, { patientId: discharge.patientId });
  if (!patient) {
    return new Response(JSON.stringify({ error: "Patient not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  type AchievedGoal = { goalId: string; shortDescription: string; finalAccuracy: number };
  type NotMetGoal = { goalId: string; shortDescription: string; finalAccuracy: number; reason: string };

  const goals = [
    ...(discharge.goalsAchieved as AchievedGoal[]).map((g) => ({
      shortDescription: g.shortDescription,
      finalAccuracy: g.finalAccuracy,
      status: "achieved" as const,
    })),
    ...(discharge.goalsNotMet as NotMetGoal[]).map((g) => ({
      shortDescription: g.shortDescription,
      finalAccuracy: g.finalAccuracy,
      status: "not-met" as const,
      reason: g.reason,
    })),
  ];

  // Count total sessions for context — non-critical, proceed with 0 if unavailable
  let totalSessions = 0;
  try {
    const sessionNotes = await convex.query(api.sessionNotes.list, {
      patientId: discharge.patientId,
      limit: 200,
    });
    totalSessions = sessionNotes?.length ?? 0;
  } catch {
    // Non-critical — proceed with 0 if unavailable
  }

  const systemPrompt = buildDischargePrompt(
    {
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      diagnosis: patient.diagnosis,
    },
    {
      serviceStartDate: discharge.serviceStartDate,
      serviceEndDate: discharge.serviceEndDate,
      presentingDiagnosis: discharge.presentingDiagnosis,
      dischargeReason: discharge.dischargeReason,
      dischargeReasonOther: discharge.dischargeReasonOther,
      goals,
      totalSessions,
    }
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const isAborted = () => request.signal.aborted;
      const send = (eventType: string, data: object) => {
        if (isAborted()) return;
        try {
          controller.enqueue(encoder.encode(sseEncode(eventType, data)));
        } catch {}
      };

      try {
        let fullText = "";
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          temperature: 0.3,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: "Generate the discharge narrative and recommendations.",
            },
          ],
          stream: true,
        });

        for await (const event of response) {
          if (isAborted()) break;
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;
            send("discharge-chunk", { text: event.delta.text });
          }
        }

        const parsed = parseDischargeResponse(fullText);
        if (parsed) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await convex.mutation(anyApi.dischargeSummaries.saveFromAI, {
            dischargeId,
            narrative: parsed.narrative,
            recommendations: parsed.recommendations,
          });
          send("discharge-complete", parsed);
        } else {
          send("error", { message: "Failed to parse discharge response" });
        }
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
