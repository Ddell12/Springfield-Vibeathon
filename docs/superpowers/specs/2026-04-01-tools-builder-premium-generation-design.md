# Tools Builder Premium Generation Design

Date: 2026-04-01
Status: Approved for planning
Owner: Codex

## Summary

Upgrade the tools builder so it produces premium therapy apps by default instead of basic config renders. The new design raises output quality through a layered generation stack:

- a stronger generation brief and richer blueprint/config contract
- a more capable runtime and component scaffold for generated apps
- a voice layer that prefers ElevenLabs instead of defaulting to weak browser TTS

This work also includes two related experience fixes that belong in the same surface:

- therapists can create an app without selecting a patient up front
- fullscreen and published/deployed app modes always provide a clear exit affordance

## Problem

The current tools builder is under-delivering in three ways:

1. Generated apps feel visually flat and interaction-light.
2. Speech inside generated apps sounds low quality and unreliable.
3. Core builder/runtime UX still assumes a narrower workflow than users need, especially around patient selection and immersive views.

The result is that the builder can create working apps, but not consistently advanced, beautiful, therapy-grade apps that feel production-ready in sessions with children and caregivers.

## Goals

- Raise the minimum quality bar for generated apps across layout, hierarchy, interactivity, and polish.
- Make premium therapy usability the default, without sacrificing clinician control.
- Use ElevenLabs as the primary TTS provider for generated apps.
- Let users create apps without attaching them to a patient at creation time.
- Ensure fullscreen and published/deployed app experiences always offer an obvious way out.

## Non-Goals

- Rebuild the entire legacy builder pipeline outside the tools feature.
- Add a public marketplace or sharing redesign as part of this work.
- Create a custom per-app design review workflow before every generation.
- Guarantee fully unique visual systems for every generated app. The goal is a much higher floor, not infinite stylistic freedom.

## User Outcomes

### Therapists

- Can create a reusable therapy app before deciding which patient should use it.
- Get apps that feel session-ready, not like rough prototypes.
- Can safely enter and leave immersive/fullscreen modes without being trapped.

### Caregivers and children

- Experience more polished, clearer, and more engaging activities.
- Hear better speech output with more natural pacing and quality.
- Benefit from more consistent app behavior across different generated app types.

## Recommended Approach

Use a layered upgrade rather than a prompt-only or scaffold-only change.

### Why not prompt-only

Prompt changes can improve output quality quickly, but they still rely on a limited scaffold and weak runtime primitives. That would continue to produce uneven results.

### Why not scaffold-only

A richer scaffold helps consistency, but without stronger generation instructions and quality checks it can still produce generic apps that misuse the available primitives.

### Recommended architecture

Upgrade three layers together:

1. Generation layer: stronger system rules, richer blueprint contract, anti-basic quality requirements.
2. Runtime layer: shared premium therapy primitives and host capabilities.
3. Voice/media layer: ElevenLabs-first speech interface with graceful fallback behavior.

This combination raises the floor and improves consistency without flattening all apps into the same template.

## Architecture

### 1. Premium Therapy App Contract

Generated apps should target a shared contract instead of a thin config renderer. The contract defines the minimum quality and capability expectations for every generated app.

It should encode:

- visual expectations: warm-professional styling, strong typography hierarchy, tonal separation, deliberate motion, and layered layouts
- interaction expectations: guided flows, progress cues, reward loops, reinforcement moments, and reusable activity controls
- content expectations: clinician-appropriate copy, child-friendly prompts, and fewer generic placeholders
- media expectations: high-quality speech, loading states, replay, cancellation, and failure handling

This contract is not meant to force identical layouts. It defines the baseline sophistication level and supported capability surface.

### 2. Generation Layer

The tools builder generation prompt and blueprint/config structure should become more opinionated by default.

Required changes:

- The builder should assume the user wants a premium app unless the prompt explicitly asks for minimalism.
- Generation instructions should explicitly reject flat card-only layouts, generic placeholder copy, weak reward loops, and browser speech synthesis as the primary TTS path.
- The blueprint/config should capture visual ambition, interaction depth, voice needs, and session mode requirements up front.
- The generation loop should be able to request richer app states, not just a static main screen.

The generation prompt should instruct the model to produce:

- strong first-load states
- active/inactive/complete/error states
- better transitions between tasks
- meaningful reinforcement surfaces
- layout variation and stronger information hierarchy

### 3. Runtime Layer

Generated apps should rely on a richer shared runtime inside the tools feature rather than embedding ad hoc implementations.

The runtime should provide shared primitives for:

