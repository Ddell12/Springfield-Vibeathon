# Gap Detection Heuristics

Rules for identifying design gaps, missing features, and architectural weaknesses.

## Code-Level Gaps

### Missing Implementations

- Functions/methods with `TODO`, `FIXME`, `HACK`, `XXX` comments
- Empty function bodies or `pass`/`throw new Error('not implemented')`
- Commented-out code blocks (dead code)
- `console.log` / `print` statements in production paths

### Test Gaps

- Feature slices with zero test files
- Test files that only test happy paths (no error/edge case tests)
- Missing integration tests between slices
- No e2e test directory or config

### Error Handling Gaps

- Catch blocks that swallow errors silently (`catch(e) {}`)
- Missing error boundaries in React components
- No global error handler / middleware
- Feature exceptions not mapped to HTTP status codes

## Architecture-Level Gaps

### VSA Violations (see vsa-patterns.md)

- Cross-slice direct imports
- Business logic in route handlers
- Fat core/ with feature-specific code
- Premature abstractions in shared/

### Missing Infrastructure

- No logging configuration
- No environment variable validation
- No database migration system
- No CI/CD configuration
- No authentication/authorization layer (if routes exist)

### Data Model Gaps

- Tables/collections without indexes on query fields
- Missing foreign key relationships
- No soft-delete pattern (if applicable)
- Inconsistent timestamp fields across models

## Staleness Indicators

From git-intel.json:

- Files not modified in 90+ days in an active project → potentially abandoned
- High-churn files (top 5 most-changed) → complexity hotspots, may need refactoring
- TODO count > 20 → accumulating tech debt (only surface as a gap card if count exceeds 20; do not show "healthy" observations — absence of a card implies health)
- Test files older than source files they test → tests may be outdated

## Priority Scoring

For the "what to do next" list, score each gap:

| Priority | Criteria                                                 |
| -------- | -------------------------------------------------------- |
| Critical | Blocks core functionality or causes data loss            |
| High     | Missing error handling, no tests on critical paths       |
| Medium   | Incomplete feature slices, stale code, missing docs      |
| Low      | Code style issues, optional optimizations, nice-to-haves |

## Output Format

Each gap in the action list should include:

```json
{
  "priority": "high",
  "category": "test-gap",
  "title": "Products slice has no tests",
  "why": "Business logic in service.py is untested",
  "effort": "moderate",
  "delegatable": true,
  "files": ["products/test_service.py (create)", "products/service.py (reference)"]
}
```

**Delegatability heuristic:** Tasks involving SSH, deploy, env config, credential management, or interactive CLI are `"delegatable": false` (Human badge). Tests, refactoring, code fixes, documentation, and mechanical changes are `"delegatable": true` (Agent badge).

**Effort tiers** (use instead of time estimates — more meaningful when AI agents do the work):

| Tier       | Meaning                                                   |
| ---------- | --------------------------------------------------------- |
| `trivial`  | Single file, mechanical change (rename, add index, etc.)  |
| `moderate` | Multiple files, some design decisions required            |
| `complex`  | Cross-cutting concern, new abstractions, or risky changes |
