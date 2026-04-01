"use node";

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";

import { action } from "./_generated/server";
import { TEMPLATE_SCHEMA_DESCRIPTIONS } from "./lib/template_schema_descriptions";

const client = new Anthropic();

export const generateToolConfig = action({
  args: {
    templateType: v.string(),
    description: v.string(),
    childProfile: v.object({
      ageRange: v.optional(v.string()),
      interests: v.optional(v.array(v.string())),
      communicationLevel: v.optional(v.string()),
    }),
  },
  handler: async (_ctx, args): Promise<{ configJson: string; error?: string }> => {
    const schemaDescription = TEMPLATE_SCHEMA_DESCRIPTIONS[args.templateType];
    if (!schemaDescription) {
      return { configJson: "", error: `Unknown template type: ${args.templateType}` };
    }

    const childContext = [
      args.childProfile.ageRange && `Age range: ${args.childProfile.ageRange}`,
      args.childProfile.communicationLevel &&
        `Communication level: ${args.childProfile.communicationLevel}`,
      args.childProfile.interests?.length &&
        `Interests: ${args.childProfile.interests.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `You are helping a speech-language pathologist build a custom therapy tool for a child.

Child profile:
${childContext || "No child profile provided."}

SLP's description: ${args.description}

${schemaDescription}`;

    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      const rawText =
        message.content[0].type === "text" ? message.content[0].text.trim() : "";
      const jsonText = rawText.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
      JSON.parse(jsonText); // throws if invalid JSON — caught below
      return { configJson: jsonText };
    } catch (err) {
      console.error("[generateToolConfig]", err);
      return { configJson: "", error: "Failed to generate config. Please try again." };
    }
  },
});
