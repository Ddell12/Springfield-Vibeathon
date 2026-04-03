import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { generateText, Output } from "ai";
import { NextResponse } from "next/server";

import { generateConfigRequestSchema } from "@/features/tools/lib/ai/generation-schema";
import { toolsGenerationModel } from "@/features/tools/lib/ai/model";
import { buildPremiumToolPrompt } from "@/features/tools/lib/ai/premium-prompt";
import { templateRegistry } from "@/features/tools/lib/registry";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = await convexAuthNextjsToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = generateConfigRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid generation request" }, { status: 400 });
  }

  const { templateType, description, childProfile, generationProfile } = parsed.data;
  const registration = templateRegistry[templateType];

  if (!registration) {
    return NextResponse.json({ error: "Unknown template type" }, { status: 404 });
  }

  const childContext = [
    childProfile.ageRange && `Age range: ${childProfile.ageRange}`,
    childProfile.communicationLevel &&
      `Communication level: ${childProfile.communicationLevel}`,
    childProfile.interests?.length &&
      `Interests: ${childProfile.interests.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = await generateText({
      model: toolsGenerationModel,
      output: Output.object({ schema: registration.aiConfigSchema }),
      prompt: buildPremiumToolPrompt({
        description,
        childContext,
        templateName: registration.meta.name,
        schemaNotes: registration.schemaPrompt,
        generationProfile,
      }),
    });

    if (result.output == null) {
      return NextResponse.json({ error: "Generation produced no output" }, { status: 500 });
    }

    return NextResponse.json({ configJson: JSON.stringify(result.output) });
  } catch (err) {
    console.error("[tools/generate-config] generation failed:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
