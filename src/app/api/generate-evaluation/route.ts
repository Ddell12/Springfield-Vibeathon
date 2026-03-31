import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { z } from "zod";

import {
  buildEvaluationPrompt,
  parseEvaluationResponse,
} from "@/features/evaluations/lib/evaluation-prompt";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { sseEncode } from "../generate/sse";

export const runtime = "nodejs";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required for /api/generate-evaluation");
}
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required for /api/generate-evaluation");
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const InputSchema = z.object({ evaluationId: z.string().min(1) });

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

  const evalId = parsedBody.data.evaluationId as Id<"evaluations">;
  const evaluation = await convex.query(anyApi.evaluations.get, { evalId });
  if (!evaluation) {
    return new Response(JSON.stringify({ error: "Evaluation not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (evaluation.status === "signed") {
    return new Response(
      JSON.stringify({ error: "Cannot generate for a signed evaluation" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const patient = await convex.query(api.patients.get, { patientId: evaluation.patientId });
  if (!patient) {
    return new Response(JSON.stringify({ error: "Patient not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = buildEvaluationPrompt(patient, {
    evaluationDate: evaluation.evaluationDate,
    referralSource: evaluation.referralSource,
    backgroundHistory: evaluation.backgroundHistory,
    assessmentTools: evaluation.assessmentTools,
    domainFindings: evaluation.domainFindings,
    behavioralObservations: evaluation.behavioralObservations,
    diagnosisCodes: evaluation.diagnosisCodes,
    prognosis: evaluation.prognosis,
  });

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
              content: "Generate the clinical interpretation and recommendations for this evaluation.",
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
            send("eval-chunk", { text: event.delta.text });
          }
        }

        const parsed = parseEvaluationResponse(fullText);
        if (parsed) {
          await convex.mutation(anyApi.evaluations.saveFromAI, {
            evalId,
            clinicalInterpretation: parsed.clinicalInterpretation,
            recommendations: parsed.recommendations,
          });
          send("eval-complete", parsed);
        } else {
          send("error", { message: "Failed to parse evaluation response" });
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
