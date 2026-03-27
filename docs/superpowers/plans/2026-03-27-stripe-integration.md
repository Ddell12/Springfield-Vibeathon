# Stripe Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Free + Premium ($9.99/mo) subscription billing to Bridges using the `@convex-dev/stripe` Convex component.

**Architecture:** Install `@convex-dev/stripe` component for Checkout Sessions, webhook sync, and Customer Portal. Add a thin entitlements layer (`convex/subscriptions.ts` + `useEntitlements()` hook) that maps subscription state to plan/limits. Gate app and deck creation server-side in existing mutations. Two new UI components: `UpgradePrompt` (inline) and `BillingSection` (settings).

**Tech Stack:** `@convex-dev/stripe`, Convex (queries/mutations/actions), Clerk auth (`identity.subject`), Next.js App Router, shadcn/ui, Tailwind v4

**Spec:** `docs/superpowers/specs/2026-03-27-stripe-integration-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `convex/convex.config.ts` | Add stripe component registration |
| `convex/http.ts` | Register stripe webhook routes |
| `convex/lib/billing.ts` | **New.** Plan constants and `checkPremiumStatus` helper (no `"use node"`) |
| `convex/subscriptions.ts` | **New.** Entitlements query, checkout action, portal action (`"use node"`) |
| `convex/schema.ts` | Add `by_user` index to `apps` table (missing, needed for limit enforcement) |
| `convex/apps.ts` | Add free-tier limit check (with premium bypass) to `create` and `ensureForSession` |
| `convex/flashcard_decks.ts` | Add free-tier limit check (with premium bypass) to `create` |
| `src/core/hooks/use-entitlements.ts` | **New.** React hook wrapping the entitlements query |
| `src/features/billing/components/upgrade-prompt.tsx` | **New.** Inline upgrade card shown at limit gates |
| `src/features/billing/components/billing-section.tsx` | **New.** Settings page billing section |
| `src/features/settings/components/settings-page.tsx` | Add billing section + update type |
| `src/features/settings/components/settings-sidebar.tsx` | Add "billing" to SECTIONS array |

---

## Task 1: Install `@convex-dev/stripe` and Wire Component

**Files:**
- Modify: `package.json`
- Modify: `convex/convex.config.ts`

- [ ] **Step 1: Install the package**

Run: `npm install @convex-dev/stripe stripe`

- [ ] **Step 2: Register the component in convex.config.ts**

```typescript
// convex/convex.config.ts
import rag from "@convex-dev/rag/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import stripe from "@convex-dev/stripe/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(rag);
app.use(rateLimiter);
app.use(stripe);

export default app;
```

- [ ] **Step 3: Verify Convex accepts the component**

Run: `npx convex dev --once`
Expected: Convex pushes successfully, component tables created.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json convex/convex.config.ts
git commit -m "chore: install @convex-dev/stripe and register component"
```

---

## Task 2: Register Webhook Routes in HTTP Router

**Files:**
- Modify: `convex/http.ts`

- [ ] **Step 1: Add stripe webhook route registration**

Add these imports and the `registerRoutes` call **before** the `export default http` line in `convex/http.ts`:

```typescript
import { registerRoutes } from "@convex-dev/stripe";
import { components } from "./_generated/api";
```

Then before `export default http;`:

```typescript
// Stripe webhook — @convex-dev/stripe handles signature verification and event dispatch
registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
});
```

- [ ] **Step 2: Verify the route registers**

Run: `npx convex dev --once`
Expected: Convex pushes successfully, `/stripe/webhook` endpoint registered.

- [ ] **Step 3: Commit**

```bash
git add convex/http.ts
git commit -m "feat: register Stripe webhook route in Convex HTTP router"
```

---

## Task 3: Add `by_user` Index to `apps` Table

The `apps` table currently lacks a `by_user` index. The `flashcardDecks` table has one, but `apps` does not. We need it for efficient limit counting in mutations.

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add the index**

In `convex/schema.ts`, add `.index("by_user", ["userId"])` to the `apps` table definition, after the existing `.index("by_created", ["createdAt"])` line:

```typescript
  apps: defineTable({
    title: v.string(),
    description: v.string(),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.id("sessions")),
    shareSlug: v.string(),
    previewUrl: v.optional(v.string()),
    publishedUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_share_slug", ["shareSlug"])
    .index("by_session", ["sessionId"])
    .index("by_created", ["createdAt"])
    .index("by_user", ["userId"]),
```

