// convex/pipeline.ts — Pipeline dispatcher + blueprint generation step
"use node";
import Anthropic from "@anthropic-ai/sdk";
import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";
import { createPipelineTools } from "./pipeline_tools";
import { BLUEPRINT_SYSTEM_PROMPT, PHASE_GENERATION_PROMPT, PHASE_IMPLEMENTATION_PROMPT } from "./pipeline_prompts";
// NOTE: Importing from src/ into convex/ via relative path. Convex "use node" actions
// are bundled with esbuild which resolves this. If deployment fails, copy the schema
// into convex/ instead.
import { TherapyBlueprintSchema, PhaseConceptSchema, PhaseImplementationSchema } from "../src/features/builder/lib/schemas/index";
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
          await selectTemplate(ctx, sessionId, session);
          break;
        case "phase_generating":
          await generatePhase(ctx, sessionId, session);
          break;
        case "phase_implementing":
          await implementPhase(ctx, sessionId, session);
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

async function selectTemplate(
  ctx: ActionCtx,
  sessionId: Id<"sessions">,
  _session: Record<string, unknown>,
) {
  // Get the approved blueprint
  const blueprint = await ctx.runQuery(api.blueprints.getBySession, { sessionId });
  if (!blueprint || !blueprint.approved) {
    throw new Error("No approved blueprint found");
  }

  // Rule-based template selection based on interactionModel
  const templateMap: Record<string, string> = {
    tap: "therapy-communication",
    drag: "therapy-schedule",
    sequence: "therapy-schedule",
    match: "therapy-academic",
    timer: "therapy-behavior",
    "free-form": "vite-therapy",
  };

  const interactionModel = (blueprint.blueprint as { interactionModel?: string })?.interactionModel ?? "free-form";
  const _selectedTemplate = templateMap[interactionModel] ?? "vite-therapy";

  // For now, all templates resolve to vite-therapy (only one registered)
  const resolvedTemplate = "vite-therapy";

  // Persist the template name on the session
  await ctx.runMutation(internal.sessions.setTemplate, {
    sessionId,
    templateName: resolvedTemplate,
  });

  // Advance to phase generation
  await ctx.runMutation(internal.sessions.updateState, {
    sessionId,
    state: "phase_generating",
    stateMessage: `Selected template: ${resolvedTemplate}`,
  });
}

async function generatePhase(
  ctx: ActionCtx,
  sessionId: Id<"sessions">,
  session: { currentPhaseIndex: number; phasesRemaining: number },
) {
  // Get blueprint for context
  const blueprint = await ctx.runQuery(api.blueprints.getBySession, { sessionId });
  if (!blueprint) throw new Error("No blueprint found");

  // Get current files for codebase context
  const existingFiles = await ctx.runQuery(api.generated_files.list, { sessionId });
  const fileContext = existingFiles.map((f: { path: string; purpose: string }) => `- ${f.path}: ${f.purpose}`).join("\n");

  // Get conversation context
  const contextDoc = await ctx.runQuery(internal.agent_context.get, { sessionId });
  const priorMessages: Anthropic.Beta.Messages.BetaMessageParam[] = contextDoc?.messages ?? [];

  const userPrompt = `Plan phase ${session.currentPhaseIndex + 1} for this therapy app.

Blueprint: ${JSON.stringify(blueprint.blueprint)}

Current files in the project:
${fileContext || "(no files yet — this is the first phase)"}

Design the next phase as a deployable milestone.`;

  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
    ...priorMessages,
    { role: "user" as const, content: userPrompt },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: PHASE_GENERATION_PROMPT,
    messages,
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );
  if (!textBlock) throw new Error("No text response from phase generation");

  // Parse JSON — strip markdown code fences if present
  let jsonStr = textBlock.text.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  const parsed = PhaseConceptSchema.safeParse(JSON.parse(jsonStr));
  if (!parsed.success) {
    throw new Error(`Phase concept validation failed: ${parsed.error.message}`);
  }

  const phaseConcept = parsed.data;

  // Create phase document
  await ctx.runMutation(internal.phases.create, {
    sessionId,
    index: session.currentPhaseIndex,
    name: phaseConcept.name,
    description: phaseConcept.description,
    files: phaseConcept.files.map((f: { path: string; purpose: string }) => ({
      path: f.path,
      purpose: f.purpose,
      status: "pending" as const,
    })),
    installCommands: phaseConcept.installCommands,
  });

  // Save updated conversation context
  await ctx.runMutation(internal.agent_context.save, {
    sessionId,
    messages: [...messages, { role: "assistant" as const, content: textBlock.text }],
    tokenCount: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
  });

  // Add status message for chat display
  await ctx.runMutation(internal.messages.create, {
    sessionId,
    role: "system",
    content: `Phase ${session.currentPhaseIndex + 1}: ${phaseConcept.name} — ${phaseConcept.description}`,
    timestamp: Date.now(),
  });

  // Advance to implementation
  await ctx.runMutation(internal.sessions.updateState, {
    sessionId,
    state: "phase_implementing",
    stateMessage: `Implementing phase: ${phaseConcept.name}`,
  });
}

