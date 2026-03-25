// convex/pipeline.ts — Pipeline dispatcher + blueprint generation step
"use node";
import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";

// NOTE: Importing from src/ into convex/ via relative path. Convex "use node" actions
// are bundled with esbuild which resolves this. If deployment fails, copy the schema
// into convex/ instead.
import { PhaseConceptSchema, PhaseImplementationSchema,TherapyBlueprintSchema } from "../src/features/builder/lib/schemas/index";
import { api,internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { internalAction } from "./_generated/server";
import { connectOrRecreate, createAndDeploySandbox, getRuntimeErrors } from "./e2b";
import { BLUEPRINT_SYSTEM_PROMPT, PHASE_GENERATION_PROMPT, PHASE_IMPLEMENTATION_PROMPT, VALIDATION_PROMPT } from "./pipeline_prompts";
import { createPipelineTools } from "./pipeline_tools";

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
          await deployToSandbox(ctx, sessionId, session);
          break;
        case "validating":
          await validatePhase(ctx, sessionId, session);
          break;
        case "finalizing":
          await finalize(ctx, sessionId, session);
          break;
        case "reviewing":
          await review(ctx, sessionId, session);
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
  const priorMessages: Anthropic.MessageParam[] =
    contextDoc?.messages ?? [];

  const messages: Anthropic.MessageParam[] = [
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
  const updatedMessages: Anthropic.MessageParam[] = [
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
  const priorMessages: Anthropic.MessageParam[] = contextDoc?.messages ?? [];

  const userPrompt = `Plan phase ${session.currentPhaseIndex + 1} for this therapy app.

Blueprint: ${JSON.stringify(blueprint.blueprint)}

Current files in the project:
${fileContext || "(no files yet — this is the first phase)"}

Design the next phase as a deployable milestone.`;

  const messages: Anthropic.MessageParam[] = [
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

async function deployToSandbox(
  ctx: ActionCtx,
  sessionId: Id<"sessions">,
  session: {
    sandboxId?: string;
    previewUrl?: string;
    templateName?: string;
    currentPhaseIndex: number;
  },
) {
  const files = await ctx.runQuery(api.generated_files.list, { sessionId });
  const phase = await ctx.runQuery(api.phases.get, {
    sessionId,
    index: session.currentPhaseIndex,
  });

  const filePayload = files.map((f: { path: string; contents: string }) => ({
    filePath: f.path,
    fileContents: f.contents,
  }));
  const commands = (phase as { installCommands?: string[] })?.installCommands ?? [];

  let sandboxId: string;
  let previewUrl: string;

  if (session.sandboxId) {
    // Existing sandbox — reconnect or recreate if expired
    const result = await connectOrRecreate(
      session.sandboxId,
      session.templateName ?? "vite-therapy",
      filePayload,
      commands,
    );
    sandboxId = result.sandboxId;
    previewUrl = result.previewUrl;
  } else {
    // First deploy — create new sandbox
    const result = await createAndDeploySandbox(
      session.templateName ?? "vite-therapy",
      filePayload,
      commands,
    );
    sandboxId = result.sandboxId;
    previewUrl = result.previewUrl;
  }

  // Save sandbox info to session
  await ctx.runMutation(internal.sessions.setSandbox, {
    sessionId,
    sandboxId,
    previewUrl,
  });

  // Update phase status
  if (phase) {
    await ctx.runMutation(internal.phases.updateStatus, {
      phaseId: (phase as { _id: Id<"phases"> })._id,
      status: "deploying",
    });
  }

  // Advance to validation
  await ctx.runMutation(internal.sessions.updateState, {
    sessionId,
    state: "validating",
    stateMessage: "Checking for runtime errors...",
  });
}

async function validatePhase(
  ctx: ActionCtx,
  sessionId: Id<"sessions">,
  session: {
    sandboxId?: string;
    currentPhaseIndex: number;
    phasesRemaining: number;
    mvpGenerated: boolean;
  },
) {
  if (!session.sandboxId) throw new Error("No sandbox to validate");

  const errors = await getRuntimeErrors(session.sandboxId);
  const phase = await ctx.runQuery(api.phases.get, {
    sessionId,
    index: session.currentPhaseIndex,
  });

  if (errors.length > 0 && phase) {
    // Check fix attempt count (stored in phase.errors)
    const existingErrors = (phase as { errors?: string[] }).errors ?? [];
    const fixAttempts = existingErrors.length > 0 ? 1 : 0;

    if (fixAttempts < 2) {
      // Record errors and try to auto-fix
      await ctx.runMutation(internal.phases.updateStatus, {
        phaseId: (phase as { _id: Id<"phases"> })._id,
        status: "validating",
        errors: [...existingErrors, ...errors],
      });

      // Call Anthropic to fix broken files
      const existingFiles = await ctx.runQuery(api.generated_files.list, {
        sessionId,
      });
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: VALIDATION_PROMPT,
        messages: [
          {
            role: "user" as const,
            content: `Runtime errors:\n${errors.join("\n")}\n\nCurrent files:\n${existingFiles.map((f: { path: string; contents: string }) => `${f.path}:\n${f.contents}`).join("\n---\n")}`,
          },
        ],
      });

      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text",
      );
      if (textBlock) {
        let jsonStr = textBlock.text.trim();
        const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) jsonStr = fenceMatch[1].trim();

        try {
          const parsed = PhaseImplementationSchema.safeParse(
            JSON.parse(jsonStr),
          );
          if (parsed.success) {
            for (const file of parsed.data.files) {
              await ctx.runMutation(internal.generated_files.upsert, {
                sessionId,
                phaseId: (phase as { _id: Id<"phases"> })._id,
                path: file.filePath,
                contents: file.fileContents,
                purpose: file.filePurpose,
                status: "modified",
              });
            }
          }
        } catch {
          // If fix parsing fails, continue with current state
        }
      }

      // Redeploy
      await ctx.runMutation(internal.sessions.updateState, {
        sessionId,
        state: "deploying",
        stateMessage: `Fix attempt ${fixAttempts + 1} — redeploying...`,
      });
      return;
    }
    // Max fix attempts reached — mark as completed with warnings
  }

  // Phase is clean (or max attempts reached) — mark completed
  if (phase) {
    await ctx.runMutation(internal.phases.updateStatus, {
      phaseId: (phase as { _id: Id<"phases"> })._id,
      status: "completed",
    });
  }

  // Create version snapshot
  await createVersionSnapshot(ctx, sessionId, session.currentPhaseIndex);

  // Decrement phases remaining, advance phase index
  const newPhasesRemaining = session.phasesRemaining - 1;
  const nextPhaseIndex = session.currentPhaseIndex + 1;

  await ctx.runMutation(internal.sessions.advancePhase, {
    sessionId,
    currentPhaseIndex: nextPhaseIndex,
    phasesRemaining: newPhasesRemaining,
  });

  // Decide next state
  if (newPhasesRemaining <= 0) {
    // No phases left — finalize
    await ctx.runMutation(internal.sessions.updateState, {
      sessionId,
      state: "finalizing",
      stateMessage: "Finalizing app...",
    });
  } else {
    // More phases — generate next
    await ctx.runMutation(internal.sessions.updateState, {
      sessionId,
      state: "phase_generating",
      stateMessage: `Planning phase ${nextPhaseIndex + 1}...`,
    });
  }
}

