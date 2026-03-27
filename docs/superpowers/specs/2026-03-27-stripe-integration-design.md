# Stripe Integration — Design Spec

> **Date:** 2026-03-27
> **Status:** Approved
> **Scope:** Free + Premium ($9.99/mo) subscription billing via `@convex-dev/stripe` component

---

## 1. Objective

Add subscription billing to Bridges so that free users are gated on usage limits and can upgrade to Premium for unlimited access. Use the `@convex-dev/stripe` Convex component to handle Checkout Sessions, webhook sync, and Customer Portal — minimizing custom code.

### Success Criteria

- Free users can build and save up to 5 apps and 3 flashcard decks
- Upgrade flow takes the user to Stripe-hosted checkout and back in under 60 seconds
- Subscription state syncs reactively — UI updates without page refresh after payment
- Premium users have no usage limits
- Users can cancel via Stripe Customer Portal (self-service)

---

## 2. Tier Structure

| | Free | Premium ($9.99/mo) |
|---|---|---|
| Saved apps | 5 | Unlimited |
| Flashcard decks | 3 | Unlimited |
| Templates | Basic set | Full library |
| TTS | Communication boards only | Priority TTS everywhere |
| Image generation | Standard | Custom image upload |

Unauthenticated users continue to use the builder freely. Limits only apply once a user signs in and starts saving/persisting work.

---

## 3. Technical Architecture

### 3.1 Component Wiring

The `@convex-dev/stripe` component (v0.1.3) registers in `convex/convex.config.ts` alongside existing components:

```typescript
// convex/convex.config.ts
import rag from "@convex-dev/rag/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import stripe from "@convex-dev/stripe/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(rag);
app.use(rateLimiter);
app.use(stripe);

export default app;
```

The component manages its own isolated tables (`stripe_customers`, `stripe_subscriptions`, `stripe_payments`, `stripe_invoices`, `stripe_checkoutSessions`). No changes to `convex/schema.ts`.

### 3.2 Webhook Route

The `registerRoutes` function (a named export from `@convex-dev/stripe`) adds a `/stripe/webhook` path to `convex/http.ts`, alongside the existing `/api/rag/search` route. Handles signature verification and event dispatch internally.

```typescript
// convex/http.ts (additions)
import { registerRoutes } from "@convex-dev/stripe";
import { components } from "./_generated/api";

// ... existing httpRouter setup ...

registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
});

export default http;
```

### 3.3 Data Flow

```
User clicks "Upgrade"
  → Convex action creates Stripe Checkout Session (mode: "subscription")
  → User redirected to Stripe-hosted checkout page
  → Stripe processes payment
  → Webhook hits {convex-site}/stripe/webhook
  → Component syncs subscription to internal tables
  → useEntitlements() reactively updates UI (no refresh needed)
```

### 3.4 Entitlements Layer

A thin app-level layer that reads component data and maps it to plan/limits:

```
convex/subscriptions.ts           — queries + actions wrapping the component
src/core/hooks/use-entitlements.ts — React hook wrapping the Convex query
```

The entitlements query logic:

- No subscription (or status `canceled`) → `"free"`
- Active subscription with Premium price ID → `"premium"`

Feature code checks:

```typescript
const { plan, limits } = useEntitlements();
if (plan === "free" && appCount >= limits.maxApps) {
  // show upgrade prompt instead of save action
}
```

Limit enforcement also happens server-side in the existing mutations that create apps and decks (e.g., `convex/apps.ts`, `convex/flashcard_decks.ts`). Before inserting a record, these mutations query the user's subscription status from the component's tables and count existing records. If the user is free and at the limit, the mutation throws. Convex mutations are transactional, so two concurrent saves can't both succeed past the limit.

```typescript
// Example: server-side enforcement in an app save mutation
const userId = (await ctx.auth.getUserIdentity())?.subject;
if (userId) {
  const isPremium = await checkPremiumStatus(ctx, userId); // reads component tables
  if (!isPremium) {
    const apps = await ctx.db
      .query("apps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (apps.length >= FREE_LIMITS.maxApps) {
      throw new Error("Free plan limit reached. Upgrade to Premium for unlimited apps.");
    }
  }
}
```

---

## 4. Stripe Configuration (Dashboard)

Create in Stripe Dashboard (test mode first, then live):

- **Product:** "Bridges Premium"
- **Price:** $9.99/month, recurring
- **Customer Portal:** Enable subscription cancellation, payment method updates
- **Webhook endpoint:** `https://{convex-deployment}.convex.site/stripe/webhook`
- **Webhook events:** `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`

---

## 5. Files Changed/Added

