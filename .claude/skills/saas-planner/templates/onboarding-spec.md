# Onboarding Spec

<!--
MVP FOCUS: Get users to the "aha moment" as fast as possible.
Auth is Clerk (handles signup/signin UX). Focus on what happens AFTER auth.
For MVP: what's the shortest path from Clerk signup to value?
-->

## Aha Moment

| Field | Value |
|---|---|
| What it is | {The specific action/outcome where user "gets" the app} |
| Target time | {Signup to aha moment — e.g., <2 minutes} |
| How to measure | {Convex field to check — e.g., user.hasCompletedOnboarding, first item created} |

---

## Onboarding Flow

### Steps

| # | Step | Screen | Required? | What Happens | Skip Behavior |
|---|---|---|---|---|---|
| 1 | Create account | Clerk sign-up page | Yes | Clerk handles → webhook → Convex user created | Can't skip |
| 2 | {Quick setup} | {/onboarding} | {No} | {Collect use case, preferences → Convex mutation} | {Use defaults} |
| 3 | {First core action} | {/app/new} | Yes | {User creates first [thing] → Convex mutation} | Can't skip — this IS the value |

**Branching** (if any): {e.g., if user picks "use case A" → show different first action}

### Onboarding State Tracking

```typescript
// In users table
{
  onboardingCompleted: v.optional(v.boolean()),
  onboardingStep: v.optional(v.number()),
  // or track specific milestones:
  hasCreatedFirst: v.optional(v.boolean()),
}
```

**Route guard**: If `!user.onboardingCompleted`, redirect to `/onboarding` from authenticated pages.

---

## Empty States

<!-- What every key screen looks like before the user has data -->

| Screen | Empty State | CTA |
|---|---|---|
| {Dashboard} | {Welcome message + what to do} | {"Create your first [thing]"} |
| {List view} | {Illustration/message explaining what goes here} | {"Add [item]"} |

**Sample data**: {yes — seed via Convex mutation on first login / no — start empty}

---

## First-Run Guidance

| Method | Where | What |
|---|---|---|
| {Inline prompt} | {Empty dashboard} | {Suggested first action with prominent CTA} |
| {Welcome modal} | {First login only} | {Quick orientation — 2-3 bullet points, dismiss} |
| {Tooltip} | {On key button after first login} | {"Click here to create your first [thing]"} |

Keep it minimal. One inline prompt > an elaborate tour.

---

## Welcome Email

- **Sent**: Convex action triggered by Clerk webhook (user created)
- **Via**: Convex Resend component
- **Content**: Welcome + single CTA to complete first action
- **Follow-up** (if any): {Day 2 nudge if `!onboardingCompleted` — POST-MVP via Convex cron}

---

## Open Questions

- {question}

`[POST-MVP]`: {drip email sequence via Convex crons, progressive feature disclosure, guided tours, onboarding analytics, activation funnel}
