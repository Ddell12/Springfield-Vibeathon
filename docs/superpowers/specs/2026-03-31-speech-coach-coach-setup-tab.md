# Speech Coach Coach Setup Tab

**Date:** 2026-03-31
**Status:** Draft

## Objective

Add an SLP-only `Coach Setup` tab to the patient-linked Speech Coach page so therapists can shape how the AI coach runs sessions, talks to the child, and responds when practice is going well or poorly. Done means an SLP can open a patient's Speech Coach program, edit therapist-facing setup fields, save them to the existing home program, and have those settings steer the live session behavior without changing the caregiver flow.

## Background

Today the Speech Coach page only exposes caregiver-facing session setup in `src/features/speech-coach/components/session-config.tsx` plus a history view in `src/features/speech-coach/components/speech-coach-page.tsx`. The persisted `homePrograms.speechCoachConfig` object in `convex/schema.ts` only stores `targetSounds`, `ageRange`, and `defaultDurationMinutes`, which is enough to choose what to practice but not how the coach should behave.

The live ElevenLabs session currently starts from `src/features/speech-coach/components/active-session.tsx` without using SLP-specific behavior settings. That means even if therapist preferences existed, the AI coach would not be steered by them during the session.

## Desired Behavior

- When an SLP opens a patient-linked Speech Coach page, then they see three tabs: `New Session`, `History`, and `Coach Setup`.
- When a caregiver opens the same patient-linked page, then they still only see `New Session` and `History`.
- When an SLP opens `Coach Setup`, then they can edit therapist-facing controls grouped into clear sections: targets, coaching style, cueing and correction, session flow, and clinician notes.
- When an SLP saves changes, then the page persists them onto the existing `homePrograms.speechCoachConfig` record and confirms success without navigating away.
- When a caregiver starts a new session after SLP setup has been saved, then the live speech coach session is steered by those saved preferences in addition to the caregiver’s per-session choices.
- When a speech coach program has older config data with no therapist setup fields yet, then the `Coach Setup` tab loads sensible defaults and saving upgrades the config in place.
- When an SLP visits the standalone `/speech-coach` page, then they see a `Coach Setup` tab with a clear explanation that setup is saved per child inside a patient-linked Speech Coach program.

## Requirements

**Must-have (v1):**
- [ ] Add an SLP-only `Coach Setup` tab to the patient-linked Speech Coach page.
- [ ] Persist setup fields inside `homePrograms.speechCoachConfig` without introducing a new table.
- [ ] Support the following v1 controls:
  - target positions
  - session goal type
  - coach tone
  - session pace
  - prompt style
  - correction style
  - max retries per word
  - frustration handling
  - preferred themes
  - avoid themes
  - clinician notes
- [ ] Keep `New Session` working for caregivers exactly as before.
- [ ] Use the saved setup fields to steer the live ElevenLabs session.

**Nice-to-have (fast follow):**
- [ ] Add one-click “improve the coach” actions from session review.
- [ ] Show a compact summary of saved coach setup on the `New Session` tab.
- [ ] Surface coach setup summary in home program printouts and patient detail widgets.

**Future (design for, don't build):**
- Versioned therapist presets
- Session-by-session SLP ratings that tune future recommendations
- Analytics on which cueing patterns work best for each child

## Boundaries

**Always (invariants — plan mode must preserve these):**
- Keep `src/app/**` pages thin and preserve the existing feature-local architecture under `src/features/speech-coach/`.
- Preserve the caregiver workflow in `src/features/speech-coach/components/session-config.tsx` and `src/features/speech-coach/hooks/use-speech-session.ts`.
- Reuse the existing `homePrograms` persistence path in `convex/homePrograms.ts` and do not weaken SLP-only write permissions.
- Match `DESIGN.md`: warm surfaces, teal primary, minimal motion, no harsh section-divider borders.

**Ask first (flag these decisions for review before proceeding):**
- Adding a new Convex table for therapist feedback history
- Introducing new dependencies for form state or design
- Changing how ElevenLabs agents are provisioned in the dashboard

**Never (hard constraints — plan mode must not do these):**
- Do not expose raw AI jargon like “prompt override” or “model settings” in the clinician UI.
- Do not add global app-wide speech coach settings for all children in v1.
- Do not require caregivers to fill in therapist-facing setup fields before starting a session.

## Dependencies

- Existing `homePrograms` speech coach records
- Clerk role metadata to distinguish SLP vs caregiver
- Existing ElevenLabs React SDK session flow

## Technical Pointers

- **Key files:** `src/features/speech-coach/components/speech-coach-page.tsx`, `src/features/speech-coach/components/standalone-speech-coach-page.tsx`, `src/features/speech-coach/components/session-config.tsx`, `src/features/speech-coach/components/active-session.tsx`
- **Data model:** `convex/schema.ts` `homePrograms.speechCoachConfig`, `convex/homePrograms.ts` create/update validators
- **Patterns to follow:** role checks from Clerk `publicMetadata.role`, feature-local UI components, shadcn form primitives from `src/shared/components/ui/`
- **Integration points:** live session guidance should be passed into the ElevenLabs conversation at session start rather than requiring new backend session orchestration

## Risks & Mitigations

- **Risk:** The UI saves setup fields but the live coach ignores them → **Mitigation:** thread saved setup into the live conversation as contextual guidance at connection time.
- **Risk:** Older speech coach programs lack the new nested fields → **Mitigation:** treat therapist setup as optional and merge with defaults in the UI.
- **Risk:** Too many therapist controls make the page feel like a cockpit → **Mitigation:** keep v1 to a small set of high-leverage controls and group them by clinical intent.

## Verification

**Automated:**
- [ ] `npm test -- coach-setup-tab` passes
- [ ] `npm test -- session-guidance` passes
- [ ] `npx convex codegen` completes

**Manual:**
- [ ] Sign in as SLP, open a patient-linked Speech Coach program, confirm `Coach Setup` tab is visible
- [ ] Edit setup fields, save, refresh, and confirm values persist
- [ ] Sign in as caregiver for the same child, confirm `Coach Setup` is not visible
- [ ] Start a session after saving setup and confirm the live coach follows the configured tone/cueing direction in behavior and phrasing
- [ ] Open standalone `/speech-coach` as SLP and confirm the explanatory `Coach Setup` tab appears

**Regression:**
- [ ] Existing caregiver `New Session` flow still works
- [ ] Existing speech coach history still renders
- [ ] Build succeeds cleanly

## Open Questions

- **Blocking (must resolve before planning):** None
- **Non-blocking (plan mode can resolve during exploration):** Whether target positions should later drive curriculum filtering more directly instead of only steering the agent’s behavior text

## Out of Scope

- Post-session adaptive recommendations inside the `Coach Setup` tab
- A new therapist feedback history table
- Fine-grained voice or TTS engine controls
- Global defaults shared across every patient
