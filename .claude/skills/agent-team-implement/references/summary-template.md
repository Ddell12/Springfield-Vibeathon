# Implementation Summary Template

Use this template when delivering the final report to the user after all
verification passes.

---

```markdown
## Implementation Summary

**Feature**: [what was built]
**Approach**: TDD (Red-Green) with worktree isolation
**Team**: [number] agents across [number] phases
**Domain Tags**: [tags from plan frontmatter, if applicable]

### Tests Written (Red Phase)

- [test file]: [N] tests — [what they cover]
- [test file]: [N] tests — [what they cover]
- **Total**: [N] tests

### Files Created/Modified (Green Phase)

- [file path] (CREATE) — [one-line description]
- [file path] (MODIFY) — [what changed]

### Verification Results

- TypeScript: PASS (zero errors)
- Tests: [N]/[N] passing
- Lint: PASS (zero errors)
- Structural checks: PASS

### Design Decisions

- [key decision and rationale]
- [key decision and rationale]

### Known Limitations

- [scope limitation or follow-up work needed]
- [edge case not covered]

### Tracking

- Linear issues updated: [yes/no, issue IDs if applicable]
- Plan verification score: [score from plan-verifier, if run]
- Plan pre-flight: [pass/fail from plan-reviewer]
```
