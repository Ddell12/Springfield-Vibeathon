# Billing Flow

<!--
MVP FOCUS: How the app makes money using Stripe via the Convex Stripe component.
Webhooks are handled by Convex HTTP actions, not Next.js API routes.
Keep it simple — one free tier + one paid tier + Stripe Checkout.
If the app is free for MVP, note that and skip this artifact.
-->

## Pricing Model

| Field | Decision |
|---|---|
| Model | {Freemium / Free trial → paid / Flat subscription / Usage-based / Free for MVP} |
| Provider | Stripe via Convex Stripe component |
| Billing cycle | {Monthly / Annual / Both} |
| Stripe mode | {Stripe Checkout (hosted) / Stripe Elements (embedded)} |

---

## Plans

### {Plan Name} — Free
- **Price**: $0
- **Who it's for**: {persona}
- **Includes**: {bullet list of what's in this tier}
- **Limits**: {usage caps}
- **Stripe**: No Stripe product needed

### {Plan Name} — Paid
- **Price**: ${X}/mo
- **Stripe Price ID**: {price_xxx — create in Stripe Dashboard}
- **Who it's for**: {persona}
- **Includes**: {everything in free + ...}
- **Limits**: {higher caps or unlimited}

---

## Convex Stripe Component Setup

```
npm install @convex-dev/stripe
# Then register in convex/convex.config.ts:
# import stripe from "@convex-dev/stripe/convex.config";
# export default defineApp({ components: { stripe } });
```

| Config | Value |
|---|---|
| Stripe webhook secret | `STRIPE_WEBHOOK_SECRET` env var in Convex |
| Stripe secret key | `STRIPE_SECRET_KEY` env var in Convex |
| Publishable key | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Next.js |

### Convex Tables (managed by component)

The Stripe component manages its own tables. Your app links to them via user ID.

### Subscription Tracking in Your Schema

```typescript
// In your users table or a separate subscriptions table
{
  userId: v.id("users"),
  stripeCustomerId: v.optional(v.string()),
  plan: v.union(v.literal("free"), v.literal("pro")),
  subscriptionStatus: v.optional(v.string()), // "active", "cancelled", "past_due"
  currentPeriodEnd: v.optional(v.number()),
}
```

---

## Key Flows

### Upgrade (Free → Paid)
1. User hits limit or clicks "Upgrade"
2. → Client calls Convex action to create Stripe Checkout session
3. → Redirect to Stripe Checkout (hosted page)
4. → Payment succeeds → Stripe webhook fires
5. → Convex HTTP action receives webhook → verifies signature → updates user plan
6. → Client's reactive query sees `plan: "pro"` → UI updates instantly

### Downgrade / Cancel
1. User goes to Settings → Billing
2. → Client calls Convex action to create Stripe Customer Portal link
3. → User manages subscription in Stripe portal (cancel, update card)
4. → Stripe webhook fires on cancel → Convex updates `subscriptionStatus: "cancelled"`
5. → Access continues until `currentPeriodEnd`
6. → After period ends → Stripe webhook → Convex sets `plan: "free"`

### Trial (if applicable)
- Duration: {N days}
- Card required: {yes/no}
- Trial ending: {Stripe webhook `customer.subscription.trial_will_end` → Convex → email via Resend}
- After trial: {auto-charge if card on file / drop to free}

---

## Webhook Events to Handle

<!-- These come to Convex HTTP action, NOT Next.js API routes -->

| Stripe Event | Convex HTTP Action Does |
|---|---|
| `checkout.session.completed` | Link Stripe customer to Convex user, set plan to "pro" |
| `invoice.payment_succeeded` | Renew subscription, update `currentPeriodEnd` |
| `invoice.payment_failed` | Set status to "past_due", trigger email via Resend |
| `customer.subscription.deleted` | Set plan to "free", clear subscription fields |
| `customer.subscription.updated` | Update plan/status if changed |

### Webhook Verification

```typescript
// In convex/http.ts
import { httpRouter } from "convex/server";

const http = httpRouter();
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: /* Stripe component webhook handler with signature verification */
});
```

---

## What Users See

| Screen/Element | What's There |
|---|---|
| Pricing page | Plan cards, feature comparison, CTA buttons |
| Billing settings | Current plan, next billing date, "Manage" → Stripe portal |
| Upgrade prompts | Where in the app users see upgrade CTAs — limits, locked features |
| Payment success | Redirect back to app, plan updated via reactive query |
| Payment failure | Stripe handles on checkout page; past_due shows in-app banner |

---

## Edge Cases

- **Webhook arrives before redirect** → Fine — Convex updates reactively, user sees new plan on return
- **Webhook fails/delayed** → Stripe retries; user may see stale plan briefly, resolves on retry
- **User has ad blocker blocking Stripe** → Show fallback message with direct Stripe link
- **Double subscription** → Check for existing active subscription before creating checkout session
- **Plan change mid-cycle** → Let Stripe handle proration (default behavior)

---

## Open Questions

- {question}

`[POST-MVP]`: {annual pricing toggle, team billing, invoices, refund workflow, usage-based metering, dunning email sequence, coupon codes}