async function createVersionSnapshot(
  ctx: ActionCtx,
  sessionId: Id<"sessions">,
  phaseIndex: number,
) {
  const files = await ctx.runQuery(api.generated_files.list, { sessionId });
  const latestVersion = await ctx.runQuery(api.versions.getLatest, {
    sessionId,
  });

  const previousVersion =
    (latestVersion as { version?: number } | null)?.version ?? 0;
  const newVersion = previousVersion + 1;

  // Compute diff — files not in prior snapshot are "added", otherwise "modified"
  const previousPaths = new Set(
    ((latestVersion as { diff?: { path: string }[] } | null)?.diff ?? []).map(
      (d) => d.path,
    ),
  );
  const diff = files.map((f: { path: string }) => ({
    path: f.path,
    action: previousPaths.has(f.path)
      ? ("modified" as const)
      : ("added" as const),
  }));

  await ctx.runMutation(internal.versions.create, {
    sessionId,
    version: newVersion,
    trigger: "phase_complete",
    fileRefs: files.map((f: { _id: Id<"files"> }) => f._id),
    diff,
    phaseIndex,
    fileCount: files.length,
    timestamp: Date.now(),
  });
}

async function finalize(
  ctx: ActionCtx,
  sessionId: Id<"sessions">,
  _session: { mvpGenerated: boolean },
) {
  // Mark MVP as generated
  await ctx.runMutation(internal.sessions.setMvpGenerated, { sessionId });

  // Add completion message
  await ctx.runMutation(internal.messages.create, {
    sessionId,
    role: "assistant",
    content:
      "Your therapy app is ready! You can try it in the preview panel. Tell me if you'd like any changes.",
    timestamp: Date.now(),
  });

  // Move to review
  await ctx.runMutation(internal.sessions.updateState, {
    sessionId,
    state: "reviewing",
    stateMessage: "Running final review...",
  });
}

async function review(
  ctx: ActionCtx,
  sessionId: Id<"sessions">,
  session: { sandboxId?: string },
) {
  // Final error check
  if (session.sandboxId) {
    const errors = await getRuntimeErrors(session.sandboxId);
    if (errors.length > 0) {
      // One more fix attempt
      await ctx.runMutation(internal.sessions.updateState, {
        sessionId,
        state: "validating",
        stateMessage: "Found issues in final review — fixing...",
      });
      return;
    }
  }

  // Clean — mark complete
  await ctx.runMutation(internal.sessions.updateState, {
    sessionId,
    state: "complete",
    stateMessage: "App complete!",
  });
}
