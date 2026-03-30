import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { getCategoryById } from "@/features/builder/lib/interview/categories";

export const runtime = "nodejs";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const RequestSchema = z.object({
  category: z.string(),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  freeformNotes: z.array(z.string()).optional(),
});

const FollowUpToolSchema = {
  name: "provide_followups" as const,
  description:
    "Return follow-up questions and a draft blueprint based on the user's interview answers.",
  input_schema: {
    type: "object" as const,
    properties: {
      followUps: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            id: { type: "string" as const },
            text: { type: "string" as const },
            type: {
              type: "string" as const,
              enum: ["chips", "select", "text"],
            },
            options: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  label: { type: "string" as const },
                  value: { type: "string" as const },
                },
                required: ["label", "value"],
              },
            },
          },
          required: ["id", "text", "type"],
        },
        maxItems: 2,
      },
      blueprint: {
        type: "object" as const,
        description: "A complete TherapyBlueprint conforming to the schema",
      },
    },
    required: ["followUps", "blueprint"],
  },
};

export async function POST(request: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const category = getCategoryById(parsed.data.category);
  if (!category) {
    return Response.json({ error: "Unknown category" }, { status: 400 });
  }

  const freeformContext = parsed.data.freeformNotes?.length
    ? `\n\nUser's additional notes: ${parsed.data.freeformNotes.join(". ")}`
    : "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await anthropic.messages.create(
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        tools: [FollowUpToolSchema],
        tool_choice: { type: "tool", name: "provide_followups" },
        messages: [
          {
            role: "user",
            content: `Category: ${category.label}\nAnswers: ${JSON.stringify(parsed.data.answers)}${freeformContext}\n\nProvide 1-2 smart follow-up questions and a complete draft TherapyBlueprint.`,
          },
        ],
        system: `You are a therapy app design expert. Given interview answers about a ${category.label}, return 1-2 follow-up questions that would meaningfully improve the app, and a complete TherapyBlueprint. Each follow-up question must use {label, value} option pairs. The blueprint must include: title, projectName, description, detailedDescription, therapyGoal, targetSkill, ageRange (toddler|preschool|school-age|adolescent|adult|all), interactionModel (tap|drag|sequence|match|timer|free-form), reinforcementStrategy ({type, description}), dataTracking, accessibilityNotes, colorPalette, views, userFlow, frameworks, pitfalls, implementationRoadmap, initialPhase.`,
      },
      { signal: controller.signal },
    );

    clearTimeout(timeout);

    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      return Response.json({ followUps: [], blueprint: null });
    }

    const input = toolBlock.input as {
      followUps: unknown[];
      blueprint: unknown;
    };
    return Response.json({
      followUps: input.followUps ?? [],
      blueprint: input.blueprint ?? null,
    });
  } catch {
    // Timeout or API error — caller will skip follow-ups gracefully
    return Response.json({ followUps: [], blueprint: null });
  }
}