- progress rails and step indicators
- prompt cards and guided sequences
- reward and celebration surfaces with motion-safe defaults
- timers, attempt states, streaks, and repeat/retry actions
- host bridge actions for fullscreen and close/exit handling

This allows the model to assemble advanced apps from reliable building blocks instead of reinventing critical interaction logic on every generation.

### 4. Voice Layer

Generated apps should target a shared voice service abstraction rather than directly wiring browser speech APIs.

The abstraction should support:

- ElevenLabs as the primary provider
- provider-aware loading and playback state
- request caching and replay
- cancellation and overlap prevention
- failure UI and fallback behavior

Default behavior:

- If ElevenLabs credentials and quota are available, generated apps should use ElevenLabs.
- If ElevenLabs is unavailable, the runtime may fall back to a cheaper or native option, but fallback is not the design center.

The builder should be able to generate voice requests in product terms such as instruction, reinforcement, prompt replay, or modeled phrase, while the runtime handles provider details.

## Builder Experience

### Patient-optional creation

The builder must allow app creation without selecting a patient. Patient selection should become optional metadata or an attach-later step.

Behavior:

- Users can start and save an app with no patient assigned.
- If a patient context is present, the builder can still prefill it.
- If a workflow later benefits from assignment, the UI can offer attach-to-patient as a secondary action rather than a hard gate.

This supports reusable materials, demo apps, family-neutral activities, and clinician experimentation.

### Builder quality guidance

The builder should enrich user prompts before generation so the system has enough structure to avoid low-quality output.

The config or blueprint should include fields such as:

- target user and setting
- activity format
- desired interaction richness
- speech usage and voice moments
- reinforcement style
- accessibility or sensory constraints

These do not all need to be exposed as heavy UI. They can be inferred, assisted, or defaulted where appropriate.

## Runtime Experience

### Fullscreen and published/deployed escape hatch

Fullscreen and published/deployed views must always provide a host-level exit control. This should not depend on whether the generated app remembered to include one.

Requirements:

- visible in preview fullscreen mode
- visible in published/deployed mode
- visually quiet but consistently discoverable
- usable on desktop and tablet/touch contexts
- remains available in immersive or child-facing states

The control should be implemented by the host shell around the app runtime, not reimplemented per generated app.

## Quality Guardrails

The builder should include explicit anti-basic checks before accepting generated output as complete.

Examples of guardrails:

- reject outputs that only render a single flat card stack when the requested concept implies progression or interaction
- flag apps that use generic placeholder text or weak visual hierarchy
- flag speech-heavy apps that do not use the shared voice abstraction
- flag apps missing loading, empty, error, or completion states when those states are relevant
- require motion-safe reinforcement instead of loud or chaotic celebration behavior

These checks may begin as lightweight heuristics and fixture tests rather than fully automated design scoring.

## Testing Strategy

### Builder tests

- patient-optional creation flow
- blueprint/config enrichment behavior
- generation input formation for premium defaults

### Runtime tests

- fullscreen exit control visibility and behavior
- published/deployed exit control behavior
- voice playback, replay, cancellation, and fallback handling

### Output contract tests

- representative generated app fixtures validate premium state coverage
- speech-centric fixtures validate use of the shared voice interface
- prompt/contract tests validate that premium defaults remain encoded in generation inputs

## Risks

### Risk: outputs become too templated

Mitigation: define strong primitives and baseline rules, but leave layout and content composition flexible.

### Risk: ElevenLabs cost or quota issues degrade reliability

Mitigation: make ElevenLabs the preferred path, but keep fallback behavior explicit and graceful.

### Risk: more opinionated defaults reduce prompt fidelity

Mitigation: allow explicit prompt intent to override premium defaults when the user clearly asks for something simpler or more constrained.

### Risk: scope grows into a full builder rewrite

Mitigation: keep the work centered in `src/features/tools` and shared runtime contracts used by generated apps, not a full system-wide rebuild.

## Open Decisions Resolved In This Design

- Premium output should optimize for both therapy-grade usability and consumer-app quality, with therapy usability winning in case of tension.
- TTS should default to ElevenLabs first, with fallback only when unavailable.
- The builder should become more opinionated by default instead of adding a separate premium toggle first.
- The layered approach is preferred over prompt-only or scaffold-only changes.

## Implementation Shape For Planning

The implementation plan should likely break this into slices:

1. Generation contract and prompt upgrades
2. Shared runtime and voice abstraction upgrades
3. Builder UX updates for patient-optional creation
4. Host-shell fullscreen and published exit controls
5. Tests and fixture-based quality checks

This remains one coherent project because all five slices serve the same product goal: premium generated therapy apps with reliable runtime behavior.
