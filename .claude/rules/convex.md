# Convex Rules

## Schema

- Define all tables in `convex/schema.ts` using `defineTable` and `v` validators.
- Add indexes with `.index("by_field", ["field"])` — query without indexes is a full scan.
- Use `v.id("tableName")` for foreign key references, not plain strings.
- Use `v.optional(v.string())` for nullable fields; prefer optional over union with null.

## Functions

- **Queries**: `query({ args, handler })` — read-only, cached, reactive. Never mutate.
- **Mutations**: `mutation({ args, handler })` — transactional reads + writes. No external HTTP.
- **Actions**: `action({ args, handler })` — can call external APIs and schedule. Not transactional.
- Add `"use node";` directive at the top of files that use Node.js APIs (crypto, fs, child_process).
- All functions (including `internal*` variants) must be **exported** from their module to be registered.

## Export Conventions

- Public functions: exported and registered in `convex/` files, callable from the client.
- Internal functions: prefixed `internal` (`internalQuery`, `internalMutation`, `internalAction`) — only callable from other Convex functions, not the client.
- Never `export default` — use named exports only.

## Querying Patterns

- Chain query builders: `ctx.db.query("table").withIndex("by_field", q => q.eq("field", val)).collect()`.
- `QueryInitializer` and `Query` are different types — do not reassign after calling `.withIndex()`. Use `if/else` branches that return separate chains.
- Use `.first()` for single-row lookups; `.collect()` for arrays; `.paginate()` for paginated APIs.

## Relationships

- One-to-many: store the parent ID on the child. Query children with `withIndex`.
- Many-to-many: use a join table with both IDs and indexes on each.
- Avoid deeply nested data; prefer flat tables with references.

## Validators

- Always validate all args with `v` validators — never accept unvalidated `any`.
- Use `v.union(v.literal("a"), v.literal("b"))` for enum-like string fields.
- `v.object({})` for inline nested objects; prefer separate tables for complex nested data.

## Scheduling & Actions

- Use `ctx.scheduler.runAfter(ms, internal.foo.bar, args)` inside mutations/actions.
- Use `ctx.runMutation` / `ctx.runQuery` inside actions to call other functions.
- HTTP endpoints live in `convex/http.ts` using `httpRouter` and `httpAction`.
