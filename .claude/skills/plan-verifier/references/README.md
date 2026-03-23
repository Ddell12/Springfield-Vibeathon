# Plan Verifier Reference Files

Tech stack reference files for the plan-verifier skill. Each file contains best practices, known gotchas, and common plan mistakes for a specific library or framework.

## Files

| File                   | Covers                                                           | Used In        |
| ---------------------- | ---------------------------------------------------------------- | -------------- |
| `convex.md`            | Convex backend: queries, mutations, actions, schema, validators  | Phase 1.3, 3.2 |
| `nextjs.md`            | Next.js App Router: routing, components, data fetching, metadata | Phase 2.2, 3.2 |
| `trigger-dev.md`       | Trigger.dev: tasks, schedules, orchestration, deployment         | Phase 2.2, 3.2 |
| `ui-stack.md`          | shadcn/ui + Tailwind CSS v4: components, theming, config         | Phase 2.2, 3.2 |
| `testing-and-tools.md` | Vitest, grammY, Claude Agent SDK                                 | Phase 2.2, 3.2 |

## How the Skill Uses These

During Phase 3.2 (API Correctness), the plan-verifier reads the relevant reference file(s) for any library used in the plan. This provides a fast local lookup of known gotchas before falling back to Context7 or web search for APIs not covered here.

## Updating References

Run `/update-plan-refs` to refresh all reference files using Context7 and web search. Each file includes a `Last updated:` date at the top.

Update when:

- A major version of a library ships (e.g., Next.js 17, Convex breaking change)
- You discover a new gotcha during plan execution that isn't documented
- A reference file is > 90 days old

To add a gotcha manually, just edit the relevant file and add it under "Known Gotchas" or "Common Plan Mistakes".