| File | Type | Description |
|---|---|---|
| `convex/convex.config.ts` | Modified | Add stripe component registration |
| `convex/http.ts` | Modified | Register stripe webhook routes via `registerRoutes()` |
| `convex/subscriptions.ts` | New | Entitlements queries, checkout session action, portal session action |
| `src/core/hooks/use-entitlements.ts` | New | React hook: `useEntitlements()` → `{ plan, limits }` |
| `src/features/billing/components/upgrade-prompt.tsx` | New | Inline upgrade card shown at limit gates |
| `src/features/billing/components/billing-section.tsx` | New | Settings page section: plan info + manage button |
| `src/features/settings/components/settings-page.tsx` | Modified | Add billing section |
| `src/features/settings/components/settings-sidebar.tsx` | Modified | Add "billing" to SECTIONS array and labels |
| `src/features/builder/` (gating points) | Modified | Gate app save on free limit |
| `src/features/flashcards/` (gating points) | Modified | Gate deck creation on free limit |

**No changes to `convex/schema.ts`** — the component uses isolated tables.

---

## 6. Billing UI

### 6.1 Upgrade Touchpoints

**Contextual soft gate:** When a free user hits a limit (e.g., tries to save a 6th app), an inline card appears where the action would normally happen. Not a blocking modal — a gentle prompt. The app they just built stays in the preview; nothing is lost.

**Settings billing section:** New section in the existing Settings page showing current plan, usage stats, and upgrade/manage button. Premium users see "Manage Subscription" which opens Stripe Customer Portal.

### 6.2 Checkout Flow

1. User clicks "Upgrade" (contextual prompt or settings page)
2. Convex action creates Checkout Session with Clerk `userId` as metadata
3. Redirect to Stripe-hosted checkout (handles card input, 3D Secure, Apple/Google Pay)
4. After payment, redirect back to `/settings?billing=success`
5. Webhook fires → component syncs → `useEntitlements()` reactively updates
6. User sees plan change in real-time

### 6.3 Why Stripe-Hosted Checkout

- Handles all payment complexity: validation, 3D Secure, retry UI, mobile layout, Apple Pay / Google Pay
- Zero PCI surface area in our code
- For a single-price subscription, embedding Payment Element adds UI complexity with no user benefit

### 6.4 Cancellation

Entirely through Stripe Customer Portal. User clicks "Manage Subscription" in Settings → Stripe shows portal → user cancels there. Webhook fires → entitlements downgrade to Free. Existing apps are preserved — user just can't create beyond the free limit.

### 6.5 No Pricing Page (v1)

No standalone `/pricing` page. Upgrade is contextual (hit a limit) or via Settings. A dedicated pricing page is a post-launch marketing concern.

---

## 7. Error Handling

| Scenario | Handling |
|---|---|
| Checkout abandoned | No-op. No subscription created, user stays on Free. Sessions expire after 24h. |
| Webhook arrives before redirect | Safe — reactive queries update UI whenever data lands. |
| Payment fails (card declined) | Stripe's checkout handles retry UI. No webhook fires, user stays Free. |
| Subscription lapses (renewal failure) | Stripe retries per configured schedule. On final failure, `customer.subscription.deleted` webhook fires → downgrade to Free. Existing apps preserved. |
| Webhook delivery fails | Stripe retries with exponential backoff for up to 3 days. Component handles idempotency. |
| User deletes Clerk account | Stripe subscription orphaned. Manual cleanup acceptable for v1 (rare edge case). |
| Concurrent saves at limit | Mutation-level count check is transactional — second save rejects. |

---

## 8. Environment Variables

### Convex Dashboard (server-side)

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe API calls (checkout, portal) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |

### `.env.local` (client-side, optional for v1)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Not required for hosted checkout, but set up for future embedded forms |

---

## 9. Testing Strategy

### Unit Tests (Vitest + convex-test)

- `useEntitlements()` returns correct plan for each subscription state (`active`, `canceled`, `past_due`, no subscription)
- Limit enforcement: mutation rejects app creation at limit for free users, allows for premium
- Checkout session creation action returns a valid URL shape

### Integration Tests

- Stripe test mode + test clock for subscription lifecycle
- Webhook signature verification with test payloads

### Manual QA

- Stripe CLI (`stripe listen --forward-to`) to forward webhooks to local Convex dev
- Test cards: `4242424242424242` (success), `4000000000000002` (declined)

---

## 10. Out of Scope (v1)

- Clinic plan ($29.99/mo per seat) — deferred to v2
- Standalone `/pricing` page
- Usage-based billing or metered pricing
- Proration for mid-cycle plan changes
- Automated cleanup of orphaned Stripe subscriptions on Clerk account deletion
- Free trial period
