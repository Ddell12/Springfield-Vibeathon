# Team Cleanup Guide

Steps the lead follows after delivering the implementation summary.

---

## 0. Verify All Agents Are Done

Before cleanup, confirm every writing agent's task shows completed in `TaskList`.
If any agent is still active, wait for their completion report — cleaning up the
worktree while an agent is working discards their in-progress changes.

## 1. Shut Down All Teammates

Send a shutdown request to each teammate individually:

```
SendMessage with type: "shutdown_request" and recipient: "<teammate-name>"
```

Do this for every teammate that was spawned. Teammates finish their current
tool call before processing shutdown — allow time for graceful shutdown.

## 2. Delete the Team

Once all teammates have shut down, call `TeamDelete` (takes no parameters).
All teammates must be stopped first or TeamDelete will fail.

## 3. Remove Worktree and Branch

```bash
git worktree remove .claude/worktrees/implement-<descriptor> 2>/dev/null
git branch -d implement-<descriptor> 2>/dev/null
```

## 4. Clean Up Scripts (Optional)

If the `scripts/setup-worktree.sh` or `scripts/cleanup-worktree.sh` created
any temporary files, verify they're gone.

## Notes

- **One team per session**: clean up the current team before starting a new one
- **No session resumption**: `/resume` and `/rewind` do not restore teammates
  after the lead session is resumed. Spawn new teammates if resuming.
- **Shutdown can be slow**: teammates finish their current tool call before
  processing shutdown requests.
