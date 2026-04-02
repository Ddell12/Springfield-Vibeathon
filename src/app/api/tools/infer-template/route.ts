import { auth } from "@clerk/nextjs/server";
import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { inferTemplateRequestSchema } from "@/features/tools/lib/ai/generation-schema";
import { toolsGenerationModel } from "@/features/tools/lib/ai/model";
import { buildPremiumToolPrompt } from "@/features/tools/lib/ai/premium-prompt";
import { templateRegistry } from "@/features/tools/lib/registry";

export const runtime = "nodejs";

// Derive keys from registry to prevent sync bugs when templates are added
const TEMPLATE_KEYS = Object.keys(templateRegistry) as [
  string,
  ...string[],
];

function buildInferPrompt(description: string, childContext: string): string {
  return `You are helping a speech-language pathologist choose the right therapy tool type.

Available tool types:
- aac_board: Tappable buttons that speak aloud. Use for: communication, AAC, requesting, words, buttons.
- first_then_board: First do X, Then get Y. Use for: task-reward, sequencing, transitions, first/then.
- token_board: Earn tokens, exchange for reward. Use for: tokens, reinforcement, stars, behavior, rewards.
- visual_schedule: Step-by-step activity sequence. Use for: schedule, routine, steps, morning, order.
- matching_game: Vocabulary and concept matching. Use for: matching, vocabulary, categories, game, words.

Child context:
${childContext || "Not provided."}

Clinician request: "${description}"

Pick the single best tool type. Also suggest a concise title (3-6 words) that names this specific tool.`;
}

function buildChildContext(childProfile?: {
  ageRange?: string;
  communicationLevel?: string;
  interests?: string[];
}): string {
  if (!childProfile) return "";
  return [
    childProfile.ageRange && `Age range: ${childProfile.ageRange}`,
    childProfile.communicationLevel &&
      `Communication level: ${childProfile.communicationLevel}`,
    childProfile.interests?.length &&
      `Interests: ${childProfile.interests.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = inferTemplateRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { description, childProfile } = parsed.data;
  const childContext = buildChildContext(childProfile);

  try {
    // Step 1: Infer template type and title
    const inferResult = await generateText({
      model: toolsGenerationModel,
      output: Output.object({
        schema: z.object({
          templateType: z.enum(TEMPLATE_KEYS),
          suggestedTitle: z.string(),
        }),
      }),
      prompt: buildInferPrompt(description, childContext),
    });

    if (!inferResult.output) {
      return NextResponse.json(
        { error: "Template inference produced no output" },
        { status: 500 }
      );
    }

    const { templateType, suggestedTitle } = inferResult.output;
    const registration = templateRegistry[templateType];

    if (!registration) {
      return NextResponse.json(
        { error: "Unknown template type" },
        { status: 500 }
      );
    }

    // Step 2: Generate config for the inferred template
    const configResult = await generateText({
      model: toolsGenerationModel,
      output: Output.object({ schema: registration.aiConfigSchema }),
      prompt: buildPremiumToolPrompt({
        description,
        childContext,
        templateName: registration.meta.name,
        schemaNotes: registration.schemaPrompt,
      }),
    });

    if (!configResult.output) {
      return NextResponse.json(
        { error: "Config generation produced no output" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      templateType,
      configJson: JSON.stringify(configResult.output),
      suggestedTitle,
    });
  } catch (err) {
    console.error("[tools/infer-template] failed:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
