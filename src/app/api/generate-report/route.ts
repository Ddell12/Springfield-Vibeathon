import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";

const ReportInputSchema = z.object({
  patientId: z.string().min(1),
  reportType: z.enum(["weekly-summary", "monthly-summary", "iep-progress-report"]),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

import {
  buildReportPrompt,
  parseReportResponse,
} from "@/features/goals/lib/progress-prompt";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { calculateStreak, detectTrend } from "../../../../convex/lib/progress";
import { sseEncode } from "../generate/sse";

export const runtime = "nodejs";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required for /api/generate-report");
}
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required for /api/generate-report");
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const parsedBody = ReportInputSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return new Response(JSON.stringify({ error: parsedBody.error.issues[0]?.message ?? "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const { patientId, reportType, periodStart, periodEnd } = parsedBody.data;

  const pid = patientId as Id<"patients">;

  const [patient, goals, progressData] = await Promise.all([
    convex.query(api.patients.get, { patientId: pid }),
    convex.query(api.goals.listActive, { patientId: pid }),
    convex.query(api.progressData.listByPatient, { patientId: pid, periodStart, periodEnd }),
  ]);

  if (!patient) {
    return new Response(JSON.stringify({ error: "Patient not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (goals.length === 0) {
    return new Response(JSON.stringify({ error: "No active goals found for this patient" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const goalsWithData = goals.map((goal) => {
    const goalData = progressData
      .filter((d) => d.goalId === goal._id)
      .sort((a, b) => (b.date > a.date ? 1 : -1));

    const avgAccuracy = goalData.length > 0
      ? Math.round(goalData.reduce((sum, d) => sum + d.accuracy, 0) / goalData.length)
      : 0;

    return {
      goalId: goal._id as string,
      shortDescription: goal.shortDescription,
      domain: goal.domain,
      fullGoalText: goal.fullGoalText,
      targetAccuracy: goal.targetAccuracy,
      status: goal.status,
      dataPoints: goalData,
      trend: detectTrend(goalData),
      streak: calculateStreak(goalData, goal.targetAccuracy),
      averageAccuracy: avgAccuracy,
    };
  });

  const previousReports = await convex.query(api.progressReports.list, { patientId: pid });
  const previousNarrative = previousReports.length > 0
    ? previousReports[0].overallNarrative
    : undefined;

  const systemPrompt = buildReportPrompt(
    patient,
    goalsWithData,
    reportType,
    periodStart,
    periodEnd,
    previousNarrative,
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
              content: "Generate the progress report based on the data provided.",
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
            send("report-chunk", { text: event.delta.text });
          }
        }

        const parsed = parseReportResponse(fullText);
        if (parsed) {
          const goalSummaries = goalsWithData.map((gwd) => {
            const matchingNarrative = parsed.goalSummaries.find(
              (gs) => gs.goalId === gwd.goalId
            );
            return {
              goalId: gwd.goalId,
              shortDescription: gwd.shortDescription,
              domain: gwd.domain as "articulation" | "language-receptive" | "language-expressive" | "fluency" | "voice" | "pragmatic-social" | "aac" | "feeding",
              accuracyTrend: gwd.trend,
              averageAccuracy: gwd.averageAccuracy,
              sessionsCount: gwd.dataPoints.length,
              status: gwd.status as "active" | "met" | "discontinued" | "modified",
              narrative: matchingNarrative?.narrative ?? "No narrative generated.",
            };
          });

          const reportId = await convex.mutation(api.progressReports.create, {
            patientId: pid,
            reportType,
            periodStart,
            periodEnd,
            goalSummaries,
            overallNarrative: parsed.overallNarrative,
          });

          send("report-complete", { reportId });
        } else {
          send("error", { message: "Failed to parse report response" });
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
