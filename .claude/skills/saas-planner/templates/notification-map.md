# Notification Map

<!--
MVP FOCUS: What the app sends to users and when.
Emails sent via Convex Resend component (Convex actions, not Next.js API routes).
In-app notifications via Convex reactive queries (real-time, no polling).
Don't build a notification preference center, digest system, or push notifications for V1.
-->

## Channels

| Channel | Tech | MVP? |
|---|---|---|
| Email | Convex Resend component (`@convex-dev/resend`) | Yes |
| In-app | Convex table + reactive query (toast or bell) | {Yes / No} |
| Push | N/A for MVP | No |
| SMS | N/A for MVP | No |

---

## Convex Resend Component Setup

```
npm install @convex-dev/resend
# Then register in convex/convex.config.ts:
# import resend from "@convex-dev/resend/convex.config";
# export default defineApp({ components: { resend } });
```

| Config | Value |
|---|---|
| Resend API key | `RESEND_API_KEY` env var in Convex |
| From address | {noreply@yourdomain.com} |
| Reply-to | {support@yourdomain.com or none} |
| Email templates | {React Email components / plain text / HTML strings} |

### Sending Pattern

```typescript
// In a Convex action
import { Resend } from "@convex-dev/resend";
const resend = new Resend(components.resend);

// Send from action
await resend.send(ctx, {
  from: "App <noreply@yourdomain.com>",
  to: userEmail,
  subject: "...",
  html: "...", // or react: <EmailTemplate />
});
```

---

## Notification Inventory

### Transactional (must-have)

| Notification | Trigger | Channel | Sent By |
|---|---|---|---|
| Welcome email | Clerk webhook → user created in Convex | Email (Resend) | Convex action after user upsert |
| Email verification | Clerk handles | Clerk (automatic) | N/A — Clerk built-in |
| Password reset | Clerk handles | Clerk (automatic) | N/A — Clerk built-in |
| Payment receipt | Stripe `invoice.payment_succeeded` webhook | Email (Stripe automatic) | Stripe — no custom needed |
| Payment failed | Stripe `invoice.payment_failed` webhook | Email (Resend) | Convex action triggered by webhook |

### Product (based on your app's core features)

| Notification | Trigger | Channel | Sent By |
|---|---|---|---|
| {e.g., AI job complete} | {scheduled action finishes} | {email / in-app} | {Convex action / mutation} |
| {e.g., Shared item} | {user shares with another user} | {in-app toast} | {Convex mutation writes to notifications table} |

### Lifecycle (nice-to-have for MVP)

| Notification | Trigger | Channel | Priority |
|---|---|---|---|
| Trial ending soon | Stripe webhook `customer.subscription.trial_will_end` | Email (Resend) | {MVP / POST-MVP} |
| Usage approaching limit | Mutation detects 80% of quota | In-app banner | {MVP / POST-MVP} |
| Re-engagement (7d inactive) | Convex cron checks last activity | Email (Resend) | POST-MVP |

---

## Email Content (Key Emails)

### Welcome Email
- **Subject**: {e.g., "Welcome to [App]!"}
- **Key content**: {What to do first, link to app}
- **CTA**: {Get started button}
- **Template**: {React Email component at `emails/welcome.tsx` / inline HTML}

### Payment Failed
- **Subject**: {e.g., "Action needed: payment failed"}
- **Key content**: {What happened, link to update payment method}
- **CTA**: {Update payment → Stripe customer portal link}

<!-- Add content specs for other critical emails as needed -->

---

## In-App Notifications (if applicable)

### Convex Implementation

```typescript
// notifications table in schema
notifications: defineTable({
  userId: v.id("users"),
  type: v.string(),
  message: v.string(),
  read: v.boolean(),
  createdAt: v.number(),
}).index("by_user", ["userId"]),
```

| Element | Decision |
|---|---|
| Location | {Toast via Sonner / notification bell with count / inline banner} |
| Real-time | Yes — useQuery subscribes to notifications table, auto-updates |
| Persistence | {Toast: disappear after 5s / Bell: persist until marked read} |
| Mark as read | {Click dismisses / "Mark all read" button} |

---

## Open Questions

- {question}

`[POST-MVP]`: {notification preferences UI, email digest, push notifications, Slack integration, unsubscribe management, email analytics}
