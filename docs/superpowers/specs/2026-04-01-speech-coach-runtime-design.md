# Speech Coach Runtime Redesign

Date: 2026-04-01
Status: Approved design
Scope: Speech Coach template system, runtime architecture, configuration model, and migration path

## Objective

Redesign the Speech Coach feature so SLPs can easily customize and reuse AI speech coach configurations while the product still ships with a strong, clinically sensible base coach.

The redesigned system should let an SLP:

- switch voice easily
- change prompt behavior safely
- enable or disable approved tools and skills
- attach reusable knowledge context
- save named reusable coach templates
- apply a template to many children with small child-specific overrides

The redesigned system should also ensure that every live session still inherits a code-owned baseline for safety, pacing, session structure, and speech-coach behavior.

## Product Decision Summary

The approved product direction is:

- Reusable coach templates are the primary customization model
- Templates are full runtime profiles, not just prompt presets
- Templates live in a dedicated SLP-facing template library
- Knowledge in V1 includes built-in knowledge packs plus SLP-authored notes/snippets
- Tools and skills are configured through toggle-based capability panels
- The live speech runtime uses LiveKit Agents SDK, not Vercel AI SDK
- Gemini Live is the live reasoning model inside the runtime
- ElevenLabs remains available for selectable coach voices
- Vercel AI SDK is used for surrounding non-realtime workflows, not as the live runtime layer

## Why LiveKit Over Vercel AI SDK

The runtime recommendation changed after source-backed research.

LiveKit Agents SDK is the recommended runtime layer because it is built for realtime voice agents. It provides a session-oriented runtime model for realtime media, turn-taking, interruptions, transport, and live agent orchestration. It also has official Gemini Live integration support.

Vercel AI SDK remains valuable in this project, but it fits better around the runtime than inside it. It is better suited to app-side orchestration, structured generation, admin helpers, and offline workflows than to the low-latency voice session runtime itself.

Operational recommendation:

- LiveKit Agents SDK: live voice runtime
- Gemini Live: live reasoning
- ElevenLabs: voice selection when needed
- Vercel AI SDK: template authoring helpers, summaries, admin tooling, and non-realtime agent workflows

## System Shape

The redesigned Speech Coach has three layers:

### 1. Base Runtime Profile

This is code-owned and not fully editable from the UI.

It defines the non-negotiable behavior that every coach session gets:

- child-safe language and conduct
- session opening and closeout structure
- speech practice loop and pacing framework
- retry and correction boundaries
- frustration handling floor
- transcript and summary behavior
- safety rules around diagnosis, medical advice, and clinical overreach

This layer is the product’s canonical definition of “what an AI speech coach should always do.”

### 2. SLP Template

This is the main reusable unit.

An SLP template contains:

- template metadata: name, description, intended use, tags, status
- voice configuration
- prompt layers
- enabled tools and tool settings
- enabled skills and skill settings
- attached knowledge packs
- SLP-authored notes/snippets
- session defaults

Templates extend the base runtime but do not replace it.

### 3. Child Override

This is a lighter layer used when a child needs personalization on top of a template.

Child overrides contain:

- assigned template reference
- target sounds and session defaults
- preferred and avoided themes
- child-specific notes
- optional additive prompt addendum
- limited safe overrides

The final runtime contract is resolved in this order:

`base runtime -> SLP template -> child override -> live session`

## Runtime Architecture

### Recommended split

- LiveKit Agents SDK owns the realtime session runtime
- Gemini Live handles live reasoning during the session
- The app resolves configuration, permissions, safety rules, and template state
- ElevenLabs provides coach voice options when enabled
- Vercel AI SDK supports non-realtime authoring and analysis workflows

### Runtime responsibilities

#### LiveKit runtime

Responsible for:

- live session transport
- audio session lifecycle
- turn-taking
- interruption handling
- tool-call execution flow inside the runtime session
- reliable realtime session state

#### Gemini Live

Responsible for:

- deciding what the coach says next
- adapting prompts based on child behavior and current turn context
- following the resolved prompt stack
- invoking allowed tools through the app-owned registry

