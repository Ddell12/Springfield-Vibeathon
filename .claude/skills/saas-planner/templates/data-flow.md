# Data Flow

<!--
MVP FOCUS: Convex schema design — what tables exist, how data relates, how it moves.
Convex is document-based with reactive queries. No SQL joins — denormalize or use
relationships via IDs. Don't design for scale — design for correctness at 100 users.
-->

## Convex Schema

<!-- Every table the app needs. This maps directly to convex/schema.ts -->

### {table_name}

- **What**: {description}
- **Created by**: {user action, webhook, or system event}
- **Contains PII**: {yes/no}
- **Real-time**: {do screens subscribe to this table?}

| Field | Type | Required | Notes |
|---|---|---|---|
| {field} | v.string() | yes | |
| {field} | v.id("other_table") | yes | Reference to {table} |
| {field} | v.optional(v.string()) | no | |

**Indexes**:
- `by_{field}` on `["{field}"]` — {why this index exists}

---

## Relationships

<!-- How tables reference each other. Convex uses document IDs, not foreign keys. -->

```
users ←── projects (userId)
  │
  └── subscriptions (userId)

projects ←── tasks (projectId)
  │
  └── files (projectId) → Convex file storage
```

---

## Key Data Flows

<!-- How data moves for each major action. One per core journey. -->

### Flow: {name}
**Trigger**: {what kicks it off}

```
Client (Next.js) → useMutation("table:create") → Convex mutation
                                                      ↓
                                              Validates + writes to DB
                                                      ↓
                                              All subscribed clients auto-update
```

**Happy path**: {what happens}
**Error path**: {what Convex returns on failure, what user sees}

### Flow: {AI feature name} (if applicable)
**Trigger**: {user clicks generate / submits form}

```
Client → useMutation("jobs:create") → Convex mutation (creates pending job)
                                           ↓
                                    ctx.scheduler.runAfter(0, "ai:process", {jobId})
                                           ↓
                                    Convex action calls Claude API
                                           ↓
                                    Action calls mutation to save result
                                           ↓
                                    Client sees result via reactive query (no polling)
```

---

## External Services

| Service | What For | Convex Integration | What Happens If Down |
|---|---|---|---|
| Clerk | Auth + user management | Webhook → HTTP action (verify with `svix`) → upsert user | Auth broken, app unusable |
| Stripe | Billing | Webhook → HTTP action → update subscription | Billing broken, features still work |
| Claude API | AI features | Convex action → Claude Agent SDK or raw `@anthropic-ai/sdk` | AI unavailable, show fallback |
| Resend | Transactional email | Convex Resend component | Emails fail silently, retry later |

---

## Storage

| Store | Tech | What's In It |
|---|---|---|
| Primary DB | Convex (built-in) | All entities — reactive, real-time |
| File storage (default) | Convex file storage | User uploads, generated files (<50MB) |
| File storage (large) | Cloudflare R2 | Assets >50MB, CDN-served public files, bulk storage |
| Vector store | {N/A / Convex vector search if needed} | {AI embeddings if RAG} |

**No separate cache layer needed** — Convex handles query caching internally.
**R2 only when needed** — Convex file storage handles most MVP use cases. Add R2 for large files, public CDN, or when Convex storage limits are hit.

### Cloudflare R2 (if applicable)

| Config | Value |
|---|---|
| Bucket name | {project-name}-assets |
| Public access | {yes — via R2 custom domain / no — signed URLs from Convex action} |
| Upload pattern | {Client → Convex action → presigned URL → client uploads to R2} |
| Serving | {R2 public URL or Convex action generates signed URL} |

---

## Data Sensitivity

| Table | PII Fields | MVP Approach |
|---|---|---|
| users | email, name (synced from Clerk) | Clerk manages PII; Convex stores minimal profile |

`[POST-MVP]` compliance needs: {GDPR data export/deletion, data retention policy}

---

## Convex-Specific Decisions

| Decision | Choice |
|---|---|
| ID format | Convex auto-generated IDs (v.id("table")) |
| Timestamps | `_creationTime` auto-provided; add `updatedAt` manually if needed |
| Soft delete | {yes — `deletedAt` field / no — hard delete} |
| Pagination | Convex `.paginate()` with cursor-based pagination |
| File uploads (small) | `generateUploadUrl()` → client uploads → `storage.getUrl()` to serve |
| File uploads (large) | Convex action generates R2 presigned URL → client uploads to R2 |
| Search | {Convex full-text search / Convex vector search / basic index queries} |
| Webhook verification | `svix` for Clerk webhooks, Stripe SDK for Stripe webhooks |
| Validation | Zod schemas for client-side + Convex `args` validators for server-side |

---

## Open Questions

- {question}
