# Permissions Matrix

<!--
MVP FOCUS: Who can do what. Keep it simple — most MVPs have 2-3 roles max.
Auth is Clerk. Roles are enforced in Convex via the auth identity.
Don't build elaborate RBAC unless the app requires it.
-->

## Roles

| Role | Who | Default? | How Assigned |
|---|---|---|---|
| User | Free tier user | yes | Clerk signup → webhook → Convex user |
| {Pro User} | Paid tier | no | Stripe payment → webhook → role update |
| Admin | You / internal | no | Manual seed or Clerk metadata |

---

## Permission Matrix

<!-- ✅ = yes, ❌ = no, 🔢 = limited (with limit noted) -->

| Resource / Action | User | {Pro} | Admin |
|---|---|---|---|
| {View dashboard} | ✅ | ✅ | ✅ |
| {Create [thing]} | 🔢 ({N}/mo) | ✅ | ✅ |
| {Delete [thing]} | own only | own only | ✅ all |
| {AI feature} | ❌ | ✅ | ✅ |
| {View all users} | ❌ | ❌ | ✅ |
| {Billing settings} | own | own | all |

---

## Feature Gating (if tiers exist)

| Feature | Free | Paid | Enforcement |
|---|---|---|---|
| {feature} | {yes/limited} | {yes} | {Convex mutation checks user.plan} |

**Where limits are checked**: Convex mutations (server-side, authoritative). Never trust the client.

---

## Clerk Auth Configuration

| Decision | Choice |
|---|---|
| Clerk mode | {Hosted pages / Embedded components / Custom} |
| Sign-in methods | {Email + password, Google OAuth, GitHub OAuth} |
| Session type | JWT — Clerk issues, Convex validates |
| User sync | Clerk webhook → Convex HTTP action → upsert `users` table (verify with `svix`) |
| Role storage | {Clerk publicMetadata / Convex `users.role` field / both} |
| Middleware | `clerkMiddleware()` in `src/proxy.ts` (Next.js 16+) — protects NO routes by default (opt-in via `createRouteMatcher`) |
| Public routes | {/, /sign-in, /sign-up} — all routes are public by default; protect specific routes with `auth.protect()` |

### Convex Auth Flow

```
1. User signs up/in via Clerk
2. Clerk issues JWT with user identity
3. ConvexProviderWithClerk (from convex/react-clerk) passes JWT to Convex
4. Convex validates JWT via auth.config.ts → ctx.auth.getUserIdentity()
5. Clerk webhook fires → Convex HTTP action (svix signature check) → upsert users table
6. Convex mutations check ctx.auth + users table for role/permissions
```

### Middleware Setup (Next.js 16+)

```typescript
// src/proxy.ts (was middleware.ts before Next.js 16)
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/app(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

---

## Edge Cases to Handle

- **Free user hits limit** → {show upgrade CTA / soft block / hard block}
- **Direct link to pro feature** → {show paywall / redirect / 403 page}
- **Clerk session expires mid-use** → {Clerk auto-refreshes / redirect to sign-in}
- **Webhook delivery failure** → {user exists in Clerk but not Convex — show "setting up" state, retry}
- **Multiple devices/tabs** → {Convex real-time keeps all in sync}

`[POST-MVP]`: {team/org permissions, SSO, MFA enforcement, granular RBAC, Clerk organizations}

---

## Open Questions

- {question}
