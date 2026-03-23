# Artifact Scoring Rubric (MVP-Focused)

## Scoring: 3 Dimensions x 33pts (+1 bonus) = 100

### Dimension 1: Completeness (34 pts)
Key sections are filled with real content. N/A sections are explicitly marked N/A (not left blank).

| Score | Criteria |
|---|---|
| 34 | All relevant sections filled, N/A sections acknowledged |
| 25 | 1-2 key sections thin or missing |
| 15 | Multiple sections empty or placeholder |
| 0 | Template mostly unfilled |

### Dimension 2: Specificity (33 pts)
Content is about THIS app, not generic SaaS advice. Real Convex table names, real Clerk roles, real function names.

| Score | Criteria |
|---|---|
| 33 | Everything references app-specific entities, Convex tables, and real decisions |
| 25 | Mostly specific, 1-2 generic sections |
| 15 | Mix of specific and boilerplate |
| 0 | Could describe any SaaS app |

### Dimension 3: Buildability (33 pts)
A developer could read this and start coding Convex functions + Next.js pages without asking clarifying questions.
Key edge cases noted (not exhaustive — just the ones that would block implementation).

| Score | Criteria |
|---|---|
| 33 | Developer could build from this doc alone, key "what ifs" answered |
| 25 | Mostly buildable, 1-2 ambiguous areas |
| 15 | Significant gaps a developer would stumble on |
| 0 | Too vague to build from |

## Pass Threshold: 90/100

| Range | Status |
|---|---|
| 90-100 | Ship it |
| 80-89 | Close — fill noted gaps |
| 70-79 | Needs another pass |
| <70 | Re-do with more context |

## Cross-Artifact Checks

Quick consistency scan:
- Convex tables in Data Flow match what Convex Functions reference
- Roles in Permissions Matrix match User Journeys and Clerk config
- Screens in Screen Inventory are reachable from User Journeys
- Convex queries serve the screens that need them
- AI features have Convex actions and failure UX defined
- Notifications reference Convex Resend component correctly (registered in `convex/convex.config.ts`)
- Billing uses Stripe Convex component (registered in `convex/convex.config.ts`), webhooks in Convex HTTP actions
- Background jobs reference correct Convex tables and scheduled functions
- Deployment & Infra lists all env vars that other artifacts introduce
- Real-time subscriptions are noted where screens need live updates

## Scorecard Format

```markdown
# {Project} — Scorecard

| # | Artifact | Complete | Specific | Buildable | Total | Status |
|---|---|---|---|---|---|---|
| 1 | User Journeys | /34 | /33 | /33 | /100 | |
| 2 | Data Flow | /34 | /33 | /33 | /100 | |
| 3 | Screen Inventory | /34 | /33 | /33 | /100 | |
| 4 | Permissions Matrix | /34 | /33 | /33 | /100 | |
| 5 | AI Behavior Spec | /34 | /33 | /33 | /100 | |
| 6 | Billing Flow | /34 | /33 | /33 | /100 | |
| 7 | Onboarding Spec | /34 | /33 | /33 | /100 | |
| 8 | Notification Map | /34 | /33 | /33 | /100 | |
| 9 | Background Jobs | /34 | /33 | /33 | /100 | |
| 10 | Convex Functions | /34 | /33 | /33 | /100 | |
| 11 | Deployment & Infra | /34 | /33 | /33 | /100 | |

**Overall:** {avg}/100

## Gaps
{Bullet list of gaps, grouped by artifact}

## Cross-Artifact Issues
{Inconsistencies between artifacts}

## Post-MVP Notes
{Stuff flagged [POST-MVP] across artifacts — track for V2}
```
