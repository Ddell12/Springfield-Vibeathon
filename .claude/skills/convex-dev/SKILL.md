---
name: convex-dev
description: Generates Convex backend features — schemas, queries, mutations, actions, internal functions with validation, auth, and indexes. Use when creating tables, CRUD endpoints, or scaffolding a feature backend: "create a table", "add Convex functions", "scaffold backend".
---

# Convex Dev

Generate secure, type-safe Convex backend code following all best practices.

## When to Use

- Creating a new `convex/schema.ts` or adding tables
- Creating queries, mutations, actions, or internal functions
- Scaffolding a complete feature backend (schema + CRUD)
- Designing data model relationships and indexes

## Critical Patterns

| Operation      | Auth Failure  | Use Case                                         |
| -------------- | ------------- | ------------------------------------------------ |
| Query          | `return null` | Client `useQuery` hooks (enables loading states) |
| Internal Query | No auth check | Actions calling queries                          |
| Mutation       | `throw Error` | User-initiated writes                            |
| Action         | `throw Error` | External APIs, AI calls                          |

## Workflow

### 1. Gather Requirements

Ask:

- Table name (singular, camelCase)
- Required fields and types
- Which indexes needed
- Need actions for external APIs?

### 2. Generate Schema

Add to `convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tableName: defineTable({
    userId: v.string(),
    field: v.string(),
    status: v.union(v.literal("active"), v.literal("pending"), v.literal("archived")),
    optional: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_created", ["createdAt"]),
});
```

#### Schema Design Principles

1. **Document-Relational**: Flat documents with ID references, not deep nesting
2. **Index Foreign Keys**: Always index fields used in lookups
3. **Limit Arrays**: Only for small, bounded collections (<8192 items)
4. **Type Safety**: Strict validators with `v.*` types

#### Relationship Patterns

**One-to-Many:**

```typescript
posts: defineTable({
  userId: v.id("users"),
  title: v.string(),
}).index("by_user", ["userId"]),
```

**Many-to-Many (junction table):**

```typescript
projectMembers: defineTable({
  userId: v.id("users"),
  projectId: v.id("projects"),
  role: v.union(v.literal("owner"), v.literal("member")),
})
  .index("by_user", ["userId"])
  .index("by_project", ["projectId"])
  .index("by_project_and_user", ["projectId", "userId"]),
```

**Hierarchical:**

```typescript
comments: defineTable({
  postId: v.id("posts"),
  parentId: v.optional(v.id("comments")),
  text: v.string(),
})
  .index("by_post", ["postId"])
  .index("by_parent", ["parentId"]),
```

### 3. Generate Functions

Create `convex/{tableName}.ts` with all needed functions.

#### Query (return null, don't throw)

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { id: v.id("tableName") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const item = await ctx.db.get(args.id);
    if (!item || item.userId !== identity.subject) return null;

    return item;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("tableName")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});
```

#### Internal Query (for actions)

```typescript
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getInternal = internalQuery({
  args: { id: v.id("tableName") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
```

#### Mutation (can throw)

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("tableName", {
      ...args,
      userId: identity.subject,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("tableName"),
    title: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("active"), v.literal("completed"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== identity.subject) throw new Error("Not found");

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("tableName") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== identity.subject) throw new Error("Not found");

    await ctx.db.delete(args.id);
  },
});
```

#### Action (external APIs)

**Important:** Use `"use node"` at top of file when needing Node.js APIs (SDKs, crypto). Files with `"use node"` can ONLY contain actions, not queries or mutations — keep them in separate files.

```typescript
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const process = action({
  args: { id: v.id("tableName") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Use internal query (no auth context in runQuery)
    const item = await ctx.runQuery(internal.tableName.getInternal, { id: args.id });
    if (!item || item.userId !== identity.subject) throw new Error("Not found");

    const result = await someExternalOperation(item);

    await ctx.runMutation(api.tableName.update, {
      id: args.id,
      status: "completed",
    });

    return result;
  },
});
```

#### Internal Functions (backend-only)

```typescript
import { internalMutation } from "./_generated/server";

export const processExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("tasks")
      .withIndex("by_due_date", (q) => q.lt("dueDate", Date.now()))
      .collect();

    for (const task of expired) {
      await ctx.db.patch(task._id, { status: "expired" });
    }
  },
});
```

## Validator Reference

```typescript
v.string(); // string
v.number(); // number
v.boolean(); // boolean
v.null(); // null
v.id("tableName"); // document ID
v.optional(v.string()); // optional
v.array(v.string()); // array
v.object({ key: v.string() }); // object
v.record(v.string(), v.boolean()); // record (arbitrary keys)
v.union(v.literal("a"), v.literal("b")); // enum
v.any(); // any (avoid if possible)
```

## Index Strategy

1. **Single-field**: Simple lookups — `by_user: ["userId"]`
2. **Compound**: Filtered queries — `by_user_and_status: ["userId", "status"]`
3. **Remove redundant**: `by_a_and_b` usually covers `by_a` alone
4. **Vector search**: `vectorIndex("by_embedding", { vectorField, dimensions, filterFields })`

## Common Mistakes

- Throwing in queries (breaks React hydration / loading states)
- Using `ctx.runQuery(api.x.get)` in actions (no auth context — use internal queries)
- Forgetting `userId` filter (data leaks)
- Missing indexes (slow queries at scale)
- Mixing `"use node"` actions with queries/mutations in same file
- Using `.filter()` on queries instead of indexed queries
- Not defining `args` and `returns` validators

## Checklist

- [ ] Schema: all foreign keys indexed, compound indexes for query patterns
- [ ] Schema: arrays small and bounded (or converted to relations)
- [ ] Schema: enums use `v.union(v.literal(...))` pattern
- [ ] Functions: `args` and `returns` defined with validators
- [ ] Functions: auth check in all public functions
- [ ] Functions: ownership/authorization check
- [ ] Functions: all promises awaited
- [ ] Functions: queries return null on auth failure, mutations throw
- [ ] Actions: in separate `"use node"` file if using Node.js APIs
- [ ] Internal: scheduled functions use `internal.*` not `api.*`
