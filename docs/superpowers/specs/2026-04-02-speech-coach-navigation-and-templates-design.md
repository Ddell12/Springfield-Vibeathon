# Speech Coach Navigation And Template Discoverability

**Date:** 2026-04-02
**Status:** Approved
**Program:** Speech Coach and Builder Upgrade Initiative

## Objective

Make Speech Coach setup and templates easy to find and use. Done means therapists can enter the Speech Coach area and clearly navigate between `Sessions`, `Setup`, and `Templates` without relying on hidden routes or accidental discovery.

## Background

The codebase already contains coach setup and template surfaces, but they are not discoverable enough in the product. The global sidebar only points to `Speech Coach`, while the deeper setup and template flows are split across routes and components in a way that makes them feel missing even when they technically exist.

The product needs one clear mental model: Speech Coach is a single area with obvious in-area navigation and clear links between session practice, child-specific setup, and reusable templates.

## Product Decisions

- Keep one top-level `Speech Coach` item in the main sidebar.
- Use in-area navigation, not extra top-level sidebar items, to expose `Sessions`, `Setup`, and `Templates`.
- Caregiver experiences remain simpler and should not expose therapist template authoring.

## Desired Behavior

- When a therapist opens `Speech Coach`, then the page header shows `Sessions`, `Setup`, and `Templates`.
- When a therapist has no assigned template yet, then the `Sessions` view points them toward `Setup` or `Templates` with direct actions.
- When a therapist is on `Setup`, then they can review the current assignment and jump to `Templates` to choose or edit a reusable coach.
- When a therapist is in `Templates`, then they can apply a template to a child directly.
- When a caregiver opens Speech Coach, then they can still start and review assigned sessions without entering template authoring flows.

## Navigation Model

### Top Level

Main sidebar:

- `Speech Coach`

### In-Area Header Navigation

Inside the Speech Coach area:

- `Sessions`
- `Setup`
- `Templates`

This navigation should be visually prominent and stable across therapist-facing Speech Coach routes.

## Route Model

Recommended stable route shape:

- `/speech-coach`
- `/speech-coach/setup`
- `/speech-coach/templates`

Patient-specific or family-specific routes may still exist, but they should reuse the same labels, ordering, and mental model instead of creating hidden parallel navigation.

## UX Rules

- Empty states should always suggest the next action, not only explain missing data.
- `Sessions` should link to `Setup` when configuration is incomplete.
- `Setup` should link to `Templates` when a therapist needs to choose or refine a reusable coach.
- `Templates` should support direct apply/assign actions so therapists do not need to backtrack manually.
- Caregiver views should omit editing affordances rather than showing disabled therapist controls.

## Content Model

### Sessions

Focuses on:

- starting sessions
- reviewing past sessions
- seeing assignment status

### Setup

Focuses on:

- child-specific assignment
- template summary
- limited child-specific overrides

### Templates

Focuses on:

- reusable speech coach templates
- preview, duplicate, archive, edit
- apply template to child

## Boundaries

**Always:**
- Preserve one clean top-level Speech Coach entry in the main navigation.
- Match existing design language instead of inventing a new navigation system for this area.
- Keep caregiver flows simpler than therapist flows.

**Ask first:**
- Adding a second persistent sidebar inside Speech Coach
- Creating a separate global Templates nav item just for speech coach
- Exposing advanced template editing to caregivers

**Never:**
- Never rely on hidden routes as the primary way to reach setup or templates
- Never force therapists to leave the Speech Coach area mentally to manage speech coach templates
- Never clutter the global nav with multiple speech coach sub-items for v1

## Technical Pointers

- `src/features/speech-coach/components/speech-coach-page.tsx`
- `src/features/speech-coach/components/slp-speech-coach-page.tsx`
- `src/features/speech-coach/components/coach-setup-tab.tsx`
- `src/features/speech-coach/components/template-library-page.tsx`
- `src/features/speech-coach/components/template-editor.tsx`
- `src/shared/lib/navigation.ts`
- `src/features/dashboard/components/dashboard-sidebar.tsx`
- `src/core/routes.ts`

## Risks And Mitigations

- **Risk:** Route cleanup breaks existing direct links.  
  **Mitigation:** add compatibility redirects or reuse existing route handlers behind the new visible navigation.

- **Risk:** Therapist and caregiver logic diverge too far.  
  **Mitigation:** keep one shared area shell and gate only the authoring actions.

- **Risk:** Templates remain technically reachable but still feel buried.  
  **Mitigation:** make header navigation persistent and link surfaces to each other through empty states and action buttons.

## Verification

**Automated:**
- [ ] Navigation tests cover therapist header tabs
- [ ] Role-based tests confirm caregivers do not see template authoring
- [ ] Route tests confirm stable access to setup and templates

**Manual:**
- [ ] Open Speech Coach as therapist and confirm `Sessions`, `Setup`, and `Templates` are visible immediately
- [ ] Move from `Sessions` to `Setup` and `Templates` without typing URLs
- [ ] Apply a template to a child from the Templates area
- [ ] Open Speech Coach as caregiver and confirm the experience remains simpler

## Out Of Scope

- A global redesign of the full app navigation
- New template authoring capabilities beyond discoverability and flow wiring
- Caregiver-facing template editing
