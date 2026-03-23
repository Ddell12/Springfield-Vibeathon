# Plan Verification

Before presenting a plan to the user for approval, verify it against the actual codebase to catch errors early. A plan with wrong file paths, incorrect imports, or impossible API calls wastes everyone's time.

## Two-Tier Verification

Plan verification uses two tiers with different depth and speed. Which tiers
you need depends on the plan's complexity tier:

| Plan Tier | Tier 1 (Plan Reviewer)                    | Tier 2 (Plan Verifier) |
| --------- | ----------------------------------------- | ---------------------- |
| Simple    | Run script directly (no sub-agent needed) | Skip                   |
| Medium    | Mandatory (spawn plan-reviewer sub-agent) | Optional               |
| Complex   | Mandatory (spawn plan-reviewer sub-agent) | Recommended            |

### Tier 1: Plan Reviewer

**Speed:** ~30 seconds. **When:** Every Medium/Complex plan. Simple plans can
just run `validate-plan.sh` directly without spawning a sub-agent.

For Medium/Complex plans, spawn the plan-reviewer sub-agent from
`agents/plan-reviewer.md`. It runs:

1. `validate-plan.sh` — structural checks (sections, paths, tier-based line limits)
2. YAML frontmatter validation — `plan_version`, `tier`, `domain_tags`, file lists
3. Integration point verification — files and functions exist
4. Cross-slice import check — no architecture violations

Fix all errors before presenting the plan. Warnings are informational.

### Tier 2: Plan Verifier (Recommended for Complex plans)

**Speed:** 1-3 minutes. **When:** Complex tier plans (9+ files), or unfamiliar areas.

If the project has a `plan-verifier` skill installed (check `.claude/skills/plan-verifier/`), invoke it on your plan:

```
/plan-verifier Docs/plans/2026-03-06-my-feature-plan.md
```

The plan verifier will:

1. Score the plan across 6 categories (paths, APIs, wiring, architecture, dependencies, logic)
2. Flag specific issues with severity (CRITICAL, WARNING, SUGGESTION)
3. Provide recommended fixes with exact code snippets

If critical issues are found, fix them before presenting the plan. The user shouldn't have to catch errors that automated verification would find.

## Quick Self-Verification

At minimum, run through this checklist mentally:

### Paths & Files (Critical)

- Every file path referenced in the plan exists in the codebase
- New files are placed in the correct directory following project conventions
- Line number references are approximate but in the right ballpark

### Imports & APIs (Critical)

- Every import in the plan references a real module with real exports
- Function signatures match what actually exists (argument types, return types)
- Package versions are compatible with what's installed

### Wiring & Integration

- Every new module is called from somewhere (not orphaned)
- Event listeners, bus subscriptions, or hooks are registered
- New routes are added to the router
- New Convex functions are exported

### Architecture

- No cross-slice imports (if the project enforces boundaries)
- ESM/CJS consistency matches the project
- Test files follow project test conventions

### Dependencies

- Required packages are listed for installation
- Codegen steps are included (e.g., `npx convex dev` for Convex)
- Environment variables are documented

## Common Plan Errors

| Error              | Example                                                                    | Fix                                              |
| ------------------ | -------------------------------------------------------------------------- | ------------------------------------------------ |
| Stale path         | Plan says `src/utils/helpers.ts` but file moved to `src/shared/helpers.ts` | Verify with Glob before writing plan             |
| Wrong export       | Plan imports `{ runAgent }` but actual export is `{ createAgent }`         | Read the actual file and check exports           |
| Missing wiring     | Plan creates `src/auth/oauth.ts` but never registers it in the app         | Add a wiring step to the relevant phase          |
| Phantom package    | Plan uses `@auth/core` but it's not in package.json                        | Add install step or use what's already installed |
| Cross-slice import | Plan imports from `../memory/retrieval.ts` in a `channels/` file           | Use bus events or dependency injection instead   |