async function implementPhase(
  ctx: ActionCtx,
  sessionId: Id<"sessions">,
  session: { currentPhaseIndex: number },
) {
  // Get the phase we're implementing
  const phase = await ctx.runQuery(api.phases.get, {
    sessionId,
    index: session.currentPhaseIndex,
  });
  if (!phase) throw new Error("No phase found for current index");

  // Get blueprint for context
  const blueprint = await ctx.runQuery(api.blueprints.getBySession, { sessionId });

  // Get existing files for context
  const existingFiles = await ctx.runQuery(api.generated_files.list, { sessionId });
  const existingFileList = existingFiles
    .map((f: { path: string; contents: string }) => `${f.path}:\n${f.contents}`)
    .join("\n---\n");

  const userPrompt = `Implement this phase:

Phase: ${phase.name} — ${phase.description}

Files to create/modify:
${phase.files.map((f: { path: string; purpose: string }) => `- ${f.path}: ${f.purpose}`).join("\n")}

Install commands: ${phase.installCommands.join(", ") || "none"}

Blueprint context: ${JSON.stringify(blueprint?.blueprint)}

${existingFiles.length > 0 ? `Existing project files:\n${existingFileList}` : "This is the first phase — no existing files."}

Generate complete file contents for each file.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: PHASE_IMPLEMENTATION_PROMPT,
    messages: [{ role: "user" as const, content: userPrompt }],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );
  if (!textBlock) throw new Error("No text response from phase implementation");

  // Parse JSON — strip markdown code fences if present
  let jsonStr = textBlock.text.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  const parsed = PhaseImplementationSchema.safeParse(JSON.parse(jsonStr));
  if (!parsed.success) {
    throw new Error(`Phase implementation validation failed: ${parsed.error.message}`);
  }

  const implementation = parsed.data;

  // Write files to generated_files table
  for (const file of implementation.files) {
    await ctx.runMutation(internal.generated_files.upsert, {
      sessionId,
      phaseId: phase._id,
      path: file.filePath,
      contents: file.fileContents,
      purpose: file.filePurpose,
      status: "generated",
    });
  }

  // Update phase status
  await ctx.runMutation(internal.phases.updateStatus, {
    phaseId: phase._id,
    status: "implementing",
  });

  // Save conversation context (implementation prompts are not accumulated — they're large
  // and self-contained, so we don't append to the prior conversation thread)
  await ctx.runMutation(internal.agent_context.save, {
    sessionId,
    messages: [
      { role: "user" as const, content: userPrompt },
      { role: "assistant" as const, content: textBlock.text },
    ],
    tokenCount: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
  });

  // Advance to deployment
  await ctx.runMutation(internal.sessions.updateState, {
    sessionId,
    state: "deploying",
    stateMessage: `Deploying phase: ${phase.name}`,
  });
}
