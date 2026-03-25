// convex/pipeline.ts — Pipeline dispatcher + blueprint generation step
"use node";
import Anthropic from "@anthropic-ai/sdk";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createPipelineTools } from "./pipeline_tools";
import { BLUEPRINT_SYSTEM_PROMPT } from "./pipeline_prompts";
// NOTE: Importing from src/ into convex/ via relative path. Convex "use node" actions
// are bundled with esbuild which resolves this. If deployment fails, copy the schema
// into convex/ instead.
import { TherapyBlueprintSchema } from "../src/features/builder/lib/schemas/index";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const anthropic = new Anthropic(); // Uses ANTHROPIC_API_KEY env var

export const executeStep = internalAction({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.runQuery(internal.sessions.getInternal, { sessionId });
    if (!session) return;
    try {
      switch (session.state) {
        case "blueprinting":
          await generateBlueprint(ctx, sessionId, session);
          break;
        case "template_selecting":
          // Implemented in Task 7
          break;
        case "phase_generating":
          // Implemented in Task 7
          break;
        case "phase_implementing":
          // Implemented in Task 7
          break;
        case "deploying":
          // Implemented in Task 8
          break;
        case "validating":
          // Implemented in Task 8
          break;
        case "finalizing":
          // Implemented in Task 8
          break;
        case "reviewing":
          // Implemented in Task 8
          break;
        default:
          // idle, complete, failed — no-op
          break;
      }
    } catch (error) {
      await ctx.runMutation(internal.sessions.setFailed, {
        sessionId,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

async function generateBlueprint(
  ctx: ActionCtx,
  sessionId: Id<"sessions">,
  session: { query: string },
) {
  const tools = createPipelineTools(ctx);

  // Restore conversation context from previous interactions (e.g., blueprint revision)
  const contextDoc = await ctx.runQuery(internal.agent_context.get, { sessionId });
  const priorMessages: Anthropic.Beta.Messages.BetaMessageParam[] =
    contextDoc?.messages ?? [];

  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
    ...priorMessages,
    {
      role: "user" as const,
      content: `Build a therapy app: ${session.query}`,
    },
  ];

  // toolRunner automates: call model -> execute tools -> send results -> repeat
  const runner = anthropic.beta.messages.toolRunner({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: BLUEPRINT_SYSTEM_PROMPT,
    messages,
    tools: [tools.search_knowledge],
    max_iterations: 5, // Safety: prevent infinite loops
  });

  const finalMessage = await runner.runUntilDone();

  // Extract text content from the final message
  const textBlock = finalMessage.content.find(
    (block): block is Anthropic.Beta.Messages.BetaTextBlock =>
      block.type === "text",
  );
  if (!textBlock) {
    throw new Error("No text response from blueprint generation");
  }

  // Parse the JSON response — LLM may wrap in markdown code fences
  let jsonStr = textBlock.text.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const parsed = TherapyBlueprintSchema.safeParse(JSON.parse(jsonStr));
  if (!parsed.success) {
    throw new Error(`Blueprint validation failed: ${parsed.error.message}`);
  }

  const blueprint = parsed.data;

  // Generate markdown preview for the UI
  const markdownPreview = [
    `# ${blueprint.title}`,
    ``,
    `**Goal:** ${blueprint.therapyGoal}`,
    `**Skill:** ${blueprint.targetSkill}`,
    `**Ages:** ${blueprint.ageRange}`,
    `**Interaction:** ${blueprint.interactionModel}`,
    `**Reinforcement:** ${blueprint.reinforcementStrategy.type} — ${blueprint.reinforcementStrategy.description}`,
    ``,
    `## Phases`,
    ...blueprint.implementationRoadmap.map(
      (p, i) => `${i + 1}. **${p.phase}** — ${p.description}`,
    ),
  ].join("\n");

  // Save blueprint to Convex
  await ctx.runMutation(internal.blueprints.create, {
    sessionId,
    blueprint: parsed.data,
    markdownPreview,
  });

  // Save updated conversation context
  const updatedMessages: Anthropic.Beta.Messages.BetaMessageParam[] = [
    ...messages,
    { role: "assistant" as const, content: textBlock.text },
  ];
  await ctx.runMutation(internal.agent_context.save, {
    sessionId,
    messages: updatedMessages,
    tokenCount:
      (finalMessage.usage?.input_tokens ?? 0) +
      (finalMessage.usage?.output_tokens ?? 0),
  });

  // Add assistant message for chat display
  await ctx.runMutation(internal.messages.create, {
    sessionId,
    role: "assistant",
    content: markdownPreview,
    timestamp: Date.now(),
  });

  // State stays at "blueprinting" — awaits user approval
  // (blueprinting is NOT in AUTO_ADVANCE_STATES, so no auto-scheduling)
  await ctx.runMutation(internal.sessions.updateState, {
    sessionId,
    state: "blueprinting",
    stateMessage: "Blueprint ready for review",
  });
}
