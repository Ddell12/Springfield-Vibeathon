# Verification Checklist

Comprehensive post-merge verification for the verifier agent. Run checks in
order — later checks depend on earlier ones passing.

---

## 0. Worktree Health

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/worktree-health.sh [WORKTREE_PATH]
```

Run before any other checks. Verifies the worktree directory exists, is on the
correct branch, has node_modules, and has no lock conflicts.

## 1. TypeScript Compilation

```bash
npx tsc --noEmit
```

Zero errors required. If errors exist, categorize by file owner and report
back to the lead with file paths and error messages.

## 2. Test Suite

```bash
npx vitest run
```

All tests must pass — both existing and newly written. If a test fails:

- Read the failing test to understand what it expects
- Read the implementation file to identify the mismatch
- Determine if the **test** or the **implementation** is wrong:
  - If the implementation doesn't match the test's expected behavior → implementation bug
  - If the test has an impossible assertion or wrong import path → test bug
- Report the diagnosis to the lead with: file path, test name, expected vs actual, your assessment

## 3. Lint

```bash
npx eslint --no-warn-ignored .
```

Focus on errors, not warnings. Common issues after multi-agent implementation:

- Missing or incorrect `.js` extensions on ESM imports
- Unused imports from coordination artifacts
- Cross-slice imports that violate boundary rules

## 3.5. File Ownership

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/check-file-ownership.sh <design-plan-file> [WORKTREE_PATH]
```

Validates that:

- No file is assigned to more than one agent (prevents merge conflicts)
- Every file in the architect's plan exists in the worktree
- No unplanned files were created (warnings, not errors)

## 4. Structural Verification

Check these by reading the relevant files:

- **Barrel exports**: every new public module is exported from its slice's `index.ts`
- **Import paths**: test files import from the paths specified in the design plan
- **File plan compliance**: every file in the architect's plan exists and has content
- **No debug artifacts**: no `console.log`, `debugger`, or `// TODO: remove` in production code

## 5. Cross-Reference Checks

- Every function the tests import is actually exported by the implementation
- Every type referenced in tests matches the implementation's type definitions
- No circular imports introduced between new modules

## 6. Cross-Reference (Greptile)

If greptile MCP is available, use `mcp__plugin_greptile_greptile__search_greptile_comments`
to verify that new code integrates correctly with existing patterns:

- Search for similar patterns to confirm consistency
- Verify event bus subscriptions match emitters
- Check that new exports are imported where expected

This is an optional enhancement — skip if greptile is not configured.

## 7. Plan File Cross-Reference

If a plan file with YAML frontmatter was provided (via `--plan-file` flag on verify.sh):

- Cross-reference `git diff --name-only` against the plan's `files.create` and `files.modify` lists
- Report any planned files that are missing from the diff (not implemented)
- Report any diff files that are not in the plan (unplanned changes)
- Verify domain_tags match the actual slices modified

## 8. Convention Compliance

- Files use ESM (`import`/`export`, not `require`/`module.exports`)
- Local imports use `.js` extensions
- Node builtins use `node:` prefix
- Files follow kebab-case naming
- Functions use camelCase, types use PascalCase, constants use UPPER_SNAKE

## Feedback Loop

After each verification pass:

1. Collect all failures into a structured report
2. Send the report to the lead via `SendMessage`
3. If the lead asks you to fix issues directly (merge artifacts, missing exports),
   fix them and re-run the affected checks
4. If the lead routes fixes to implementers, wait for their completion message,
   then re-run the full checklist
5. Repeat until all checks pass — send a final "all clear" message to the lead