#### App-owned orchestration

Responsible for:

- resolving the final session configuration
- enforcing safety and permission boundaries
- selecting approved tools, skills, and knowledge
- validating template integrity before launch
- storing runtime snapshots and session history

#### ElevenLabs

Responsible for:

- voice identity where custom coach voices matter
- configurable SLP-facing voice choices

### Non-goal

Templates do not pick arbitrary runtime architectures. The product should not allow every template to become a separate bespoke agent system.

## Template Library UX

### Main surfaces

The redesign introduces two SLP-facing surfaces.

#### 1. Speech Coach Template Library

This is the reusable library surface for SLPs.

Core capabilities:

- browse templates
- create template
- duplicate template
- archive template
- preview template
- apply template to child

List row/card metadata:

- template name
- short description
- voice
- clinical focus
- key enabled tools/skills/knowledge badges
- last updated timestamp
- active/draft/archived status

#### 2. Template Editor

The template editor should use clear stacked sections or a calm split-pane layout rather than a dense developer-style console.

Editor sections:

- Identity
- Voice
- Prompting
- Tools
- Skills
- Knowledge
- Defaults
- Advanced

Each section should show:

- plain-language explanation
- current state summary
- structured controls first
- advanced controls second

### Child page changes

The child Speech Coach page should shift from “Coach Setup” to “Assigned Template.”

SLP workflow on the child page:

- choose template
- review template summary
- add small child-specific overrides
- save assignment

Caregiver workflow should remain much simpler and should not expose template editing or advanced runtime controls.

## Configuration Model

### Base runtime profile

Code-owned, minimally editable, and always present.

Defines:

- session opening behavior
- warm-up and target setup behavior
- cueing and retry framework
- frustration de-escalation floor
- closing and handoff behavior
- hard safety instructions

### Template config

Template fields should include:

- `name`
- `description`
- `clinicalFocus`
- `status`
- `voice.provider`
- `voice.voiceId` or app-approved voice key
- `voice.styleSettings`
- `prompt.baseExtension`
- `prompt.coachingStyle`
- `prompt.toolInstructions`
- `prompt.knowledgeInstructions`
- `tools[]`
- `skills[]`
- `knowledgePackIds[]`
- `customKnowledgeSnippets[]`
- `sessionDefaults`
- `version`

### Child override config

Child-level settings should include:

- `templateId`
- `targetSounds`
- `defaultDurationMinutes`
- `preferredThemes`
- `avoidThemes`
- `childNotes`
- `promptAddendum`
- limited safe capability overrides where allowed

### Versioning rule

Templates should be versioned.

Every session must store:

- template ID used
- template version used
- resolved runtime snapshot

This preserves clinical traceability and avoids history becoming ambiguous when templates change later.

## Tools, Skills, and Knowledge

These concepts should be separated in both the UI and runtime model.

### Tools

Tools are app-owned callable runtime capabilities.

Examples:

- target word picker
- minimal pair generator
- category/topic prompt generator
- pacing adjustment helper
- reinforcement phrase helper
- session summary formatter
- caregiver handoff note helper

Each tool should expose:

- enabled/disabled
- short explanation
- limited structured settings
- optional advanced instruction text

Templates may only select from approved tools in V1.

### Skills

Skills are reusable behavior packages, not arbitrary code.

Examples:

- auditory bombardment
- model then imitate
- recast and retry
- choice-based elicitation
- carryover conversation mode
- low-frustration fallback mode

Skills influence the coach’s behavior across turns and provide a product-friendly abstraction for clinical coaching modes.

### Knowledge

V1 knowledge scope:

- built-in knowledge packs
- SLP-authored notes/snippets attached to a template

V1 does not include arbitrary document upload and retrieval.

### Runtime assembly

At session launch, the runtime resolves:

- enabled tool registry
- enabled skills
- assembled knowledge context
- final prompt stack
- voice configuration

This should be deterministic and validation-backed.

## Data Model Direction

### New records

Introduce first-class reusable template records rather than continuing to keep all coach setup inside `homePrograms.speechCoachConfig`.

