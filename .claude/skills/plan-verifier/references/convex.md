# Convex

Last updated: 2026-03-06

Sources: [Convex Best Practices](https://docs.convex.dev/understanding/best-practices/), [The Zen of Convex](https://docs.convex.dev/understanding/zen), [TypeScript Best Practices](https://docs.convex.dev/understanding/best-practices/typescript), [10 Essential Tips for Convex Developers](https://www.schemets.com/blog/10-convex-developer-tips-pitfalls-productivity), [Community Guidelines Gist](https://gist.github.com/srizvi/966e583693271d874bf65c2a95466339), [Context7 Convex Docs](https://docs.convex.dev)

---

## Quick Reference

| Pattern                      | Correct                                                                                                                      | Wrong                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Function visibility          | `query`/`mutation`/`action` = public (`api.*`); `internalQuery`/`internalMutation`/`internalAction` = private (`internal.*`) | Mixing up public vs internal references                          |
| Scheduling/ctx.run\* targets | Always use `internal.*` references                                                                                           | Using `api.*` (public) functions from server-side code           |
| Query filtering              | `.withIndex("by_field", q => q.eq("field", val))`                                                                            | `.filter()` on large tables (full scan)                          |
| Collecting results           | `.take(n)`, `.first()`, `.paginate()` for large sets                                                                         | `.collect()` on unbounded queries (1000+ docs)                   |
| Batch mutations              | Single mutation processing all items in one transaction                                                                      | Loop calling separate mutations from an action                   |
| Auth checks                  | `ctx.auth.getUserIdentity()` in every public function                                                                        | Client-only auth checks or spoofable args like email             |
| Helper functions             | Plain TypeScript functions in `convex/model/`                                                                                | `ctx.runAction()` for plain TS logic                             |
| Sequential reads in actions  | Single combined query returning all needed data                                                                              | Multiple `ctx.runQuery()` calls (separate transactions)          |
| Date/time in queries         | Computed boolean field updated by scheduler                                                                                  | `Date.now()` in query logic (stale cache, frequent invalidation) |
| File metadata                | `ctx.db.system.get(storageId)` on `_storage` table                                                                           | Deprecated `ctx.storage.getMetadata()`                           |
| Cron scheduling              | `crons.interval()` or `crons.cron()`                                                                                         | `crons.hourly()`, `crons.daily()`, `crons.weekly()` (deprecated) |
| Record types                 | `v.record(v.id("users"), v.string())`                                                                                        | `v.map()` or `v.set()` (unsupported)                             |
| Integer types                | `v.int64()`                                                                                                                  | `v.bigint()` (deprecated)                                        |
| Exports                      | Named exports only; all functions must be exported                                                                           | `export default` or unexported functions                         |

---

## Best Practices (Non-Obvious)

- **Keep documents flat.** Link via `v.id("tableName")` references. Nested arrays of objects make updates painful.
- **Remove redundant indexes.** `by_foo` + `by_foo_and_bar` → only need the latter (prefix matching).
- **Use discriminated unions** for flexible shapes: `v.union(v.object({ kind: v.literal("error"), ... }), ...)`.
- **Reuse validators** across functions and schema to avoid drift.
- **Record intent first, then schedule.** Write a `status: "pending"` record, then `ctx.scheduler.runAfter(0, internal.worker.process, {...})`.
- **Use `ctx.runMutation` within mutations** only for intentional partial rollback.
- **Specify return validators** (`returns: v.null()`) for end-to-end type safety.
- **`QueryInitializer` and `Query` are different types.** Use if/else branching, not variable reassignment after `.withIndex()`.

---

## Known Gotchas

1. **[PROJECT] Unexported functions are invisible.** All Convex functions MUST be exported to be registered. Silently fails at runtime.

2. **[PROJECT] Generated types lag behind code.** `api.d.ts` only updates when `npx convex dev` runs. Use `as any` cast as temporary workaround.

3. **[PROJECT] `ConvexHttpClient` typing limitation.** `.query()`/`.mutation()` only accept `api.*`. `internal.*` requires `@ts-expect-error`.

4. **[PROJECT] `QueryInitializer` vs `Query` types.** Reassignment after `.withIndex()` fails. Use if/else branching.

5. **Unawaited promises silently fail.** Forgetting `await` on `ctx.scheduler.runAfter`, `ctx.db.patch` etc. — operation may not execute.

6. **Actions are NOT transactional.** Multiple `ctx.runMutation()` calls run in separate transactions.

7. **`Date.now()` in queries breaks reactivity.** Cache won't re-evaluate when time passes.

8. **`.collect()` on large tables is a performance bomb.** Loads all documents into memory.

9. **`ctx.storage.getMetadata()` is deprecated.** Use `ctx.db.system.get(storageId)`.

10. **`crons.hourly()`/`.daily()`/`.weekly()` deprecated.** Use `crons.interval()` or `crons.cron()`.

11. **[PROJECT] `@convex-dev/rag` `deleteNamespaceSync` requires ALL entries deleted first.** Use paginated `deleteAsync`.

12. **[PROJECT] `@convex-dev/rag` search modes:** `"vector"` (default), `"text"` (FTS), `"hybrid"` (RRF). Hybrid requires string query, not embedding array.

---

## Common Plan Mistakes

1. **Confusing public vs internal.** `query`/`mutation`/`action` = `api.*`. `internal*` = `internal.*`. Scheduler/crons/`ctx.run*` must target `internal.*`.

2. **Missing exports.** Every function must be an exported named constant.

3. **Using `ctx.runAction` for plain logic.** Only use when crossing runtimes (Node.js). Call helpers directly otherwise.

4. **Forgetting index definitions.** Every `.withIndex()` requires a matching `.index()` in schema.

5. **Calling external APIs from mutations.** Mutations cannot `fetch()`. Use actions + mutation for results.

6. **Using `.filter()` liberally.** It loads all docs then filters in memory. Use `.withIndex()`.

7. **Omitting argument validators.** Every public function needs explicit `args` validators. Use `v.id("table")` for IDs.

8. **Mixing `"use node"` incorrectly.** Only add on files using Node.js APIs.

---

## Non-Obvious API Patterns

### Conditional Query with Index Branching

```typescript
// Branch instead of reassigning (QueryInitializer vs Query types)
if (channelId) {
  return await ctx.db
    .query("messages")
    .withIndex("by_channel", (q) => q.eq("channelId", channelId))
    .take(100);
}
if (authorId) {
  return await ctx.db
    .query("messages")
    .withIndex("by_author", (q) => q.eq("authorId", authorId))
    .take(100);
}
return await ctx.db.query("messages").order("desc").take(100);
```

### Reusable Validators

```typescript
export const statusValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("completed"),
);
export const taskFields = {
  title: v.string(),
  status: statusValidator,
  assigneeId: v.optional(v.id("users")),
};
// Use in schema: defineTable(taskFields).index("by_status", ["status"])
// Use in args: mutation({ args: { ...taskFields }, handler: ... })
```

### Partial Rollback

```typescript
export const trySend = mutation({
  args: { body: v.string(), author: v.string() },
  handler: async (ctx, { body, author }) => {
    try {
      await ctx.runMutation(internal.messages.send, { body, author }); // rolls back on error
    } catch (e) {
      await ctx.db.insert("failures", { kind: "SendFailed", body, author, error: String(e) }); // outer continues
    }
  },
});
```
