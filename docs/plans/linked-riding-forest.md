# Fix Remaining Issues & Bug Hunt Findings

## Context

Six issues remain after the QA pass: 3 functional gaps (no featured apps, no caregiver test data, weak PIN hashing) and 3 UI/UX bugs (hydration flash, slow transition, missing error feedback). These are independent fixes that can be parallelized.

---

## Issue 1: Seed Featured Apps on Explore Page (medium)

**Problem:** `listFeatured` returns empty → grid falls back to static cards with "Coming Soon" badges.

**Root cause:** `explore_seed.markFeatured` requires sessionIds of already-built apps. No apps have been built and marked.

**Approach:** Add a `seedDemoApps` internal mutation that directly inserts app + session + file records, bypassing the builder. Each gets a placeholder HTML bundle so the modal iframe shows a themed preview page.

**Files:**
- `convex/explore_seed.ts` — Add `seedDemoApps` internalMutation:
  - Check if featured apps already exist (idempotent guard)
  - For each of the 6 demo tools: insert a `sessions` record (state: `"live"`, title/query from demo data), insert a `files` record with `path: "_bundle.html"` containing a styled placeholder HTML page (Fraunces font, warm canvas background, tool title, "Built with Bridges" tagline, and a "Customize This" CTA link to `/builder?prompt=...`), insert an `apps` record with `featured: true`, `featuredOrder`, `featuredCategory`, `shareSlug: "demo-{id}"` (e.g. `demo-communication-board`)
  - No userId needed (these are system-seeded)

**Execution:** After deploy, run: `npx convex run explore_seed:seedDemoApps`

**Why placeholder bundles?** The `getPublicBundle` query requires a `sessionId` + `_bundle.html` file to return content. Without them, the modal iframe would 404. The placeholder gives a polished "preview" experience that links to the builder.

---

## Issue 2: Seed Caregiver Test Link for E2E (medium)

**Problem:** E2E caregiver account (`e2e+clerk_test+caregiver@bridges.ai`) has no `caregiverLinks` record → can't access Kid Mode or Speech Coach.

**Approach:** Create an E2E seed mutation that inserts a patient + accepted caregiver link + speech coach home program.

**Files:**
- `convex/e2e_seed.ts` — New file with `seedTestCaregiverLink` internalMutation:
  - Args: `slpUserId: string`, `caregiverUserId: string`, `caregiverEmail: string`
  - Idempotent: check if a link for this `caregiverUserId` already exists
  - Insert `patients` record: `{ slpUserId, firstName: "Test", lastName: "Child", dateOfBirth: "2020-01-01", diagnosis: "articulation", status: "active" }`
  - Insert `caregiverLinks` record: `{ patientId, caregiverUserId, email: caregiverEmail, inviteToken: "e2e-test-token-00000000", inviteStatus: "accepted", relationship: "parent" }`
  - Insert `homePrograms` record with `type: "speech-coach"` and basic `speechCoachConfig` so Speech Coach is testable too

**Execution:** Run from Convex dashboard with the Clerk user IDs for the SLP and caregiver test accounts. Can later be wired into Playwright `globalSetup`.

---

## Issue 3: PIN Hashing DJB2 → SHA-256 (low)

**Problem:** `hashPIN` in `convex/childApps.ts:97-105` uses DJB2, a trivially reversible hash.

**Approach:** Replace with Web Crypto API `crypto.subtle.digest("SHA-256", ...)`. No `"use node"` needed — Web Crypto is available in the Convex runtime.

**Files:**
- `convex/childApps.ts` — Replace `hashPIN` function:
  ```typescript
  async function hashPIN(pin: string): Promise<string> {
    const salted = `bridges-kid-mode:${pin}`;
    const encoded = new TextEncoder().encode(salted);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  ```
  - Update line 118 (`setPIN`): `const hashed = await hashPIN(args.pin);`
  - Update line ~151 (`verifyPIN`): `const hashed = await hashPIN(args.pin);` (already `await`-capable)
- `convex/__tests__/childApps.test.ts` — Update any hardcoded DJB2 hash values in test fixtures to match new SHA-256 output. Tests that call `setPIN` then `verifyPIN` should pass unchanged since both use the same hash.

**Migration:** No production PINs exist yet. Straight replacement.

---

## Issue 4: useIsDesktop Hydration Mismatch (low)

**Problem:** `useIsDesktop()` in `demo-tool-modal.tsx` initializes `useState(false)` → SSR renders Sheet → client detects desktop → switches to Dialog → visible flash.

**Approach:** Initialize state as `undefined`, return `boolean | undefined`. Render nothing until client determines viewport.

**Files:**
- `src/features/explore/components/demo-tool-modal.tsx` lines 22-32:
  ```typescript
  function useIsDesktop(): boolean | undefined {
    const [isDesktop, setIsDesktop] = useState<boolean | undefined>(undefined);
    useEffect(() => {
      const mq = window.matchMedia("(min-width: 768px)");
      setIsDesktop(mq.matches);
      const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }, []);
    return isDesktop;
  }
  ```
  - In `DemoToolModal` component body, add early return before the Dialog/Sheet branch:
    ```typescript
    if (isDesktop === undefined) return null;
    ```
- `src/features/explore/__tests__/demo-tool-modal.test.tsx` — Update if the test checks for immediate rendering (may need to trigger the effect).

---

## Issue 5: Transition Duration 500ms → 300ms (low)

**Problem:** Speaking indicator rings use `duration-500` (500ms), exceeding DESIGN.md's medium range (300-400ms).

**Files:**
- `src/features/speech-coach/components/active-session.tsx`:
  - Line 87: `duration-500` → `duration-300`
  - Line 95: `duration-500` → `duration-300`

---

## Issue 6: Speech Coach Error Feedback (medium)

**Problem:** The page-level `<ErrorBoundary>` already exists at `src/app/(app)/family/[patientId]/speech-coach/page.tsx:39`. However, when ElevenLabs disconnects mid-session, the `onError` callback silently calls `onEnd()` with no user feedback.

**Approach:** Add a toast notification so the user knows what happened.

**Files:**
- `src/features/speech-coach/components/active-session.tsx`:
  - Add import: `import { toast } from "sonner";`
  - In the `onError` callback (lines 55-58), add toast before `onEnd()`:
    ```typescript
    onError: (message) => {
      console.error("[SpeechCoach] Conversation error:", message);
      toast.error("Speech session interrupted", {
        description: "The connection was lost. Please try again.",
      });
      onEnd();
    },
    ```

---

## Verification

1. **Featured apps:** Visit `/explore` → cards should show without "Coming Soon" badges. Click "Try It" → modal shows placeholder preview with "Customize This" link.
2. **Caregiver link:** Sign in as caregiver E2E user → navigate to Kid Mode → should see the test patient's apps. Navigate to Speech Coach → should load without access error.
3. **PIN hashing:** Run `npm test -- childApps` → all tests pass. Manually test: set PIN via caregiver, verify PIN returns true.
4. **Hydration:** Visit `/explore` on desktop → no Sheet→Dialog flash. Open DevTools → no hydration mismatch warning.
5. **Transition:** Visit Speech Coach → speaking indicator animates at 300ms (visually snappier).
6. **Error toast:** Disconnect network during active speech session → toast appears with "Speech session interrupted".
7. **Full test suite:** `npm test` — all 636+ tests pass.