#### `speechCoachTemplates`

Recommended fields:

- `slpUserId`
- `name`
- `description`
- `clinicalFocus`
- `status`
- `tags`
- `voice`
- `prompt`
- `tools`
- `skills`
- `knowledgePackIds`
- `customKnowledgeSnippets`
- `sessionDefaults`
- `version`
- timestamps

#### Child assignment data

For the first implementation pass, assignment data can stay on the existing child speech-coach program model if that reduces migration risk.

Recommended assignment fields:

- `assignedTemplateId`
- `childOverrideConfig`
- `lastSyncedTemplateVersion`
- optional detached snapshot state

#### Session snapshot data

Each session should store the resolved runtime snapshot used at session start, including:

- template ID
- template version
- resolved prompt summary
- resolved tool set
- resolved skill set
- resolved knowledge summary
- runtime provider/model
- voice configuration

### Migration posture

Do not replace the current `speechCoachConfig` in one breaking change.

Use a widen-migrate-narrow approach:

1. add template and assignment support
2. treat legacy `speechCoachConfig` as child-level override input
3. backfill or convert legacy programs to template-backed records
4. remove or minimize the legacy shape only after successful migration

## Session Flow

Recommended live session flow:

1. Caregiver opens the child’s Speech Coach and starts a session
2. App resolves base runtime + assigned template + child overrides
3. App validates the final config
4. App creates a LiveKit-backed session with the resolved contract
5. Coach runs the structured therapy loop
6. Session ends and stores transcript, runtime snapshot, and analysis outputs

### Structured therapy loop

The base runtime should guide the session through a stable pattern:

- greeting and orientation
- target setup
- guided practice turns
- adaptive support when errors or frustration appear
- brief closeout

Templates influence the style and enabled capabilities inside this loop, not whether the loop exists.

## Safety and Guardrails

Safety rules should remain code-owned.

Required guardrails:

- templates cannot remove the base safety policy
- templates cannot enable arbitrary external tools
- advanced prompt fields are additive, not absolute replacements
- the coach should avoid diagnostic claims and medical advice
- the coach should avoid implying unsupported clinical judgment
- challenge level should step down when frustration signals appear

### Failure behavior

Explicit failure handling is required:

- invalid templates should fail validation before caregiver use
- live runtime failures should surface a clear fallback state
- single tool failures should degrade gracefully to simpler verbal strategies
- broken voice configuration should not crash the whole session without explanation

## Testing Strategy

The redesign will need tests across multiple layers.

### Backend and data

- template validators
- assignment resolution logic
- snapshot creation logic
- migration/backfill coverage

### Runtime resolution

- merging base runtime, template, and child override
- safe handling of unsupported combinations
- version snapshot integrity

### UI

- template library flows
- template editor save/load behavior
- child assignment workflow
- caregiver session start behavior after template assignment

### Session behavior

- invalid configuration prevents launch
- tool failure fallback behavior
- transcript and analysis persistence

## Implementation Boundaries

This redesign covers:

- product shape
- runtime architecture
- template library UX
- config layering
- data model direction
- session and safety model

This redesign does not commit V1 to:

- arbitrary document upload/RAG for clinician files
- arbitrary custom code tools from the UI
- fully open-ended runtime editing
- clinic-wide admin hierarchy beyond user-owned SLP templates

## Recommended Implementation Sequence

1. Introduce template data model and validators
2. Build SLP template library and editor
3. Add child template assignment and override UI
4. Add runtime resolution layer and session snapshot model
5. Replace current fixed-session startup with LiveKit-backed startup flow
6. Preserve current analysis/history flows while adapting them to the new session snapshot contract
7. Migrate legacy speech coach setups into template-backed records

## Open Implementation Notes

- At implementation time, pin Gemini Live to the officially supported LiveKit integration/model available then rather than hard-coding an unverified model name now.
- Keep the caregiver-facing UI intentionally narrow even if the SLP-facing editor becomes much more powerful.
- Maintain clinician-friendly language throughout. Avoid surfacing platform jargon like “runtime,” “provider,” or “tool registry” unless tucked into advanced views.
