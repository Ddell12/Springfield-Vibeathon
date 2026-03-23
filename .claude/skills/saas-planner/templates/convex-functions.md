# Convex Function Inventory

<!--
MVP FOCUS: Every Convex function the app needs — queries, mutations, actions, HTTP actions.
This replaces a traditional API contract. Convex doesn't use REST endpoints;
the frontend calls functions directly via useQuery/useMutation/useAction.

Enough for a developer to build frontend and backend in parallel.
Pick conventions once and apply consistently.
-->

## Conventions

| Decision | Choice |
|---|---|
| Function style | Convex queries, mutations, actions (not REST) |
| Client access | `useQuery()`, `useMutation()`, `useAction()` from `convex/react` |
| Auth | `ctx.auth.getUserIdentity()` — returns Clerk identity or null |
| ID format | Convex auto-generated (`v.id("tableName")`) |
| Naming | `module:functionName` — camelCase (e.g., `projects:list`, `ai:generate`) |
| Internal functions | Prefix with `internal.` — not callable from client |
| Server validation | Convex `args` validators (type-safe, enforced at runtime) |
| Client validation | Zod schemas (shared between forms and API calls) |
| AI integration | Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) default / raw `@anthropic-ai/sdk` for trivial tasks |
| Error handling | Throw `ConvexError` for user-facing errors |

### Error Pattern

```typescript
import { ConvexError } from "convex/values";

// In mutations/queries
if (!user) throw new ConvexError("Not authenticated");
if (user.plan === "free" && count >= limit) {
  throw new ConvexError("Upgrade to pro for unlimited access");
}
```

Client catches via `useMutation` error handling or try/catch with `useAction`.

### Pagination

```typescript
// Query with pagination
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("items")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// Client
const { results, status, loadMore } = usePaginatedQuery(
  api.items.list, {}, { initialNumItems: 20 }
);
```

---

## Function Inventory

<!-- Group by module (file). Each module = one file in convex/ -->

### users

| Function | Type | Auth | Args | Returns | Notes |
|---|---|---|---|---|---|
| `users:current` | query | yes | none | User or null | Get authenticated user from Convex |
| `users:upsertFromClerk` | internalMutation | N/A | Clerk webhook data | void | Called by HTTP action on Clerk webhook |
| `users:deleteFromClerk` | internalMutation | N/A | clerkId | void | Called by HTTP action on user deletion |

### {resource} (repeat for each core resource)

| Function | Type | Auth | Args | Returns | Notes |
|---|---|---|---|---|---|
| `{resource}:list` | query | yes | paginationOpts, filters? | Paginated results | Only returns user's own items |
| `{resource}:get` | query | yes | id | Single item or null | Ownership check |
| `{resource}:create` | mutation | yes | {fields} | id | Validates + creates |
| `{resource}:update` | mutation | yes | id, {partial fields} | void | Ownership check + update |
| `{resource}:remove` | mutation | yes | id | void | {Soft delete / hard delete} |

### ai (if applicable)

| Function | Type | Auth | Args | Returns | Notes |
|---|---|---|---|---|---|
| `ai:generate` | mutation | yes | {input fields} | jobId | Creates pending job, schedules action |
| `ai:runAgent` | internalAction | N/A | jobId | void | `@anthropic-ai/claude-agent-sdk` — multi-step with tools |
| `ai:process` | internalAction | N/A | jobId | void | `@anthropic-ai/sdk` — simple one-shot tasks |
| `ai:saveResult` | internalMutation | N/A | jobId, result | void | Updates job record with AI output |

**Default to `ai:runAgent` (Claude Agent SDK `@anthropic-ai/claude-agent-sdk`)** for any feature that needs reasoning, tool use, or multi-step logic.
**Use `ai:process` (raw `@anthropic-ai/sdk`)** only for trivial tasks: classify, extract, summarize, label.

### billing (if applicable — Stripe Convex component)

| Function | Type | Auth | Args | Returns | Notes |
|---|---|---|---|---|---|
| `billing:createCheckout` | action | yes | priceId | Checkout URL | Creates Stripe Checkout session |
| `billing:getPortalUrl` | action | yes | none | Portal URL | Stripe customer portal link |
| `billing:getSubscription` | query | yes | none | Subscription info | Current plan/status |

### notifications (if applicable)

| Function | Type | Auth | Args | Returns | Notes |
|---|---|---|---|---|---|
| `notifications:list` | query | yes | none | Notification[] | User's unread notifications |
| `notifications:markRead` | mutation | yes | id | void | Mark single as read |
| `notifications:markAllRead` | mutation | yes | none | void | Mark all as read |

---

## HTTP Actions

<!-- For webhooks and any non-Convex client access -->

### convex/http.ts

| Method | Path | Source | What It Does | Auth |
|---|---|---|---|---|
| POST | /clerk-webhook | Clerk | User created/updated/deleted → upsert/delete Convex user | `svix` package signature verification |
| POST | /stripe-webhook | Stripe | Payment events → update subscription/plan | Stripe SDK signature verification |
| {POST} | {/ai/stream} | {Client} | {Streaming AI response} | {Clerk JWT} |

---

## File Operations (if applicable)

### Convex File Storage (default — files <50MB)

| Function | Type | Auth | What It Does |
|---|---|---|---|
| `files:generateUploadUrl` | mutation | yes | Get signed URL for client-side upload to Convex |
| `files:saveFile` | mutation | yes | Save file metadata after upload |
| `files:getUrl` | query | yes | Get serving URL for a stored file |

### Cloudflare R2 (large files / CDN — if needed)

| Function | Type | Auth | What It Does |
|---|---|---|---|
| `files:generateR2UploadUrl` | action | yes | Generate R2 presigned PUT URL |
| `files:confirmR2Upload` | mutation | yes | Save R2 file metadata after upload |
| `files:getR2Url` | query | yes | Return R2 public URL or generate signed URL |

---

## Screen → Function Map

<!-- Sanity check: every screen has the functions it needs -->

| Screen | Queries Used | Mutations Used | Actions Used |
|---|---|---|---|
| Dashboard | `{resource}:list`, `users:current` | | |
| Create form | | `{resource}:create` | |
| Detail page | `{resource}:get` | `{resource}:update`, `{resource}:remove` | |
| AI feature | `jobs:get` (reactive status) | `ai:generate` | |
| Settings | `users:current` | | |
| Billing | `billing:getSubscription` | | `billing:createCheckout`, `billing:getPortalUrl` |

---

## Convex Modules (File Structure)

```
convex/
├── _generated/          # Auto-generated by Convex
├── schema.ts            # Database schema (from Data Flow artifact)
├── auth.config.ts       # Clerk JWT provider config
├── http.ts              # HTTP router (webhooks)
├── crons.ts             # Cron jobs (from Background Jobs artifact)
├── users.ts             # User queries/mutations
├── {resource}.ts        # Per-resource functions
├── ai.ts                # AI-related functions (if applicable)
├── billing.ts           # Stripe-related functions (if applicable)
├── notifications.ts     # Notification functions (if applicable)
└── files.ts             # File upload/serve functions (if applicable)
```

---

## Open Questions

- {question}

`[POST-MVP]`: {API versioning, public API, rate limiting, webhook retry handling, batch operations, real-time presence}
