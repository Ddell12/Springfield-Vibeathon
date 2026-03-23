# Worktree Isolation Guide

How the team lead manages git worktrees for safe parallel implementation.

---

## Why a Single Shared Worktree

Agent team teammates (spawned via `TeamCreate` + `Agent` with `team_name`) run
as separate Claude Code sessions but share the same working directory. The
`isolation: "worktree"` parameter on the Agent tool is designed for subagents,
not agent team teammates — teammates ignore it.

A single lead-managed worktree gives writing agents an isolated branch without
conflicting with the main working directory.

## Setup (Lead Does This Before Phase 3)

**Use the `superpowers:using-git-worktrees` skill** with branch name
`implement-<descriptor>`. The skill handles:

1. **Directory selection**: Checks for existing `.worktrees/` or `worktrees/`
   directories, then CLAUDE.md preferences, then asks the user
2. **Gitignore verification**: Ensures worktree directory is git-ignored
   (prevents accidentally tracking worktree contents)
3. **Dependency installation**: Runs `npm install` (or equivalent) automatically
4. **Baseline test verification**: Runs tests to confirm clean starting point

After the skill completes, save both values for spawn prompts and the merge phase:

- **Worktree path**: (returned by the skill)
- **Branch name**: `implement-<descriptor>`

## Agent Working Directory Assignment

| Agent Role     | Phase | Writes Code? | Working Directory |
| -------------- | ----- | ------------ | ----------------- |
| researcher     | 1     | No           | Main (read-only)  |
| architect      | 2     | No           | Main (read-only)  |
| test-writer    | 3     | **Yes**      | Shared worktree   |
| implementer(s) | 4     | **Yes**      | Shared worktree   |
| verifier       | 5     | **Yes**      | Shared worktree   |

Each writing agent must run `npm install` in the worktree as their first action.

## File Ownership Discipline

Every file is assigned to exactly one agent by the architect. Agents must only
write to their assigned files. If an agent needs a change in another agent's
file, they message the file owner through `SendMessage`.

This prevents merge conflicts and ensures clean worktree merges.

## Merging Back

**Pre-merge gate:** Verify ALL writing agents (test-writer, implementer(s),
verifier) have confirmed completion via `SendMessage` + `TaskUpdate`. Check
`TaskList` — every Phase 3-5 task must be completed. Never merge while a writing
agent is still active; their in-progress work is lost on worktree cleanup.

After all Phase 3-5 agents are confirmed done:

```bash
git merge implement-<descriptor> --no-ff -m "merge: implement-<descriptor> worktree"
```

On conflict: list conflicted files with `git diff --name-only --diff-filter=U`,
resolve trivially if possible, otherwise ask the user.

Run `npm install` after the merge completes.

## Cleanup

```bash
git worktree remove .claude/worktrees/implement-<descriptor> 2>/dev/null
git branch -d implement-<descriptor> 2>/dev/null
```
