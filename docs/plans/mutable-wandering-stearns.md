# Runtime Issues Fix Plan

## Context

A QA pass surfaced several runtime issues. Three are actionable code changes; the others are dev-environment noise or expected behavior. This plan covers the three actionable fixes:

1. **AppointmentDetailPage error boundary** — `appointments.get` query throws `ConvexError` from `assertPatientAccess`, which Convex's `useQuery` propagates into React's render tree, bypassing the component's `null` check and hitting the error boundary.
2. **LCP image missing `priority`/`sizes`** — `/vocali-auth-slp.png` in `AuthArtPanel` uses `fill` without `priority` or `sizes`, producing a Next.js warning and hurting LCP on sign-in/landing pages.
3. **CLAUDE.md routing rules** — User approved adding gstack skill routing rules (non-functional, housekeeping).

**Issue 1 (tools:update) is already fixed in local code.** The mutation has `configJson: v.optional(v.string())` and uses conditional spread in `ctx.db.patch`, so partial payloads are safe. The browser console errors were from a stale deployment. No code change needed.

**Issue 2 (patient-route auth redirect) is expected behavior** — seeded demo patients belong to a specific SLP user; visiting those URLs without matching auth correctly redirects. Not a bug.

---

## Fix 1 — AppointmentDetailPage error boundary

**Root cause:** `appointments.get` (line 194) calls `assertPatientAccess`, which throws `ConvexError("Not authorized")` for any user who doesn't have access. Convex's `useQuery` hook re-throws inside `AppointmentDetailPage`'s render, so React's error boundary catches it instead of the component's `null` path.

**File to change:** `convex/appointments.ts` — the `get` query (lines 186–199)

**Change:** Wrap `assertPatientAccess` in try/catch, return `null` on any access failure. The component already handles `null` correctly (shows "Session not found" UI at line 69–79).

```typescript
export const get = authedQuery({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    if (!ctx.userId) return null;

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) return null;

    try {
      await assertPatientAccess(ctx, appointment.patientId);
    } catch {
      return null;
    }

    const patient = await ctx.db.get(appointment.patientId);
    return { ...appointment, patient };
  },
});
```

**Note:** `listByPatient` (line 177) has the same pattern — `assertPatientAccess` without try/catch. Fix it the same way while in this file to close the pattern hole.

---

## Fix 2 — LCP image optimization

**File to change:** `src/features/auth/components/auth-art-panel.tsx`

**Change:** Add `priority` (implies eager loading + `fetchpriority="high"`, which is what Next.js recommends for LCP images) and `sizes` (required when `fill` is used to avoid Next.js serving an oversized image).

The image is hidden on mobile (`lg:block`), so `sizes` should be `0px` below 1024px and roughly `50vw` above (split-panel layout).

```tsx
<Image
  src="/vocali-auth-slp.png"
  alt="Speech therapist working with a child using communication cards"
  fill
  priority
  sizes="(max-width: 1024px) 0px, 50vw"
  className="object-cover"
/>
```

---

## Fix 3 — CLAUDE.md routing rules

**File to change:** `CLAUDE.md` — append skill routing section at the end.

---

## Files Changed

| File | Change |
|------|--------|
| `convex/appointments.ts` | Wrap `assertPatientAccess` in try/catch in both `get` and `listByPatient` |
| `src/features/auth/components/auth-art-panel.tsx` | Add `priority` + `sizes` to Image |
| `CLAUDE.md` | Append gstack skill routing rules |

---

## Verification

1. **AppointmentDetailPage** — Navigate to any appointment as a user who doesn't own that patient. Should see the "Session not found" UI, not the error boundary. No console errors.
2. **Image** — Open `/sign-in` in Chrome DevTools → Lighthouse or Performance tab. The vocali-auth-slp.png should no longer be flagged as an LCP issue. No Next.js `<Image>` console warnings about missing `sizes`.
3. **tools:update** — Open any tool builder, assign a patient (partial update), update goal tags (partial update). No `ArgumentValidationError` in console. Confirm by running `npm test -- --testPathPattern tools`.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |

**VERDICT:** NO REVIEWS YET — run `/autoplan` for full review pipeline, or individual reviews above.
