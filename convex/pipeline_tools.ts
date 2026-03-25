// convex/pipeline_tools.ts
"use node";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { anyApi } from "convex/server";
import { z } from "zod";

import { internal } from "./_generated/api";
import { ActionCtx } from "./_generated/server";

// Tool definitions using betaZodTool (integrates with toolRunner)
export function createPipelineTools(ctx: ActionCtx) {
  return {
    search_knowledge: betaZodTool({
      name: "search_knowledge",
      description: "Search the therapy knowledge base for ABA, speech therapy, and developmental milestone information",
      inputSchema: z.object({
        query: z.string().describe("Search query"),
        category: z.enum(["aba-terminology", "speech-therapy", "tool-patterns", "developmental-milestones", "iep-goals"]).optional(),
      }),
      run: async (input) => {
        const result = await ctx.runAction(internal.knowledge.search.searchKnowledgeAction, input);
        return result;
      },
    }),

    select_template: betaZodTool({
      name: "select_template",
      description: "Select the best therapy E2B template based on interaction model",
      inputSchema: z.object({
        interactionModel: z.string(),
        reinforcementType: z.string().optional(),
      }),
      run: async (input) => {
        // Rule-based: map interaction model → template
        const templateMap: Record<string, string> = {
          tap: "therapy-communication",
          drag: "therapy-schedule",
          sequence: "therapy-schedule",
          match: "therapy-academic",
          timer: "therapy-behavior",
          "free-form": "vite-therapy",
        };
        return templateMap[input.interactionModel] ?? "vite-therapy";
      },
    }),

    generate_image: betaZodTool({
      name: "generate_image",
      description: "Generate a therapy-appropriate illustration for picture cards",
      inputSchema: z.object({
        label: z.string(),
        category: z.string().optional(),
      }),
      run: async (input) => {
        return await ctx.runAction(anyApi.aiActions.generateImage, { label: input.label, category: input.category ?? "general" });
      },
    }),

    generate_speech: betaZodTool({
      name: "generate_speech",
      description: "Generate TTS audio for communication board labels",
      inputSchema: z.object({
        text: z.string(),
        voiceId: z.string().describe("ElevenLabs voice ID — required"),
      }),
      run: async (input) => {
        return await ctx.runAction(anyApi.aiActions.generateSpeech, { text: input.text, voiceId: input.voiceId });
      },
    }),
  };
}
