# Known Limitations

Agent teams are experimental. Be aware of these issues:

---

## Task Coordination

- **Task status can lag**: teammates sometimes fail to mark tasks completed,
  blocking dependent tasks. If a task appears stuck, check the teammate's
  actual progress and update task status manually.
- **Teammates go idle between turns**: this is normal agent team behavior while
  waiting for dependencies — not a sign of failure.

## Session Management

- **No session resumption**: `/resume` and `/rewind` do not restore teammates
  after the lead session is resumed. Spawn new teammates if resuming a lead session.
- **One team per session**: clean up the current team before starting a new one.
- **Lead is fixed**: the session that creates the team is the lead for its
  lifetime. You can't promote a teammate to lead.

## Merge Timing

- **Never merge while agents are active**: worktree cleanup discards any
  in-progress work. Confirm ALL writing agents (test-writer, implementer(s),
  verifier) have sent completion reports AND their tasks show completed in
  `TaskList` before merging. An agent doing "extra" work beyond the merge
  criteria will lose that work silently.

## Shutdown

- **Shutdown can be slow**: teammates finish their current tool call before
  processing shutdown requests. Allow time for graceful shutdown before
  calling TeamDelete.
- **No nested teams**: teammates cannot spawn their own teams or teammates.

## Agent Recovery

- If an agent fails or times out, prefer `resume` (pass the agent's ID to the
  Agent tool's `resume` parameter) to continue with full context. Only re-spawn
  fresh if the agent's session is unrecoverable.
- If an agent produces work that doesn't match the design plan, message them
  with specific corrections rather than re-spawning.

## Cost Considerations

- Each teammate is a separate Claude instance with its own context window
- Token usage scales linearly with team size
- Broadcast messages (`type: "broadcast"`) scale with team size — use sparingly
- For 3 or fewer files, use the small scope optimization (single implementer)
  to avoid coordination overhead
