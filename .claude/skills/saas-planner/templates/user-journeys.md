# User Journeys

<!--
MVP FOCUS: Map the critical paths users take. Don't document every edge case —
focus on the journeys that, if broken, mean the app doesn't work.
Skip sections that don't apply. Add custom ones if needed.

CONVEX NOTE: Screens auto-update via reactive queries. Note where real-time
matters (e.g., "user sees update instantly without refresh").
-->

## Personas

<!-- One per user type. Keep it tight. -->

### {persona_name}
- **Who**: {one sentence}
- **Goal**: {what they want from the app}
- **How often**: {daily / weekly / occasional}
- **Plan tier**: {free / paid / admin}

---

## Core Journeys

<!-- One journey per major thing a user does. Focus on MVP journeys only. -->

### Journey: {name}

**Persona**: {who} | **Priority**: P0 (MVP) / P1 / P2
**Trigger**: {what causes this journey to start}
**Success**: {what "done" looks like}

| Step | User Does | Screen | System Does | What Could Go Wrong |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

**Real-time behavior**: {does this journey involve live updates? e.g., "other users see changes instantly"}
**Key decision points**: {any forks in the flow}

---

## MVP Journey Checklist

Check off as you document each. Skip what doesn't apply.

**Auth (Clerk)**
- [ ] Sign up (Clerk hosted / embedded)
- [ ] Log in (email + OAuth providers)
- [ ] Forgot password (Clerk handles)
- [ ] Clerk webhook syncs user to Convex `users` table

**Core Value**
- [ ] First "aha moment" action
- [ ] Repeat usage (steady state)
- [ ] Real-time updates (what auto-refreshes via Convex subscriptions)

**Settings**
- [ ] Edit profile / account (Clerk UserProfile or custom)
- [ ] Change plan (if billing exists)

**AI** (if applicable)
- [ ] First AI interaction
- [ ] AI gives bad/wrong result
- [ ] AI is slow or unavailable (Convex action timeout handling)

**Billing** (if applicable — Stripe via Convex component)
- [ ] Upgrade to paid
- [ ] Cancel
- [ ] Stripe webhook → Convex HTTP action → role update

---

## Journey Flow

<!-- How journeys connect. ASCII diagram or bullet list. -->

```
Sign Up (Clerk) → Clerk Webhook → Convex user created
    → Onboarding → First Core Action → Repeat Usage
                                      ↓
                                 [Hit limit?] → Upgrade prompt → Stripe Checkout
```

---

## Open Questions

<!-- Things you couldn't decide yet. Flag for later. -->

- {question} — `[POST-MVP]` if it can wait
