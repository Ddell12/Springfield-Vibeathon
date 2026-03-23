# Plan Verification Report

<!-- Sections marked (MANDATORY) always appear. (IF APPLICABLE) omitted when empty. -->
<!-- Every table column required — use "N/A" or "none" for empty cells. -->
<!-- Replace ALL placeholder rows — never ship examples. -->

> **Plan:** `[filename]` | **Score:** [X]/100 | **Verdict:** [Ship it | Needs fixes | Fix & re-verify | Major rework]
>
> [1-2 sentence summary. Lead with biggest risk or strongest endorsement.]

---

## Scorecard (MANDATORY)

<!-- Every deduction references issue IDs. Format: "P1(-8), P2(-2)" or "none". Score = Max - deductions. Floor at 0. -->

| Category       | Max     | Score   | Deductions                          |
| -------------- | ------- | ------- | ----------------------------------- |
| Paths & Lines  | 20      | [n]     | [issue IDs with amounts, or "none"] |
| APIs & Imports | 25      | [n]     | [issue IDs with amounts, or "none"] |
| Wiring         | 15      | [n]     | [issue IDs with amounts, or "none"] |
| Architecture   | 15      | [n]     | [issue IDs with amounts, or "none"] |
| Dependencies   | 10      | [n]     | [issue IDs with amounts, or "none"] |
| Logic          | 15      | [n]     | [issue IDs with amounts, or "none"] |
| **Total**      | **100** | **[n]** |                                     |

---

## Issues (MANDATORY)

<!-- One row per issue. ID format: P=Paths, A=APIs, W=Wiring, R=Architecture, D=Dependencies, L=Logic. -->
<!-- Severity: CRITICAL (blocks execution), WARNING (bugs/debt), SUGGESTION (scored at 0). -->
<!-- Zero issues: write "No issues found." and omit table. -->

| ID  | Severity | Deduction | Category | Issue (one line) | Fix (one line) |
| --- | -------- | --------- | -------- | ---------------- | -------------- |
| P1  | CRITICAL | -8        | Paths    | [description]    | [fix]          |

---

## Correction Manifest (MANDATORY — one entry per issue)

<!-- Every issue MUST have an entry with 4 fields: plan says, codebase has, exact correction (copy-paste ready), affected locations. -->

### P1 — [issue title]

**Plan says:** [incorrect text/code/path]

**Codebase has:** [actual state with evidence]

**Correction:** [exact replacement, copy-paste ready]

**Affected plan locations:** [tasks/phases]

---

## Wiring Audit (MANDATORY)

<!-- One row per NEW module. Status: OK, MISSING (with issue ID), PARTIAL. -->
<!-- No new modules: "No new modules — wiring audit not applicable." -->

| New Module | Wired Into | How | Status |
| ---------- | ---------- | --- | ------ |

---

## Completeness Checklist (MANDATORY)

<!-- Status: check, X, N/A. If X, Notes must say what's missing + issue ID. -->

| #   | Check             | Item                                              | Status | Notes |
| --- | ----------------- | ------------------------------------------------- | ------ | ----- |
| 1   | Schema changes    | `npx convex dev` step after schema modifications? | [s]    |       |
| 2   | Convex functions  | All new functions exported?                       | [s]    |       |
| 3   | Bus events        | New events have listeners registered?             | [s]    |       |
| 4   | Dashboard routes  | New pages have sidebar entries?                   | [s]    |       |
| 5   | Trigger.dev tasks | Deployment step mentioned?                        | [s]    |       |
| 6   | Barrel exports    | New public APIs in slice `index.ts`?              | [s]    |       |
| 7   | npm packages      | `npm install` step for new deps?                  | [s]    |       |
| 8   | Environment vars  | New env vars documented?                          | [s]    |       |
| 9   | Convex imports    | Dashboard uses path aliases?                      | [s]    |       |
| 10  | ESM compliance    | All local imports use `.js` extensions?           | [s]    |       |
| 11  | Test files        | Tests planned alongside implementation?           | [s]    |       |

---

## Dependency Verification (MANDATORY)

<!-- One row per external package in plan's code blocks. "API Verified?" = Reference file, Context7, WebSearch, or Not verified. -->

| Package | Required By | Installed? | Version | API Verified? | Notes |
| ------- | ----------- | ---------- | ------- | ------------- | ----- |

---

## API Spot-Checks (MANDATORY when 3+ external library calls)

<!-- One row per API verified. "Verified Via" = Reference file, Context7, WebSearch, Codebase read. -->
<!-- <3 calls: "Fewer than 3 external library calls — spot-checks not required." -->

| Library | API Used in Plan | Verified Via | Correct? | Notes |
| ------- | ---------------- | ------------ | -------- | ----- |

---

## Reuse Opportunities (IF APPLICABLE)

<!-- Omit if none. Replacement Code = exact import + usage, copy-paste ready. -->

| Existing Code | Location | Replaces Plan Code In | Replacement Code |
| ------------- | -------- | --------------------- | ---------------- |

---

## Over-Engineering Flags (IF APPLICABLE)

<!-- Omit if none. -->

| Location | Pattern | Recommendation |
| -------- | ------- | -------------- |

---

## Verified Correct (MANDATORY)

<!-- 3-8 bullets. Each names what was verified and evidence. -->

- [What was verified] — [evidence]
- [What was verified] — [evidence]
- [What was verified] — [evidence]

---

## Re-verification Delta (IF APPLICABLE — second+ verification only)

<!-- Every prior issue: FIXED, PERSISTS, or NEW. Score change breakdown mandatory. -->

| Status | ID  | Prior Issue | Current State |
| ------ | --- | ----------- | ------------- |

**Prior score:** [X]/100 → **Current score:** [Y]/100 ([+/-Z])

**Score change breakdown:**

- Fixed issues recovered: +[n] points
- Persisting issues: -[n] points
- New issues: -[n] points
- Net change: [+/-n]
