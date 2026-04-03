# Speech Coach Redesign — Design Spec

**Date:** 2026-04-02  
**Scope:** `src/features/speech-coach/` — SLP setup, template system, live session, post-session reporting, AI coach quality, home practice integration  
**Approach:** Full experience redesign (Approach 3) — all three layers together  
**Audiences:** SLPs (setup + clinical data), caregivers (self-serve sessions + parent-friendly reporting), children (engagement during session)

---

## Problem Statement

The speech coach has three broken layers that together prevent adoption:

1. **Setup is confusing.** Two competing configuration paths (template library vs. coach setup tab) with no clear relationship. SLPs face a blank form with 8+ dropdowns and no defaults. The template library is unreachable except through a child's patient page.

2. **The live session is a static screen.** The visual state is hardcoded and never changes. The tools file is an empty object. The agent is a stub that ignores its tools list. The child sees a fixed label and a gray placeholder; the parent has no guidance on what to do. There is no engagement mechanism.

3. **The post-session report is clinically wrong and audience-wrong.** Clinical scoreCards (0-100 integers) are shown to caregivers. The analysis guesses per-attempt outcomes from a raw transcript instead of observing them in real time. The IEP-relevant data (% correct by word position, cue level distribution) is not generated. Home practice notes are generated but never prominently surfaced.

---

## Section 1: SLP Setup & Template System

### Current State

Three parallel ways to configure the speech coach — each incomplete:
1. Create a template in the Template Library → apply to child
2. Configure the Coach Setup Tab directly on the child's home program
3. Both simultaneously (runtime resolution in `getRuntimeLaunchContext` tries to reconcile, imperfectly)

The CoachSetupTab has 8+ dropdowns across 5 card sections with no explanation of defaults. The template assignment card has no descriptions or preview. A child with no config shows a dead-end with two competing links. The Template Library is only accessible via a child's patient page — SLPs cannot manage templates independently.

### Redesigned State

**Two distinct surfaces with clear separation of concerns:**

**Surface A — Global Speech Coach Hub** (SLP-level, not patient-specific)

A top-level SLP page (uses the existing template library route) that becomes a proper hub:

- Full create/edit/duplicate of templates, independent of any child
- Shows which children are using each template
- 4 built-in system templates ship with the product so SLPs never see a blank form:
  - Sound Drill (structured repetition, clear cues)
  - Conversational (warm, topic-based, uses child interests)
  - Listening First (ear training before speaking)
  - Mixed Practice (alternates drills and carryover)
- System templates are not editable but can be duplicated as a starting point for custom ones

**Template editor** (accessible from the hub, not from a patient page):
Full CoachSetup fields — name, description, tone, pace, prompt style, correction style, frustration handling, target positions, session goal, preferred/avoid themes.

