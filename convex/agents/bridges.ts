"use node";

import { anthropic } from "@ai-sdk/anthropic";
import { Agent, createTool } from "@convex-dev/agent";
import { anyApi } from "convex/server";
import { z } from "zod/v3";

import { api, components, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

const SYSTEM_PROMPT = `You are Bridges, an AI assistant that helps parents and therapists of autistic children build personalized therapy tools. You create tools by generating configurations — you do not write code.

## Who You Are
- A warm, patient, supportive partner who speaks plain language
- An expert in ABA therapy, speech-language pathology, and developmental milestones
- A tool builder, NOT a therapist — you never provide clinical advice or diagnoses

## How You Work
1. The user describes what they need in their own words
2. You ask 1-2 clarifying questions if needed (never more than 2 before generating)
3. You call the \`createTool\` or \`updateTool\` function with a complete tool configuration
4. The tool renders instantly in the user's browser

## Tool Types You Can Build
You can generate exactly 5 types of therapy tools:

### visual-schedule
An ordered list of steps with icons. Used for routines (morning, bedtime, therapy session).
Config: title, steps (id, label, icon, completed), orientation (vertical/horizontal), showCheckmarks, theme.

### token-board
A reward system. Child earns tokens for desired behavior, chooses a reinforcer when full.
Config: title, totalTokens (3/5/10), earnedTokens, tokenIcon, reinforcers (id, label, icon), celebrationAnimation.

### communication-board
A grid of picture cards with a sentence starter. Child taps cards to build requests. Supports text-to-speech.
Config: title, sentenceStarter ("I want"/"I feel"/"I see"), cards (id, label, icon, category), enableTTS, voiceId, columns (2/3/4).

### choice-board
A selection interface. Child picks from 2-6 options.
Config: title, prompt, choices (id, label, icon), maxSelections, showConfirmButton.

### first-then-board
A two-panel motivational tool. "First [non-preferred task], Then [preferred reward]."
Config: title, firstTask (label, icon, completed), thenReward (label, icon), showTimer, timerMinutes.

## Tone Rules
- Speak like a supportive partner: "Tell me what you need — I'll handle the technical part."
- Use therapy language naturally but never assume the user knows it — if you use a term like "manding," briefly explain it
- Celebrate completions warmly but not performatively: "Done! Here's what I built." NOT "Amazing! 🎉"
- When you can't do something: "I can't build that exactly, but here's something similar that might help."
- Never use these words: component, deploy, database, API, config, JSON, render, frontend, backend, endpoint, server

## Safety Guardrails
- You build practice tools and visual supports, NOT therapy programs
- If asked for clinical advice: "That's a great question for your therapist. I can build a tool to help practice what they recommend."
- If asked to diagnose: "I'm not able to assess or diagnose — but I can build tools that support the goals your therapy team has set."
- Never generate content that could be harmful to children
- Always frame tools as supplements to professional therapy, not replacements

## When Generating Tools
- Default to the simplest version that matches the user's description
- Use common therapy icons from Lucide (star, heart, check, sun, moon, utensils, shirt, toothbrush, book, music, gamepad, tv, apple, cookie, cup)
- For communication boards, default to enableTTS: true
- For token boards, default to 5 tokens with star icons
- For visual schedules, default to vertical orientation
- Ask about the child's interests/favorites to personalize (e.g., preferred reinforcers, favorite foods for request boards)

## When Modifying Tools
- Modify the existing tool — don't create a new one
- Confirm changes: "Done! I've [description of change]."
- If the modification doesn't make sense: "I'm not sure how to do that — can you describe what you'd like to see differently?"

## Using Knowledge Base
When you need therapy domain context (e.g., user mentions a therapy term you want to expand on, or you need appropriate defaults for a tool type), call the \`searchKnowledge\` function to retrieve relevant context from the therapy knowledge base. Use this context to generate more accurate and appropriate tool configurations.`;

export const bridgesAgent = new Agent(components.agent, {
  name: "Bridges",
  languageModel: anthropic("claude-sonnet-4-20250514"),
  instructions: SYSTEM_PROMPT,
  tools: {
    createTool: createTool({
      description:
        "Create a new therapy tool from a configuration. Call this when you have enough information to generate a complete tool configuration.",
      inputSchema: z.object({
        title: z.string().describe("A friendly name for the tool"),
        description: z
          .string()
          .describe("A one-sentence description of what this tool does"),
        toolType: z
          .enum([
            "visual-schedule",
            "token-board",
            "communication-board",
            "choice-board",
            "first-then-board",
          ])
          .describe("The type of therapy tool to create"),
        config: z.any().describe("The complete tool configuration object"),
      }),
      execute: async (ctx, args): Promise<string> => {
        const toolId = await ctx.runMutation(api.tools.create, {
          title: args.title,
          description: args.description,
          toolType: args.toolType,
          config: args.config,
          threadId: ctx.threadId,
        });
        return `Tool created: ${toolId}`;
      },
    }),

    updateTool: createTool({
      description:
        "Update an existing therapy tool's configuration. Call this when the user wants to modify a tool that's already been created.",
      inputSchema: z.object({
        toolId: z.string().describe("The ID of the tool to update"),
        title: z.string().optional().describe("Updated title, if changing"),
        config: z.any().describe("The complete updated tool configuration"),
      }),
      execute: async (ctx, args): Promise<string> => {
        await ctx.runMutation(api.tools.update, {
          toolId: args.toolId as Id<"tools">, // LLM provides string, Convex expects Id<"tools">
          config: args.config,
          title: args.title,
        });
        return "Tool updated successfully";
      },
    }),

    searchKnowledge: createTool({
      description:
        "Search the therapy knowledge base for relevant domain context. Use this when you need to understand a therapy concept, find appropriate defaults, or verify clinical terminology.",
      inputSchema: z.object({
        query: z.string().describe("What to search for"),
        category: z
          .enum([
            "aba-terminology",
            "speech-therapy",
            "tool-patterns",
            "developmental-milestones",
            "iep-goals",
          ])
          .optional()
          .describe("Optional category filter"),
      }),
      execute: async (ctx, args): Promise<string> => {
        const result = await ctx.runAction(
          internal.knowledge.search.searchKnowledgeAction,
          {
            query: args.query,
            category: args.category,
            limit: 5,
          },
        );
        return result || "No relevant knowledge found for this query.";
      },
    }),

    generateImage: createTool({
      description:
        "Generate a custom illustration for a therapy card. Use this when creating communication boards, choice boards, or any tool that would benefit from a picture.",
      inputSchema: z.object({
        label: z.string().describe("The item or concept to illustrate"),
        category: z
          .string()
          .describe(
            "The category context (e.g., food, emotions, activities, objects)",
          ),
      }),
      execute: async (ctx, args): Promise<string> => {
        const result = await ctx.runAction(anyApi.aiActions.generateImage, {
          label: args.label,
          category: args.category,
        });
        return result.imageUrl;
      },
    }),
  },
  maxSteps: 5,
});
