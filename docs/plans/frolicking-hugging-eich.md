# Plan: Fix Hackathon Judge Audit Findings

## Context

The hackathon judge audit scored Bridges 91/100. Security (82/100) and Backend (88/100) are the weakest categories. This plan addresses all safe-to-fix issues that won't risk breaking the app — focused on iframe hardening, error resilience in Convex actions, security headers, cascade deletion robustness, documentation accuracy, and code documentation.

**Goal:** Push the score from 91 → ~96+ by closing every gap that doesn't require architectural changes.

---

## Changes

### 1. Harden shared-tool iframe sandbox
**File:** `src/features/shared-tool/components/shared-tool-page.tsx:69`

**Change:** Replace `sandbox="allow-scripts allow-forms allow-popups"` with `sandbox="allow-scripts"`.

- Remove `allow-forms` — generated therapy apps don't submit forms to external URLs
- Remove `allow-popups` — prevents phishing/redirect attacks from generated content
- Don't add `allow-same-origin` — this is for external published URLs, not blob URLs

**Risk:** Low. Published apps are static HTML bundles that don't use form submissions or popups. The preview-panel already uses `allow-scripts allow-same-origin` (different context — blob URLs).

### 2. Add URL validation on iframe src
**File:** `src/features/shared-tool/components/shared-tool-page.tsx:47`

**Change:** Add a URL validation check before rendering the iframe. Only allow `https:` and `http:` protocols. Show the "still being built" fallback for invalid URLs.

```tsx
function isValidPreviewUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

// In component:
const previewUrl = app.publishedUrl ?? app.previewUrl;
const safeUrl = previewUrl && isValidPreviewUrl(previewUrl) ? previewUrl : null;
// Use safeUrl instead of previewUrl in the conditional
```

**Risk:** None. Only rejects malformed or `javascript:`/`data:` URLs that shouldn't be displayed anyway.

### 3. Wrap Convex action API calls in try/catch

All 4 action files have external `fetch()` or SDK calls that check `response.ok` but don't catch network-level errors (DNS failure, timeout, connection refused). Wrap each in try/catch with a user-friendly error message.

**Files and changes:**

#### 3a. `convex/aiActions.ts` (lines 41-79)
Wrap the fetch + storage block in try/catch. Rethrow with user-friendly message.

#### 3b. `convex/stt.ts` (lines 30-48)
Wrap the fetch block in try/catch. Rethrow with user-friendly message.

#### 3c. `convex/publish.ts` (lines 40-82)
Wrap the fetch + mutation block in try/catch. Rethrow with user-friendly message.

#### 3d. `convex/image_generation.ts` (lines 52-94)
Wrap the Gemini SDK call + storage block in try/catch. Rethrow with user-friendly message.

**Pattern for all 4:**
```typescript
try {
  // existing code
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`[tag] Failed:`, message);
  throw new Error("User-friendly message. Please try again.");
}
```

**Risk:** Very low. This only catches errors that would have been unhandled crashes anyway and converts them to user-visible messages.

### 4. Add HSTS and Permissions-Policy headers
**File:** `next.config.ts`

**Change:** Add 2 headers to the existing headers array:
```typescript
{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
{ key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
```

Note: `microphone=(self)` because the app uses STT which needs mic access.

**Risk:** None. These are response headers that instruct browsers on security policy. HSTS only affects HTTPS (which Vercel already enforces). Permissions-Policy won't block any current features.

### 5. Fix cascade deletion to loop until complete
**File:** `convex/sessions.ts:92-125`

**Change:** Replace `take(1000)` with a loop that deletes in batches until no more records remain. Use `collect()` bounded by a reasonable max per iteration.

```typescript
// Delete all messages in batches
let batch;
do {
  batch = await ctx.db
    .query("messages")
    .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
    .take(500);
  for (const msg of batch) {
    await ctx.db.delete(msg._id);
  }
} while (batch.length === 500);
```

Same pattern for files (take 100) and apps (take 10).

**Risk:** Low. Mutations have a 10k document read/write limit in Convex, but therapy sessions rarely exceed a few hundred messages. The batching prevents hitting that limit while ensuring completeness.

### 6. Fix test count in README and CLAUDE.md
**Files:** `README.md` (lines 44, 104), `CLAUDE.md` (line 96)

**Change:** Replace `627` with `625` in all 3 locations.

**Risk:** None. Documentation-only change.

### 7. Document undocumented `v.any()` validators
**Files:**
- `convex/sessions.ts:155` — Add comment: `// Validated via TherapyBlueprintSchema (Zod) at app layer before persistence`
- `convex/app_state.ts:24` — Add comment: `// Generic KV store — value shape varies by key, validated in application code`

**Risk:** None. Comment-only changes.

### 8. Fix ESLint import-sort errors
**Command:** `npx eslint --fix` on the 4 affected files.

**Risk:** None. Auto-fixable import ordering.

---

## Files Modified (Summary)

| # | File | Change Type |
|---|------|-------------|
| 1 | `src/features/shared-tool/components/shared-tool-page.tsx` | Iframe sandbox + URL validation |
| 2 | `convex/aiActions.ts` | try/catch wrapper |
| 3 | `convex/stt.ts` | try/catch wrapper |
| 4 | `convex/publish.ts` | try/catch wrapper |
| 5 | `convex/image_generation.ts` | try/catch wrapper |
| 6 | `convex/sessions.ts` | Cascade deletion loop + v.any() comment |
| 7 | `convex/app_state.ts` | v.any() comment |
| 8 | `next.config.ts` | HSTS + Permissions-Policy headers |
| 9 | `README.md` | Test count 627→625 |
| 10 | `CLAUDE.md` | Test count 627→625 |

---

## NOT Changing (Too Risky)

- **Auth on Convex queries** — Requires architectural changes, properly documented as Phase 6
- **Per-user rate limiting** — Requires auth system to identify users
- **Image label escaping** — Harmless in Gemini context, escaping could break valid labels
- **Streaming timeout** — Depends on Vercel plan limits, not a code fix

---

## Verification

1. `npm test` — All 625 tests must still pass
2. `npm run build` — Build must succeed with zero errors
3. `npx eslint .` — Must have 0 errors (warnings in tests acceptable)
4. Manual check: Open a shared tool URL and confirm iframe still loads correctly
5. Verify HSTS header appears in response: `curl -I localhost:3000` after `npm run dev`
