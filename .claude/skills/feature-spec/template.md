# [Feature Name]

**Date:** YYYY-MM-DD
**Status:** Draft

## Objective

<!-- 2-3 sentences: What this feature does and why it matters. End with a concrete definition of done — what's true when this ships that isn't true today? -->

## Background

<!-- What exists today that's relevant. What's broken, missing, or insufficient. Include key file paths as exploration starting points for plan mode (e.g., "Context assembly is in src/context.ts"). -->

## Desired Behavior

<!-- Concrete "When X, then Y" scenarios. Cover happy path first, then edge cases, then error conditions. Aim for 3-8 scenarios. Each becomes a verification target for plan mode. -->

- When [trigger/action], then [expected behavior]
- When [edge case], then [graceful handling]
- When [error condition], then [expected response]

## Requirements

**Must-have (v1):**
- [ ] ...

**Nice-to-have (fast follow):**
- [ ] ...

**Future (design for, don't build):**
- ...

## Boundaries

**Always (invariants — plan mode must preserve these):**
<!-- Existing behaviors, permissions, or contracts that must not break. Be specific: name the files, APIs, or rules. -->
- ...

**Ask first (flag these decisions for review before proceeding):**
<!-- Decisions with significant impact: new dependencies, schema changes, API surface changes, permission model changes. -->
- ...

**Never (hard constraints — plan mode must not do these):**
<!-- Scope traps and over-engineering risks. Be explicit about what NOT to build. -->
- ...

## Dependencies

<!-- What must already exist or be true for this feature to work? Existing services, data, config, or prior features this depends on. Write "None" if standalone. -->

- ...

## Technical Pointers

<!-- Give plan mode starting points for codebase exploration — not prescriptions. -->

- **Key files:** <!-- Most relevant source files and what they do (e.g., "src/context.ts — context assembly pipeline") -->
- **Data model:** <!-- Relevant tables, schemas, or data structures. Link to schema files if applicable. -->
- **Patterns to follow:** <!-- Existing patterns in the codebase this feature should match (e.g., "Follow the channel adapter pattern in src/channels/") -->
- **Integration points:** <!-- External services, APIs, or systems this touches -->

## Risks & Mitigations

<!-- What could go wrong? Data loss, breaking changes, performance issues, security concerns. For each risk, note the mitigation strategy or why it's acceptable. Write "None identified" if low-risk. -->

- **Risk:** ... → **Mitigation:** ...

## Verification

**Automated:**
- [ ] `npm run typecheck` passes
- [ ] ...

**Manual:**
<!-- Specific manual checks: "Send X, verify Y appears", "Open Z, confirm W". -->
- [ ] ...

**Regression:**
- [ ] Existing [related feature] still works
- [ ] Build succeeds cleanly

## Open Questions

- **Blocking (must resolve before planning):** ...
- **Non-blocking (plan mode can resolve during exploration):** ...

## Out of Scope

<!-- Explicitly list what this feature does NOT include. Helps prevent scope creep during planning and implementation. -->

- ...