**Surface B — Per-Patient Override** (inside patient's speech coach tab)

Intentionally minimal. Shows which template is active and surfaces only child-specific fields:

```
Ace's Speech Coach Setup
────────────────────────
Based on: [Sound Drill ▾]       [← pick a different template]

Target sounds: /s/ /r/          [edit]
Ace's age: 6                    [edit]
SLP notes for Ace:
  Give extra wait time. He likes trains.
  Avoid food examples.           [edit]

[Advanced overrides ▾]          ← only if SLP wants to deviate from template
  tone, pace, correction style (shows delta from template defaults)

[Save Ace's setup]
```

Full template editing always routes back to the hub. The per-patient page never contains a full template editor.

**New child onboarding** — when a child has no speech coach config:
```
"Pick a starting point for Ace's coach"

[Sound Drill]  [Conversational]  [Listening First]  [Mixed Practice]
Structured     Warm, topic-      Ear training        Alternates
repetition     based practice    before speaking     drills and
with cues      using interests                       carryover talk

[Select one → takes you to per-child overrides]
```

### Key Changes

| Current | Redesigned |
|---|---|
| Template library only accessible from patient page | Global hub — independent of any patient |
| Two competing setup paths | Hub for templates → per-patient picks + overrides |
| 8+ dropdowns in a single form, no defaults | Minimal per-patient form, full editor only in hub |
| SLP notes buried at bottom | SLP notes prominent in per-patient override |
| Binary age range (2-4 / 5-7) | Actual age input (2–12), maps to coaching tier internally |
| Blank dead-end for new child | 4 system template quick-start cards |

### Schema Changes

None required. Existing `speechCoachConfig` on `homePrograms` and `speechCoachTemplates` table are preserved.

### Out of Scope

- Template sharing between SLPs (needs multi-tenancy)
- AI-generated template suggestions based on IEP goals
- SLP-facing analytics on template usage across caseload

---

## Section 2: Active Session — Caregiver + Child Experience

### Current State

The live session renders a static target label, a gray placeholder box, and a Stop button. The `promptState` field (`listen | your_turn | try_again | nice_job`) is defined but permanently set to `"listen"` and never changes. The celebration code renders the text `"Fireworks"`. There is no caregiver guidance. Parent and child see identical UI. The LiveKit tools file (`tools.ts`) is an empty object. The agent (`agent.ts`) is a stub that ignores its tools list. The TODO comment in `active-session.tsx` — "wire to LiveKit data-channel events" — has never been implemented.

### Redesigned State

**Three layers to the live session:**

**Layer 1 — Child-facing visual (full screen, center)**

The screen responds to the agent in real time, driven by LiveKit room metadata updates. The agent writes structured JSON to room metadata; the client subscribes via `useRoomInfo` and updates `visual` state.

```
┌─────────────────────────────────┐
│  ●●●○○  [progress dots]  5:00  │  ← attempt dots + time remaining
│                                 │
│     ┌───────────────────┐       │
│     │                   │       │
│     │   [target image]  │       │  ← 200px, from targetVisualUrl
│     │                   │       │
│     └───────────────────┘       │
│                                 │
│         "sun"                   │  ← target word, Fraunces display font
│                                 │
│   ┌─────────────────────────┐   │
│   │  👂  Listen carefully   │   │  ← prompt state card
│   └─────────────────────────┘   │
│                                 │
│              [Stop]             │
└─────────────────────────────────┘
```

Prompt state card transitions between 4 states with 300ms crossfade (disabled when `reducedMotion` is true):
- `listen` → 👂 "Listen carefully" (calm blue tint)
- `your_turn` → ⭐ "Your turn!" (warm teal, slightly larger)
- `try_again` → 🤚 "Try again" (soft amber)
- `nice_job` → ✓ "Nice job!" (green, brief pulse)

Milestone celebrations (every 5 correct attempts): full-card confetti burst, 1.5s, CSS-only, disabled when `reducedMotion` is true.

Attempt progress dots: row of 5 circles at top, fills left to right as correct attempts accumulate, resets on milestone.

Duration options expanded: 5, 8, 10, 15 minutes.

**Layer 2 — Caregiver guidance strip (non-distracting)**

A quiet strip at the bottom, dismissible:

```
Your role: Be a cheerleader 🎉
When the coach pauses — just smile and wait.
                              [Got it — hide]
```

Updates by session phase:
- First 60s: onboarding tip ("Just listen — the coach has this")
- Mid-session: encouragement tip ("A thumbs up goes a long way")
- Last 60s: "Almost done — great job today!"

A small floating icon in the corner reopens it after dismissal. Parent and child still share the same device but the guidance strip is clearly "for the adult."

**Layer 3 — Agent tools (implemented)**

The `speechCoachTools` file gets three real tools:

1. **`signal_state`** — writes `{ targetLabel, targetImageUrl, promptState, totalCorrect }` to room metadata. Client subscribes and re-renders visual state.
2. **`log_attempt`** — writes `{ targetLabel, outcome, retryCount, timestampMs }` via a new `logAttempt` internalMutation to `rawAttempts` on the session record.
3. **`advance_target`** — signals move to next target word; triggers brief target transition animation.

### Key Changes

| Current | Redesigned |
|---|---|
| Static screen, visual never changes | Real-time state driven by agent tool calls via room metadata |
| Tools file is empty object | 3 tools: signal_state, log_attempt, advance_target |
| No caregiver guidance | Dismissible guidance strip with phase-aware tips |
| "Fireworks" text placeholder | CSS confetti on milestone, respects reducedMotion |
| Attempt progress invisible | 5-dot progress row at top |
| Duration 5 or 10 min only | 5, 8, 10, 15 min options |
| Child and parent see same undifferentiated UI | Child: full-screen visual. Parent: quiet guidance strip |

### Schema Changes

```typescript
// speechCoachSessions — add:
rawAttempts: v.optional(v.array(v.object({
  targetLabel: v.string(),
  outcome: v.union(
    v.literal("correct"),
    v.literal("approximate"),
    v.literal("incorrect"),
    v.literal("no_response")
  ),
  retryCount: v.number(),
  timestampMs: v.number(),
})))
```

New `logAttempt` internalMutation appends to this array during the session. The analysis action in Section 3 reads from `rawAttempts` first, falls back to transcript parsing only if empty.

### Out of Scope

- SLP remote monitoring of live sessions (separate teletherapy feature)
- Video of the child during session (HIPAA + consent requirements)
- In-session phoneme-level accuracy scoring (requires dedicated STT model)
- Persistent per-child reward characters or avatars

---

## Section 3: Post-Session Review & Progress Reporting

### Current State

The `ProgressCard` component shows identical content to both caregivers and SLPs: raw 0-100 scoreCard numbers, `incorrect`/`approximate` outcome badges on individual words, and the label "Cueing: 55" — none of which are meaningful to a parent. The analysis prompt asks Claude to infer all attempt outcomes from a raw transcript — unreliable for longer sessions. Home practice notes are generated but buried at the bottom of an undifferentiated card. No IEP-ready output exists. No trend view exists.

### Redesigned State

**Two distinct views, same underlying data, different rendering.**

**Caregiver view** (default — what parents see post-session):

```
🎉 Great session, Ace!

Ace practiced /s/ sounds today — he tried 12 words and
got most of them right. The coach says he's really
getting the sound at the start of words.

Today's words: sun · sock · sandwich · snake · soap

[Next time] The coach suggests trying /s/ in the
middle of words — like "missing" and "blossom".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

How to practice at home this week:
• Say "I see a ___" and pause — let Ace fill in
  animal names starting with S
• Reading books? Point to things that start with S

[Start another session]   [View history]
```

No numbers. No clinical terms. No "incorrect" labels on individual words. The home practice tip is pulled from `insights.homePracticeNotes`. The "Next time" recommendation is from `recommendedNextFocus`.

**SLP view** (accessible from patient's history tab):

```
Session · Ace · Apr 2, 2026 · 8 min 14 sec
─────────────────────────────────────────────
/s/ Production
  Initial position:   ████████░░  82% (9/11)
  Medial position:    ████░░░░░░  44% (4/9)
  Final position:     ──────────  not attempted

Cue level distribution:
  Spontaneous          ████░░  38%
  Model only           ████░░  35%
  Phonetic cue         ██░░░░  19%
  Direct correction    ░░░░░░   8%

Error patterns:
  • Consistent omission in medial position
  • /s/ cluster reduction (st→t) in 3/4 attempts

IEP note (draft):
  Student produced /s/ in initial position with 82%
  accuracy across 11 trials. Medial position emerging
  (44%, 9 trials). Phonetic cueing reduced to 19% of
  trials. Recommend targeting /s/ medial position next
  session.

[Copy note]   [Add to session record]
```

Cue level data computed from `rawAttempts.retryCount`: 0 retries = spontaneous, 1 = model, 2 = phonetic, 3+ = direct correction.

**Session history trend** (SLP, patient profile):

```
Speech Coach · Ace Chen
[Last 4 weeks]

/s/ Initial      ▲ 68% → 82% over 6 sessions
/s/ Medial       ▲ 31% → 44% over 4 sessions
Engagement       ━━━━━ consistently high
```

Built from existing `speechCoachProgress` records. Trend computed by comparing first and most recent session per sound.

**Analysis pipeline split:**

The `buildAnalysisPrompt` becomes two calls:
1. **Caregiver analysis** (always runs): generates `summary`, `homePracticeNotes`, `recommendedNextFocus` in plain parent language
2. **SLP analysis** (runs when `patientId` present): generates `scoreCards`, `positionAccuracy`, `cueDistribution`, `errorPatterns`, `iepNoteDraft` — uses `rawAttempts` as primary data, transcript parsing as fallback

### Key Changes

| Current | Redesigned |
|---|---|
| One ProgressCard for both audiences | Split: caregiver view + SLP clinical view |
| Raw 0-100 scoreCard numbers to caregivers | Caregiver: narrative + home tips only |
| "incorrect" labels on child's attempts visible to parent | Caregiver never sees per-attempt outcomes |
| Analysis guesses from transcript | Analysis reads rawAttempts first, transcript as fallback |
| No trend data | SLP history shows session-over-session accuracy trend |
| Home practice notes buried | Prominently surfaced in caregiver view |
| No IEP note output | SLP view auto-generates copyable IEP note draft |

### Schema Changes

```typescript
// speechCoachProgress — add:
cueDistribution: v.optional(v.object({
  spontaneous: v.number(),
  model: v.number(),
  phoneticCue: v.number(),
  directCorrection: v.number(),
})),

positionAccuracy: v.optional(v.array(v.object({
  sound: v.string(),
  position: v.union(
    v.literal("initial"),
    v.literal("medial"),
    v.literal("final")
  ),
  correct: v.number(),
  total: v.number(),
})))
```

Both fields computed by `analyzeSession` from `rawAttempts` and stored alongside existing `scoreCards`.

### Out of Scope

- Full HIPAA-compliant clinical record export (PDF with provider signature)
- GFTA-2 standardized scoring integration
- Formatted progress report generation for IEP meetings

---

## Section 4: AI Coach Quality & Clinical Accuracy

### Current State

The agent's full instruction is one sentence: "You are Vocali Speech Coach. Run a live speech practice session for a child using warm, concrete, child-safe language." followed by a flat text block of setting labels ("Coach tone: Playful. Session pace: Steady."). These labels describe settings but do not explain how to enact them clinically.

The `SpeechCoachSkillKey` types (`auditory-bombardment`, `model-then-imitate`, `recast-and-retry`, etc.) are defined and flow through `resolveSpeechCoachRuntimeConfig` — but are never injected into the prompt. They have zero runtime effect.

There is no autism-specific communication guidance anywhere in the prompt stack. No cueing hierarchy. No wait time instruction. No fallback strategy for a non-responsive child. The analysis transcript minimum is 100 chars (too low) and has no check on `rawAttempts`.

### Redesigned State

**Clinical protocol prompt** replaces the one-sentence base in `buildSpeechCoachRuntimeInstructions`:

```
You are Vocali Speech Coach, an AI speech practice partner
for children. You are warm, patient, and concrete. You never
diagnose, evaluate, or give medical advice.

COMMUNICATION RULES (always follow, especially for autism):
- Use short sentences (5-7 words max for ages 2-5, 8-10 for 6+)
- Wait 5-10 full seconds after asking before repeating
- Never ask open-ended questions without a model first
- Predictable turn-taking: you speak → you wait → child responds
- Praise the attempt, not just the outcome ("Good trying!")
- One instruction at a time — never chain two requests

CUEING HIERARCHY (follow in order, do not skip steps):
1. Elicit spontaneously: "Can you say [word]?"
2. Model: "Listen — [word]. Now you try."
3. Phonetic cue: describe the sound position briefly
4. Move on warmly: "That's a tricky one — let's try [next word]"

PACING:
- After each correct attempt: brief praise, then next target
- After incorrect: one retry maximum, then move on
- If child goes silent: wait → offer a choice → take a 30s break
```

**Skills become clinical modules** — each enabled skill in the template injects specific clinical text:

| Skill key | Injected clinical text |
|---|---|
| `auditory-bombardment` | Repeat each target word 5-8 times naturally before eliciting. Embed targets in simple sentences. |
| `model-then-imitate` | Always model the target word first. Say it clearly, pause 3 seconds, then ask the child to repeat. |
| `recast-and-retry` | When the child produces a close approximation, recast correctly ("Yes! Sun!") and move forward. Only retry once. |
| `choice-based-elicitation` | Instead of asking for spontaneous production, offer two choices: "Is this a sun or a moon?" |
| `carryover-conversation` | Embed target words naturally in simple conversation. Don't drill — use targets as they arise organically. |
| `low-frustration-fallback` | At first sign of resistance, immediately back off. Offer a brief break topic, then return gently. |

**Age-appropriate language tiers** by actual age:
- Ages 2–4: "Use 1-2 word models. Lots of repetition. Songs and silly sounds welcome."
- Ages 5–7: "Simple sentences. Playful but structured. Minimal explanation."
- Ages 8–12: "Can handle brief explanation of why we practice. Treat as a capable partner."

**Tool call instructions** appended to every session prompt:
```
TOOLS YOU MUST USE:
- Call signal_state at the start of each new target and after each attempt
- Call log_attempt immediately after every child response
- Call advance_target when moving to the next word
These tools power the visual feedback the child sees — do not skip them.
```

**Analysis improvements:**
- Transcript minimum raised from 100 to 300 chars
- Check `rawAttempts.length > 0` before falling back to transcript inference
- Analysis prompt split by audience (Section 3)

### Key Changes

| Current | Redesigned |
|---|---|
| 1-sentence generic base | Structured clinical protocol with cueing hierarchy |
| Settings as text labels only | Settings explain HOW to enact them clinically |
| Skills defined but never injected | Each enabled skill injects clinical module text |
| No autism-specific guidance | Wait time, turn-taking, concrete language baked in |
| Binary age range in prompt | Age-appropriate language tier by actual age |
| No tool call instructions | Agent explicitly instructed to call all 3 tools |
| Single analysis prompt, mixed audience | Split: caregiver analysis + SLP analysis |
| 100-char transcript minimum | 300 chars + rawAttempts count check |

### Schema Changes

None — skill injection is handled at prompt-build time in `buildSpeechCoachRuntimeInstructions`.

### Out of Scope

- Real-time phoneme-level accuracy scoring (requires dedicated STT model with phoneme output)
- Dysarthria or fluency disorder coaching (current scope: articulation only)
- Multi-language support

---

## Section 5: Home Practice Program Integration

### Current State

Sessions exist in isolation from the rest of the platform. After a session ends, `savePracticeLog` and `saveGoalProgress` fire — but neither is surfaced anywhere in the UI. The caregiver has no guidance on what to do between sessions. There is no practice streak or frequency mechanism. The SLP has no visibility into how often caregivers are running sessions. `recommendedNextFocus` is shown briefly post-session then disappears. The `SessionConfig` silently pre-selects recommended sounds without explaining why.

### Redesigned State

**Caregiver home dashboard — practice panel:**

```
Ace's Speech Practice
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 3 sessions this week

Last session: Yesterday
  Practiced /s/ sounds — great effort!

This week's focus: /s/ at the start of words
  [Start a session →]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Home practice tip:
  Try naming things you see on walks that start
  with S — sun, sidewalk, store, school.
  [Another tip →]
```

"This week's focus" and home practice tip pulled from the most recent session's `recommendedNextFocus` and `insights.homePracticeNotes`. The `[Start a session]` CTA pre-loads `SessionConfig` with recommended sounds.

**Session config pre-loading** — the existing silent pre-selection gets an explicit label:
```
Sounds for today:  /s/  /r/
Based on Ace's last session   [Change →]
```

**Caregiver history** (simple, no clinical data):
```
April 2026
● Apr 2  /s/ sounds · 8 min · Great session!
● Apr 1  /s/ sounds · 5 min · Good effort
○ Mar 30 (no session)
● Mar 29 /r/ sounds · 10 min · Keep it up!
```

Filled dot = session happened. Empty circle = no session. Calendar-style view. No accuracy numbers. Shows consistency, not performance.

**SLP caseload view — practice frequency panel** (patient profile):

```
Home Practice · Last 30 days
────────────────────────────
Sessions completed:    8
Avg per week:          2.1
Caregiver consistency: Medium (goal: 3/week)

Last session:          Yesterday
Sounds practiced:      /s/ (7×)  /r/ (2×)

[Adjust home program →]
```

Data already exists in `practiceLog` — needs a query and render surface only.

### Key Changes

| Current | Redesigned |
|---|---|
| practiceLog and progressData written but invisible | Practice frequency visible to both audiences |
| No between-session caregiver guidance | Home practice tip panel with cycling tips |
| No practice streak or frequency feedback | Session dot calendar + "N sessions this week" |
| Recommended sounds silently pre-selected | Explicit "based on last session" label + one-tap start |
| SLP has no home practice visibility | Caseload view shows sessions/week per child |
| No between-session CTA | "Start a session" pre-loaded with recommended sounds |

### Schema Changes

None — `practiceLog` and `progressData` already exist and are being written. This section is entirely query + UI surface work.

### Out of Scope

- Push notifications / SMS reminders for caregivers
- Caregiver-to-SLP messaging about session difficulties
- Automated difficulty progression (AI decides when to advance to next sound)

---

## Schema Changes Summary

| Table | Change | Purpose | Section |
|---|---|---|---|
| `speechCoachSessions` | Add `rawAttempts` array | Real-time per-attempt outcome logging | 2 |
| `speechCoachProgress` | Add `cueDistribution` object | SLP cue level analysis | 3 |
| `speechCoachProgress` | Add `positionAccuracy` array | % correct by word position | 3 |
| `homePrograms.speechCoachConfig` | Add `reducedMotion: v.optional(v.boolean())` | Motion sensitivity setting for autistic users | 2 |

No changes to `speechCoachTemplates`, `practiceLog`, or `progressData`.

---

## Complexity Summary

| Section | Complexity | Key risk |
|---|---|---|
| SLP Setup & Templates | Low | Routing changes to make hub accessible outside patient pages |
| Active Session | High | LiveKit room metadata subscription + agent tool implementation |
| Post-Session Reporting | Medium | Split analysis prompt, dual-audience rendering logic |
| AI Coach Quality | Medium | Skill injection pipeline; prompt length vs. context window |
| Home Practice Integration | Low | Queries only — all data already written |

The highest-risk work is Section 2: implementing the LiveKit data channel (room metadata) and wiring the three agent tools. Everything else builds on top of infrastructure that already exists.

---

## Motion & Accessibility Constraints

All animations in Sections 2 and 5 must check `reducedMotion` (same pattern as `highContrast` in the tools builder). Specifically:
- Prompt state card crossfade: disabled
- Milestone confetti burst: disabled
- Attempt progress dot fill animation: disabled
- Target transition animation on `advance_target`: disabled

Caregivers can enable `reducedMotion` in child settings. It must propagate into the active session via the existing session config.

---

## What Is Explicitly Out of Scope (Full List)

See `TODO.md` in the project root for the complete V2 backlog.