- [ ] **Step 2: Push and verify**

Run: `npx convex dev --once`
Expected: Convex pushes successfully, index created.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add by_user index to apps table for limit enforcement"
```

---

## Task 4: Create Billing Constants and Premium Check Helper

Constants and the premium check helper live in `convex/lib/billing.ts` — a plain module with NO `"use node"` directive, so mutations in `apps.ts` and `flashcard_decks.ts` can import from it.

**Files:**
- Create: `convex/lib/billing.ts`

- [ ] **Step 1: Create the billing constants module**

Create `convex/lib/billing.ts`:

```typescript
import type { QueryCtx } from "../_generated/server";

export const FREE_LIMITS = {
  maxApps: 5,
  maxDecks: 3,
} as const;

export const PREMIUM_LIMITS = {
  maxApps: Infinity,
  maxDecks: Infinity,
} as const;

/**
 * Check if a user has an active premium subscription.
 * Reads from the @convex-dev/stripe component's tables.
 * Safe to call from queries and mutations (no "use node" needed).
 */
export async function checkPremiumStatus(
  ctx: QueryCtx,
  userId: string,
): Promise<boolean> {
  const { components } = await import("../_generated/api");
  const subscriptions = await ctx.runQuery(
    components.stripe.public.listSubscriptionsByUserId,
    { userId },
  );
  return subscriptions.some(
    (sub: { status: string }) =>
      sub.status === "active" || sub.status === "trialing",
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add convex/lib/billing.ts
git commit -m "feat: add billing constants and premium status helper"
```

---

## Task 5: Create Entitlements Backend (`convex/subscriptions.ts`)

The entitlements query, checkout action, and portal action. This file has `"use node"` because the `StripeSubscriptions` class and `process.env` require Node.js runtime.

**Files:**
- Create: `convex/subscriptions.ts`
- Test: `convex/__tests__/subscriptions.test.ts`

- [ ] **Step 1: Write the failing test for entitlements query**

Create `convex/__tests__/subscriptions.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import schema from "../schema";
import { api } from "../_generated/api";

describe("subscriptions.getEntitlements", () => {
  it("returns free plan when user has no subscription", async () => {
    const t = convexTest(schema);
    const result = await t.query(api.subscriptions.getEntitlements, {});
    // Unauthenticated users get free plan
    expect(result.plan).toBe("free");
    expect(result.limits.maxApps).toBe(5);
    expect(result.limits.maxDecks).toBe(3);
  });

  it("returns free plan for authenticated user with no subscription", async () => {
    const t = convexTest(schema);
    const asUser = t.withIdentity({ subject: "user_123", issuer: "clerk" });
    const result = await asUser.query(api.subscriptions.getEntitlements, {});
    expect(result.plan).toBe("free");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/__tests__/subscriptions.test.ts`
Expected: FAIL — `api.subscriptions.getEntitlements` does not exist.

- [ ] **Step 3: Write the subscriptions module**

Create `convex/subscriptions.ts`:

```typescript
"use node";

import { StripeSubscriptions } from "@convex-dev/stripe";

import { components } from "./_generated/api";
import { action, query } from "./_generated/server";
import { FREE_LIMITS, PREMIUM_LIMITS } from "./lib/billing";

// Set after creating the price in Stripe Dashboard
const PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID ?? "";

// --- Stripe Client ---

const stripeClient = new StripeSubscriptions(components.stripe, {});

// --- Queries ---

export const getEntitlements = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { plan: "free" as const, limits: FREE_LIMITS };
    }

    const subscriptions = await ctx.runQuery(
      components.stripe.public.listSubscriptionsByUserId,
      { userId: identity.subject },
    );

    const hasActive = subscriptions.some(
      (sub) => sub.status === "active" || sub.status === "trialing",
    );

    if (hasActive) {
      return { plan: "premium" as const, limits: PREMIUM_LIMITS };
    }

    return { plan: "free" as const, limits: FREE_LIMITS };
  },
});

// --- Actions ---

export const createCheckoutSession = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const customer = await stripeClient.getOrCreateCustomer(ctx, {
      userId: identity.subject,
      email: identity.email ?? undefined,
      name: identity.name ?? undefined,
    });

    const session = await stripeClient.createCheckoutSession(ctx, {
      priceId: PREMIUM_PRICE_ID,
      customerId: customer.customerId,
      mode: "subscription",
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings?billing=success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings?billing=canceled`,
      subscriptionMetadata: {
        userId: identity.subject,
      },
    });

    return { url: session.url };
  },
});

export const createPortalSession = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const subscriptions = await ctx.runQuery(
      components.stripe.public.listSubscriptionsByUserId,
      { userId: identity.subject },
    );

    if (subscriptions.length === 0) {
      throw new Error("No subscription found");
    }

    const portal = await stripeClient.createCustomerPortalSession(ctx, {
      customerId: subscriptions[0].stripeCustomerId,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings`,
    });

    return { url: portal.url };
  },
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run convex/__tests__/subscriptions.test.ts`
Expected: Tests pass (the free-plan-by-default cases). Note: component query mocking may need adjustment — if `convex-test` doesn't mock component queries, the test may need to be adapted to only test the logic we control.

- [ ] **Step 5: Commit**

```bash
git add convex/subscriptions.ts convex/__tests__/subscriptions.test.ts
git commit -m "feat: add entitlements query and checkout/portal actions"
```

---

## Task 6: Create `useEntitlements()` React Hook

**Files:**
- Create: `src/core/hooks/use-entitlements.ts`
- Test: `src/core/hooks/__tests__/use-entitlements.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/core/hooks/__tests__/use-entitlements.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";

// Mock convex react before importing hook
const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: mockUseQuery,
}));

vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    subscriptions: {
      getEntitlements: "subscriptions:getEntitlements",
    },
  },
}));

import { FREE_PLAN, useEntitlements } from "../use-entitlements";

describe("useEntitlements", () => {
  it("returns free plan defaults when query is loading", () => {
    mockUseQuery.mockReturnValue(undefined);
    const result = useEntitlements();
    expect(result.plan).toBe("free");
    expect(result.limits.maxApps).toBe(5);
    expect(result.isLoading).toBe(true);
    expect(result.isPremium).toBe(false);
  });

  it("returns premium when query returns premium", () => {
    mockUseQuery.mockReturnValue({
      plan: "premium",
      limits: { maxApps: Infinity, maxDecks: Infinity },
    });
    const result = useEntitlements();
    expect(result.plan).toBe("premium");
    expect(result.isPremium).toBe(true);
    expect(result.isLoading).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/hooks/__tests__/use-entitlements.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the hook**

Create `src/core/hooks/use-entitlements.ts`:

```typescript
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";

export const FREE_PLAN = {
  plan: "free" as const,
  limits: { maxApps: 5, maxDecks: 3 },
};

export function useEntitlements() {
  const entitlements = useQuery(api.subscriptions.getEntitlements);

  const result = entitlements ?? FREE_PLAN;

  return {
    ...result,
    isLoading: entitlements === undefined,
    isPremium: result.plan === "premium",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/hooks/__tests__/use-entitlements.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/hooks/use-entitlements.ts src/core/hooks/__tests__/use-entitlements.test.ts
git commit -m "feat: add useEntitlements() hook for plan/limits"
```

---

## Task 7: Add Server-Side Limit Enforcement to `apps.ts`

**Files:**
- Modify: `convex/apps.ts`
- Test: `convex/__tests__/apps-limits.test.ts`

- [ ] **Step 1: Write the failing test**

Create `convex/__tests__/apps-limits.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import schema from "../schema";
import { api } from "../_generated/api";

describe("apps.create — free tier limit", () => {
  it("allows creating apps up to the free limit", async () => {
    const t = convexTest(schema);
    const asUser = t.withIdentity({ subject: "user_free", issuer: "clerk" });

    // Create 5 apps (the limit)
    for (let i = 0; i < 5; i++) {
      await asUser.mutation(api.apps.create, {
        title: `App ${i}`,
        description: "Test",
        shareSlug: `slug-${i}-${Date.now()}`,
      });
    }

    // 6th should throw
    await expect(
      asUser.mutation(api.apps.create, {
        title: "App 6",
        description: "Test",
        shareSlug: `slug-6-${Date.now()}`,
      }),
    ).rejects.toThrow(/limit/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/__tests__/apps-limits.test.ts`
Expected: FAIL — no limit check exists, 6th app is created successfully.

- [ ] **Step 3: Add limit check with premium bypass to `apps.create` and `apps.ensureForSession`**

In `convex/apps.ts`, add the imports at the top:

```typescript
import { checkPremiumStatus, FREE_LIMITS } from "./lib/billing";
```

In the `create` handler, after `if (!identity) throw new Error("Not authenticated");` (line 17), add:

```typescript
    // Free-tier limit enforcement — premium users bypass
    const isPremium = await checkPremiumStatus(ctx, identity.subject);
    if (!isPremium) {
      const userApps = await ctx.db
        .query("apps")
        .withIndex("by_user", (q) => q.eq("userId", identity.subject))
        .collect();
      if (userApps.length >= FREE_LIMITS.maxApps) {
        throw new Error("Free plan limit reached. Upgrade to Premium for unlimited apps.");
      }
    }
```

In `ensureForSession`, after `await assertSessionOwner(ctx, args.sessionId);` (line 102) and before the `existing` check, add:

```typescript
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const isPremium = await checkPremiumStatus(ctx, identity.subject);
      if (!isPremium) {
        const userApps = await ctx.db
          .query("apps")
          .withIndex("by_user", (q) => q.eq("userId", identity.subject))
          .collect();
        if (userApps.length >= FREE_LIMITS.maxApps) {
          throw new Error("Free plan limit reached. Upgrade to Premium for unlimited apps.");
        }
      }
    }
```

Note: Move the existing `const identity = await ctx.auth.getUserIdentity();` call (line 115) up before the limit check to avoid duplication.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run convex/__tests__/apps-limits.test.ts`
Expected: PASS (note: `checkPremiumStatus` will return `false` in convex-test since no component subscriptions exist, so the limit enforces correctly for free users).

- [ ] **Step 5: Run existing app tests to check for regressions**

Run: `npx vitest run --grep "apps"`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add convex/apps.ts convex/__tests__/apps-limits.test.ts
git commit -m "feat: enforce free-tier app limit with premium bypass"
```

---

## Task 8: Add Server-Side Limit Enforcement to `flashcard_decks.ts`

**Files:**
- Modify: `convex/flashcard_decks.ts`
- Test: `convex/__tests__/flashcard-decks-limits.test.ts`

- [ ] **Step 1: Write the test**

Create `convex/__tests__/flashcard-decks-limits.test.ts`. The `flashcard_decks.create` mutation requires a session owned by the user, so the test needs to set up a session first:

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import schema from "../schema";
import { api } from "../_generated/api";

describe("flashcard_decks.create — free tier limit", () => {
  it("rejects deck creation beyond free limit", async () => {
    const t = convexTest(schema);
    const asUser = t.withIdentity({ subject: "user_free", issuer: "clerk" });

    // Create a session owned by this user (required for deck creation)
    const sessionId = await t.run(async (ctx) => {
      return await ctx.db.insert("sessions", {
        userId: "user_free",
        title: "Test Session",
        query: "test",
        state: "idle",
        type: "flashcards",
      });
    });

    // Create 3 decks (the limit)
    for (let i = 0; i < 3; i++) {
      await asUser.mutation(api.flashcard_decks.create, {
        title: `Deck ${i}`,
        sessionId,
      });
    }

    // 4th should throw
    await expect(
      asUser.mutation(api.flashcard_decks.create, {
        title: "Deck 4",
        sessionId,
      }),
    ).rejects.toThrow(/limit/i);
  });
});
```

- [ ] **Step 2: Add limit check with premium bypass to `flashcard_decks.create`**

In `convex/flashcard_decks.ts`, add the imports at the top:

```typescript
import { checkPremiumStatus, FREE_LIMITS } from "./lib/billing";
```

In the `create` handler, after `await assertSessionOwner(ctx, args.sessionId);` (line 13) and before `ctx.db.insert`, add:

```typescript
    if (identity) {
      const isPremium = await checkPremiumStatus(ctx, identity.subject);
      if (!isPremium) {
        const userDecks = await ctx.db
          .query("flashcardDecks")
          .withIndex("by_user", (q) => q.eq("userId", identity.subject))
          .collect();
        if (userDecks.length >= FREE_LIMITS.maxDecks) {
          throw new Error("Free plan limit reached. Upgrade to Premium for unlimited decks.");
        }
      }
    }
```

Note: `identity` is already available from `ctx.auth.getUserIdentity()` on line 14.

- [ ] **Step 3: Run tests**

Run: `npx vitest run convex/__tests__/flashcard-decks-limits.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add convex/flashcard_decks.ts convex/__tests__/flashcard-decks-limits.test.ts
git commit -m "feat: enforce free-tier deck limit with premium bypass"
```

---

## Task 9: Create `UpgradePrompt` Component

**Files:**
- Create: `src/features/billing/components/upgrade-prompt.tsx`
- Test: `src/features/billing/components/__tests__/upgrade-prompt.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/billing/components/__tests__/upgrade-prompt.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useAction: vi.fn(() => vi.fn()),
}));

vi.mock("../../../../../convex/_generated/api", () => ({
  api: { subscriptions: { createCheckoutSession: "mock" } },
}));

import { UpgradePrompt } from "../upgrade-prompt";

describe("UpgradePrompt", () => {
  it("renders the upgrade message", () => {
    render(<UpgradePrompt message="You've used all 5 free app slots." />);
    expect(screen.getByText(/5 free app slots/i)).toBeInTheDocument();
  });

  it("renders an upgrade button", () => {
    render(<UpgradePrompt message="Limit reached." />);
    expect(screen.getByRole("button", { name: /upgrade/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/billing/components/__tests__/upgrade-prompt.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `src/features/billing/components/upgrade-prompt.tsx`:

```tsx
"use client";

import { useAction } from "convex/react";
import { useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";

export function UpgradePrompt({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  const createCheckout = useAction(api.subscriptions.createCheckoutSession);
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const { url } = await createCheckout();
      if (url) window.location.href = url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 p-6 text-center",
        className,
      )}
    >
      <p className="mb-4 text-sm text-on-surface-variant">{message}</p>
      <Button
        onClick={handleUpgrade}
        disabled={loading}
        className="bg-gradient-to-r from-[oklch(0.35_0.05_180)] to-[oklch(0.40_0.06_178)] text-white"
      >
        {loading ? "Redirecting..." : "Upgrade to Premium"}
      </Button>
      <p className="mt-2 text-xs text-on-surface-variant/60">$9.99/month · Cancel anytime</p>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/billing/components/__tests__/upgrade-prompt.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/billing/components/upgrade-prompt.tsx src/features/billing/components/__tests__/upgrade-prompt.test.tsx
git commit -m "feat: add UpgradePrompt component for limit gates"
```

---

## Task 10: Create `BillingSection` Component

**Files:**
- Create: `src/features/billing/components/billing-section.tsx`
- Test: `src/features/billing/components/__tests__/billing-section.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/billing/components/__tests__/billing-section.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockUseEntitlements = vi.fn();
vi.mock("@/core/hooks/use-entitlements", () => ({
  useEntitlements: () => mockUseEntitlements(),
}));

vi.mock("convex/react", () => ({
  useAction: vi.fn(() => vi.fn()),
  useQuery: vi.fn(() => []),
}));

vi.mock("../../../../../convex/_generated/api", () => ({
  api: {
    subscriptions: { createCheckoutSession: "mock", createPortalSession: "mock" },
    apps: { list: "mock" },
    flashcard_decks: { list: "mock" },
  },
}));

import { BillingSection } from "../billing-section";

describe("BillingSection", () => {
  it("shows Free plan for free users", () => {
    mockUseEntitlements.mockReturnValue({
      plan: "free",
      limits: { maxApps: 5, maxDecks: 3 },
      isPremium: false,
      isLoading: false,
    });
    render(<BillingSection />);
    expect(screen.getByText(/free/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upgrade/i })).toBeInTheDocument();
  });

  it("shows Premium plan for premium users", () => {
    mockUseEntitlements.mockReturnValue({
      plan: "premium",
      limits: { maxApps: Infinity, maxDecks: Infinity },
      isPremium: true,
      isLoading: false,
    });
    render(<BillingSection />);
    expect(screen.getByText(/premium/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/billing/components/__tests__/billing-section.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `src/features/billing/components/billing-section.tsx`:

```tsx
"use client";

import { useAction, useQuery } from "convex/react";
import { useState } from "react";

import { useEntitlements } from "@/core/hooks/use-entitlements";
import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";

export function BillingSection() {
  const { plan, limits, isPremium, isLoading } = useEntitlements();
  const apps = useQuery(api.apps.list) ?? [];
  const decks = useQuery(api.flashcard_decks.list) ?? [];
  const createCheckout = useAction(api.subscriptions.createCheckoutSession);
  const createPortal = useAction(api.subscriptions.createPortalSession);
  const [actionLoading, setActionLoading] = useState(false);

  async function handleUpgrade() {
    setActionLoading(true);
    try {
      const { url } = await createCheckout();
      if (url) window.location.href = url;
    } finally {
      setActionLoading(false);
    }
  }

  async function handleManage() {
    setActionLoading(true);
    try {
      const { url } = await createPortal();
      if (url) window.location.href = url;
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) {
    return (
      <section>
        <h3 className="font-headline text-lg font-bold text-on-surface mb-6">
          Billing
        </h3>
        <div className="animate-pulse h-32 rounded-2xl bg-surface-container" />
      </section>
    );
  }

  return (
    <section>
      <h3 className="font-headline text-lg font-bold text-on-surface mb-6">
        Billing
      </h3>

      <div className="rounded-2xl bg-surface-container p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-headline font-semibold text-on-surface">
              {isPremium ? "Premium" : "Free"} Plan
            </p>
            {isPremium && (
              <p className="text-sm text-on-surface-variant">$9.99/month</p>
            )}
          </div>
          {isPremium ? (
            <Button
              variant="outline"
              onClick={handleManage}
              disabled={actionLoading}
            >
              {actionLoading ? "Loading..." : "Manage Subscription"}
            </Button>
          ) : (
            <Button
              onClick={handleUpgrade}
              disabled={actionLoading}
              className="bg-gradient-to-r from-[oklch(0.35_0.05_180)] to-[oklch(0.40_0.06_178)] text-white"
            >
              {actionLoading ? "Redirecting..." : "Upgrade to Premium"}
            </Button>
          )}
        </div>

        {!isPremium && (
          <div className="border-t border-outline-variant pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Apps</span>
              <span className="font-medium text-on-surface">
                {apps.length} / {limits.maxApps}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Flashcard Decks</span>
              <span className="font-medium text-on-surface">
                {decks.length} / {limits.maxDecks}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/billing/components/__tests__/billing-section.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/billing/components/billing-section.tsx src/features/billing/components/__tests__/billing-section.test.tsx
git commit -m "feat: add BillingSection component for settings page"
```

---

## Task 11: Wire Billing Section into Settings Page

**Files:**
- Modify: `src/features/settings/components/settings-page.tsx`
- Modify: `src/features/settings/components/settings-sidebar.tsx`
- Modify: `src/features/settings/components/__tests__/settings-page.test.tsx`

- [ ] **Step 1: Update the SettingsSection type and labels**

In `src/features/settings/components/settings-page.tsx`:

Update the type on line 14:
```typescript
export type SettingsSection = "profile" | "account" | "appearance" | "billing";
```

Update `SECTION_LABELS` (lines 16-20):
```typescript
const SECTION_LABELS: Record<SettingsSection, string> = {
  profile: "Profile",
  account: "Account",
  appearance: "Appearance",
  billing: "Billing",
};
```

Add the import at the top with the other section imports:
```typescript
import { BillingSection } from "../../billing/components/billing-section";
```

Add the rendering case after the appearance line (around line 102):
```typescript
          {section === "billing" && <BillingSection />}
```

- [ ] **Step 2: Update the sidebar SECTIONS array**

In `src/features/settings/components/settings-sidebar.tsx`, add to the `SECTIONS` array (line 13, before the closing `]`):

```typescript
  { id: "billing", label: "Billing", icon: "payments" },
```

- [ ] **Step 3: Update the settings page test**

In `src/features/settings/components/__tests__/settings-page.test.tsx`, add the billing section mock alongside the existing ones (around line 40):

```typescript
vi.mock("../../billing/components/billing-section", () => ({
  BillingSection: () => <div data-testid="billing-section" />,
}));
```

Add a test case:

```typescript
  it("clicking sidebar option switches to billing section", () => {
    render(<SettingsPage />);
    // Need to add billing button to the mock sidebar
    // This test verifies the routing works
  });
```

Note: The existing sidebar mock only has "Account" and "Appearance" buttons. Update the mock to include "Billing":

```typescript
vi.mock("../settings-sidebar", () => ({
  SettingsSidebar: ({ onSectionChange }: any) => (
    <div data-testid="settings-sidebar">
      <button onClick={() => onSectionChange("profile")}>Profile</button>
      <button onClick={() => onSectionChange("account")}>Account</button>
      <button onClick={() => onSectionChange("appearance")}>Appearance</button>
      <button onClick={() => onSectionChange("billing")}>Billing</button>
    </div>
  ),
}));
```

Then add:

```typescript
  it("clicking sidebar option switches to billing section", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Billing" }));
    expect(screen.getByTestId("billing-section")).toBeInTheDocument();
    expect(screen.queryByTestId("profile-section")).not.toBeInTheDocument();
  });
```

- [ ] **Step 4: Run all settings tests**

Run: `npx vitest run src/features/settings/`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/ src/features/billing/
git commit -m "feat: wire billing section into settings page and sidebar"
```

---

## Task 12: Set Up Environment Variables and Manual Verification

This task is manual — no code changes, but critical for the integration to work.

- [ ] **Step 1: Create Stripe test mode Product and Price**

1. Go to Stripe Dashboard → Test Mode → Products
2. Create product: "Bridges Premium"
3. Add price: $9.99/month, recurring
4. Copy the Price ID (starts with `price_`)

- [ ] **Step 2: Set environment variables in Convex Dashboard**

Go to Convex Dashboard → Settings → Environment Variables:
- `STRIPE_SECRET_KEY` — from Stripe Dashboard → Developers → API Keys (test mode `sk_test_...`)
- `STRIPE_WEBHOOK_SECRET` — will be set after creating the webhook endpoint
- `STRIPE_PREMIUM_PRICE_ID` — the Price ID from step 1
- `NEXT_PUBLIC_APP_URL` — `http://localhost:3000` for dev, production URL for prod

- [ ] **Step 3: Create Stripe webhook endpoint**

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://{your-convex-deployment}.convex.site/stripe/webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
4. Copy the webhook signing secret (`whsec_...`)
5. Set `STRIPE_WEBHOOK_SECRET` in Convex Dashboard

- [ ] **Step 4: Configure Stripe Customer Portal**

1. Go to Stripe Dashboard → Settings → Billing → Customer Portal
2. Enable: subscription cancellation, payment method updates
3. Save

- [ ] **Step 5: End-to-end manual test**

1. Run `npm run dev` and `npx convex dev`
2. Sign in with a test account
3. Go to Settings → Billing → click "Upgrade to Premium"
4. Complete checkout with test card `4242424242424242`
5. Verify redirect back to `/settings?billing=success`
6. Verify plan shows "Premium" in billing section
7. Click "Manage Subscription" → verify Stripe portal opens
8. Cancel subscription in portal → verify plan reverts to "Free"

- [ ] **Step 6: Commit any adjustments**

```bash
git add -A
git commit -m "chore: finalize Stripe integration configuration"
```

---

## Dependency Graph

```
Task 1 (install + wire component)
Task 2 (webhook routes)           ← can run in parallel with 1, 3
Task 3 (schema index)             ← can run in parallel with 1, 2
  ↓
Task 4 (billing constants)        ← depends on Task 1
Task 5 (subscriptions.ts)         ← depends on Task 1, Task 4
  ↓
Task 6 (useEntitlements hook)     ← depends on Task 5
Task 7 (apps limit)               ← depends on Task 3, Task 4
Task 8 (decks limit)              ← depends on Task 4
Task 9 (UpgradePrompt)            ← depends on Task 5
  ↓                                  (6, 7, 8, 9 can run in parallel)
Task 10 (BillingSection)          ← depends on Task 6
  ↓
Task 11 (settings wiring)         ← depends on Task 10
  ↓
Task 12 (env vars + manual test)  ← depends on all
```

**Parallel execution waves:**
1. Tasks 1, 2, 3 — infrastructure (parallel)
2. Task 4 — billing constants (after Task 1)
3. Task 5 — subscriptions module (after Task 4)
4. Tasks 6, 7, 8, 9 — hook + limits + UI (parallel, after Task 5)
5. Task 10 — billing section (after Task 6)
6. Task 11 — settings wiring (after Task 10)
7. Task 12 — manual verification (last)
