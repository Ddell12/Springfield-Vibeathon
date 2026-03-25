# Plan Verification Report (Re-verification)

> **Plan:** `2026-03-25-builder-agent-enhancement.md` + `2026-03-25-builder-agent-enhancement-design.md` | **Score:** 76/100 | **Verdict:** Needs targeted fixes
>
> The plan has improved significantly since the first verification (64 → 76). All critical API/model issues (A3: Imagen→Gemini, A1: duplicate generateImage, A2: listBySession naming) are fixed. New issues found: **stale ElevenLabs voice IDs**, a **misplaced import in publish.ts**, and a **missing template re-seed step**. All are straightforward fixes.

---

## Scorecard (MANDATORY)

| Category       | Max     | Score   | Deductions                                  |
| -------------- | ------- | ------- | ------------------------------------------- |
| Paths & Lines  | 20      | 18      | P1(-2)                                      |
| APIs & Imports | 25      | 13      | A4(-8), A5(-4)                              |
| Wiring         | 15      | 11      | W2(-4)                                      |
| Architecture   | 15      | 15      | none                                        |
| Dependencies   | 10      | 10      | none                                        |
| Logic          | 15      | 9       | L4(-4), L5(-2)                              |
| **Total**      | **100** | **76**  |                                             |

---

## Issues (MANDATORY)

| ID  | Severity   | Deduction | Category | Issue (one line) | Fix (one line) |
| --- | ---------- | --------- | -------- | ---------------- | -------------- |
| P1  | WARNING    | -2        | Paths    | Agent prompt line reference "line 87" is the end of hooks imports, not start of "Pre-Built Hooks" section (actual: line 80) | Cosmetic — insertion point is correct functionally |
| A4  | CRITICAL   | -8        | APIs     | ElevenLabs voice IDs are stale: `21m00Tcm4TlvDq8ikWAM` is now "Janet" not Rachel, `EXAVITQu4vr4xnSDxMaL` is now "Sarah" not Bella | Query `GET /v1/voices` at implementation time; use `pNInz6obpgDQGcFmaJgB` (Adam confirmed), replace others |
| A5  | WARNING    | -4        | APIs     | `convex/publish.ts` has `import { getPublishableTemplateFiles }` AFTER the exported action — import must be at top of file | Move import to file top with other imports |
| W2  | WARNING    | -4        | Wiring   | Task 9 changes `THERAPY_SEED_PROMPTS` TypeScript constant but templates page queries `api.therapy_templates.list` from DB — no re-seed step | Add step to re-run seed mutation after updating `therapy_seeds.ts` |
| L4  | WARNING    | -4        | Logic    | Google GenAI `responseModalities: ["IMAGE"]` not shown in docs examples for `gemini-3-pro-image-preview` — may be unnecessary or use wrong casing | Test empirically; docs show lowercase `['image']` in Interactions API |
| L5  | SUGGESTION | -2        | Logic    | ElevenLabs STT uses `scribe_v1` but `scribe_v2` is newer with better accuracy | Consider `scribe_v2` for better transcription quality |

---

## Correction Manifest (MANDATORY — one entry per issue)

### P1 — Agent prompt line reference slightly off

**Plan says:** "After the 'Pre-Built Hooks' section (line 87)"

**Codebase has:** `agent-prompt.ts` line 80: `## Pre-Built Hooks`. Line 87: `import { useDataCollection } from "./hooks/useDataCollection";`. The section runs 80–87.

**Correction:** The insertion point is correct (after the section ends at line 87). Update text to "After the Pre-Built Hooks imports block (ends at line 87)" for clarity.

**Affected plan locations:** Task 7 Step 1

---

### A4 — ElevenLabs voice IDs are stale/reassigned

**Plan says:**
```typescript
const VOICE_MAP: Record<string, string> = {
  "warm-female": "21m00Tcm4TlvDq8ikWAM", // Rachel
  "calm-male": "pNInz6obpgDQGcFmaJgB",   // Adam
  "child-friendly": "EXAVITQu4vr4xnSDxMaL", // Bella
};
```

**Codebase has:** Not yet implemented. Verified via ElevenLabs API (March 2026):
- `21m00Tcm4TlvDq8ikWAM` → now "Janet" (professional), NOT Rachel
- `pNInz6obpgDQGcFmaJgB` → still "Adam" ✓
- `EXAVITQu4vr4xnSDxMaL` → now "Sarah" (mature, reassuring), NOT Bella
- Real Bella ID: `hpp4J3VqNfWAUOO0d1Us`

**Correction:** Update VOICE_MAP:
```typescript
const VOICE_MAP: Record<string, string> = {
  "warm-female": "21m00Tcm4TlvDq8ikWAM", // Janet — warm, professional (was Rachel)
  "calm-male": "pNInz6obpgDQGcFmaJgB",   // Adam — confirmed correct
  "child-friendly": "hpp4J3VqNfWAUOO0d1Us", // Bella — bright, warm
};
```
Or better: query `GET https://api.elevenlabs.io/v1/voices` at implementation time to confirm current mappings. Janet may actually work fine as the "warm-female" — test the voices.

**Affected plan locations:** Task 4 Step 1 (plan), Spec section 1.2 `generate_speech` voice mapping

---

### A5 — Import statement placement in publish.ts

**Plan says:** Line 1200 of the plan has `import { getPublishableTemplateFiles } from "../src/features/builder/lib/template-files"` placed AFTER the `publishApp` action export (line 1123).

**Codebase has:** N/A (new file). But TypeScript/ESM requires all imports before any declarations.

**Correction:** Move the import to the top of the file:
```typescript
"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { getPublishableTemplateFiles } from "../src/features/builder/lib/template-files";

export const publishApp = action({
  // ... rest of action
});

function buildVercelFiles(/* ... */) {
  // ... uses getPublishableTemplateFiles() — now available
}
```

**Affected plan locations:** Task 12 Step 1

---

### W2 — Templates not re-seeded after modifying seed data

**Plan says:** Task 9 — "Replace the contents of `THERAPY_SEED_PROMPTS`" in `therapy_seeds.ts`, then commit.

**Codebase has:** `therapy_seeds.ts` exports a TypeScript constant array (`THERAPY_SEED_PROMPTS`). The templates page reads from the Convex `therapyTemplates` database table via `api.therapy_templates.list`. These are decoupled — changing the TS file does NOT update the database.

**Correction:** Add to Task 9:
```
- [ ] Step 2: Re-run the template seed to populate the database

Clear existing templates and re-seed with the 4 new templates:
1. Delete old entries: `npx convex run therapy_templates:deleteAll` (or manually via dashboard)
2. Run seed: `npx convex run templates/therapy_seeds:seedTemplates` (or equivalent seed function)

Verify: `npx convex run therapy_templates:list` returns 4 templates.
```

**Affected plan locations:** Task 9

---

### L4 — Google GenAI `responseModalities` may be unnecessary

**Plan says:**
```typescript
config: {
  responseModalities: ["IMAGE"],
  imageConfig: { aspectRatio: "1:1", imageSize: "1K" },
}
```

**Codebase has:** N/A (new code). Per `@google/genai` SDK docs verified via Context7: documented examples for `gemini-3-pro-image-preview` with `generateContent()` do NOT include `responseModalities`. The `imageConfig` structure is confirmed correct. The `responseModalities` field appears in the Interactions API with lowercase `['image']`.

**Correction:** Test empirically during implementation. If the call works without `responseModalities`, remove it. If it's needed, try lowercase `["image"]` per the Interactions API pattern. The `imageConfig` is correct regardless.

**Affected plan locations:** Task 3 Step 2, Spec "Image generation model note"

---

### L5 — Consider scribe_v2 for ElevenLabs STT

**Plan says:** `formData.append("model_id", "scribe_v1")` in `convex/stt.ts`

**Codebase has:** N/A (new code). ElevenLabs API verified: both `scribe_v1` and `scribe_v2` are valid. v2 is newer.

**Correction:** Change to `scribe_v2` for better accuracy:
```typescript
formData.append("model_id", "scribe_v2");
```

**Affected plan locations:** Task 4 Step 2

---

## Wiring Audit (MANDATORY)

| New Module | Wired Into | How | Status |
| ---------- | ---------- | --- | ------ |
| `convex/image_cache.ts` | `image_generation.ts` | `ctx.runQuery(internal.image_cache.getByHash)`, `ctx.runMutation(internal.image_cache.save)` | OK |
| `convex/image_generation.ts` | `route.ts` | `convex.action(api.image_generation.generateTherapyImage)` | OK |
| `convex/stt.ts` | `use-postmessage-bridge.ts` | `useAction(api.stt.transcribeSpeech)` | OK |
| `convex/publish.ts` | Builder UI (Task 13) | `useAction(api.publish.publishApp)` | OK |
| `convex/seeds/image_seeds.ts` | Manual trigger | `internalAction` — run via dashboard or `npx convex run` | OK |
| `use-postmessage-bridge.ts` | `preview-panel.tsx` | Hook called with iframe ref | OK |
| `template-files.ts` | `publish.ts` + `webcontainer-files.ts` | Shared template content | OK |
| `apps.getBySession` query | `publish.ts` | `ctx.runQuery(api.apps.getBySession)` | OK |
| `THERAPY_SEED_PROMPTS` update | `therapyTemplates` DB table | **Missing re-seed step** | MISSING (W2) |

---

## Completeness Checklist (MANDATORY)

| #   | Check             | Item                                              | Status | Notes |
| --- | ----------------- | ------------------------------------------------- | ------ | ----- |
| 1   | Schema changes    | `npx convex dev` step after schema modifications? | ✓      | Task 1 Step 3 |
| 2   | Convex functions  | All new functions exported?                       | ✓      | All use named exports |
| 3   | Bus events        | New events have listeners registered?             | N/A    | No bus events |
| 4   | Dashboard routes  | New pages have sidebar entries?                   | N/A    | Templates page already exists |
| 5   | Trigger.dev tasks | Deployment step mentioned?                        | N/A    | No Trigger.dev |
| 6   | Barrel exports    | New public APIs in slice `index.ts`?              | ✓      | Task 5 Step 5 |
| 7   | npm packages      | `npm install` step for new deps?                  | ✓      | All deps already installed |
| 8   | Environment vars  | New env vars documented?                          | ✓      | VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID in Task 12 |
| 9   | Convex imports    | Dashboard uses path aliases?                      | N/A    | No dashboard |
| 10  | ESM compliance    | All local imports use `.js` extensions?            | N/A    | TS module resolution |
| 11  | Test files        | Tests planned alongside implementation?           | ✓      | Tasks 8b, 11b, 14b (added in fixes) |

---

## Dependency Verification (MANDATORY)

| Package | Required By | Installed? | Version | API Verified? | Notes |
| ------- | ----------- | ---------- | ------- | ------------- | ----- |
| `@anthropic-ai/sdk` | route.ts multi-turn loop | ✓ | ^0.80.0 | Codebase read | `.messages.stream()`, `.finalMessage()` confirmed |
| `@google/genai` | image_generation.ts | ✓ | ^1.46.0 | Context7 | `GoogleGenAI`, `models.generateContent()` confirmed |
| `convex` | All Convex functions | ✓ | ^1.34.0 | Codebase read | `ConvexHttpClient`, schema, queries confirmed |
| `motion` | WebContainer template | ✓ (main app) | ^12.38.0 | N/A | Must be added to WC template deps (plan handles this) |
| `elevenlabs` | TTS/STT (REST API used) | ✓ | ^1.59.0 | Not used | Plan uses raw `fetch` — SDK available but not needed |

---

## API Spot-Checks (MANDATORY)

| Library | API Used in Plan | Verified Via | Correct? | Notes |
| ------- | ---------------- | ------------ | -------- | ----- |
| `@google/genai` | `GoogleGenAI`, `models.generateContent()` with `gemini-3-pro-image-preview` | Context7 | ✓ (with L4 note) | `responseModalities` may be unnecessary |
| `@google/genai` | Response path `candidates[0].content.parts[].inlineData.data` | Context7 | ✓ | Confirmed base64 image data |
| ElevenLabs TTS | `POST /v1/text-to-speech/${voiceId}` with `xi-api-key` header | WebSearch | ✓ | Endpoint, auth, model confirmed |
| ElevenLabs TTS | Model `eleven_flash_v2_5` | WebSearch | ✓ | Valid and current |
| ElevenLabs TTS | Voice IDs for Rachel, Adam, Bella | WebSearch | ✗ (A4) | Adam confirmed; Rachel→Janet, Bella→Sarah (IDs reassigned) |
| ElevenLabs STT | `POST /v1/speech-to-text` with FormData | WebSearch | ✓ | Endpoint, `file` + `model_id` format confirmed |
| ElevenLabs STT | Response `{ text }` | WebSearch | ✓ (partial) | Returns `text` plus `words`, `language_code`, `language_probability` |
| Vercel Deploy | `POST /v13/deployments` with `{file, data}` array | WebSearch | ✓ | All claims verified — endpoint, auth, body, response format |
| `@anthropic-ai/sdk` | `.messages.stream()`, `.finalMessage()`, `stop_reason` | Codebase read | ✓ | Already used in route.ts |

---

## Reuse Opportunities (IF APPLICABLE)

| Existing Code | Location | Replaces Plan Code In | Replacement Code |
| ------------- | -------- | --------------------- | ---------------- |
| Consider `elevenlabs` npm SDK | `package.json` (^1.59.0 installed) | Task 4 Step 2 (STT raw fetch) | `import { ElevenLabsClient } from "elevenlabs"; client.speechToText.convert(...)` — simpler API |
| Consider `imagen-4.0-generate-001` via `generateImages()` | `@google/genai` SDK | Task 3 (image gen) | Dedicated image API — simpler response shape, supports `enhancePrompt`, `negativePrompt`, `seed` |

---

## Over-Engineering Flags (IF APPLICABLE)

None — the plan has been well-scoped after the first verification round.

---

## Verified Correct (MANDATORY)

- **Schema additions are clean** — `imageCache` table with `by_promptHash` and `by_label_category` indexes verified against `convex/schema.ts:86-102`. Thumbnail fields on `therapyTemplates` are `v.optional()` — backward compatible.
- **Multi-turn tool loop is the right pattern** — `while (continueLoop)` with `stop_reason === "tool_use"` check, accumulating `messages` array with tool_result blocks, matches `@anthropic-ai/sdk` patterns. Existing single-turn structure in `route.ts:72-151` correctly identified as the replacement target.
- **ConvexHttpClient public function constraint handled** — `generateTherapyImage` correctly exported as `action` (not `internalAction`) because `route.ts` calls it via `ConvexHttpClient` which requires `api.*` functions. Plan includes explanatory comment.
- **SharedToolPage already handles publishedUrl** — Confirmed at line 47: `const previewUrl = app.publishedUrl ?? app.previewUrl`. Task 14 correctly says "No code change needed."
- **PublishSuccessModal accepts `publishedUrl` prop** — Confirmed in interface definition. Existing copy/QR/share UI ready to wire.
- **Builder toolbar already has onPublish callback** — `builder-toolbar.tsx` renders a "Publish" button wired to `onPublish` prop. Task 13 just needs to provide the handler.
- **`generated_files.list` signature matches** — Accepts `{ sessionId: v.id("sessions") }`, returns all files. Plan correctly uses `api.generated_files.list` (fix from prior A2).
- **Vercel Deploy API is fully correct** — All 5 claims (endpoint, auth, body format, file structure, response shape) verified against official docs.

---

## Re-verification Delta (Prior report → this report)

| Status   | ID  | Prior Issue | Current State |
| -------- | --- | ----------- | ------------- |
| FIXED    | P1-old | webcontainer deps "line 17-22" → actual 16-22 | Plan updated to "line 16-22" |
| FIXED    | A1  | Duplicate `generateImage` in `aiActions.ts` not addressed | Plan now includes Task 3 Step 1 to DELETE old function |
| FIXED    | A2  | `api.generated_files.listBySession` naming mismatch | Plan now uses `api.generated_files.list` |
| FIXED    | A3  | Model/API mismatch — `generateImages()` vs `generateContent()` | Plan now uses `generateContent()` with `gemini-3-pro-image-preview` |
| FIXED    | W1  | `sttEnabled` field set but never read | Plan removed the field and mutation entirely |
| FIXED    | D1  | Missing directory note for `convex/seeds/` | Plan now includes note and verification step |
| FIXED    | L1  | No test files planned | Plan now includes Tasks 8b, 11b, 14b with tests |
| FIXED    | L2  | `generateTherapyImage` as public action — concern about exposure | Plan added comment explaining why it must be public (ConvexHttpClient) |
| FIXED    | L3  | `getBySession` as public query | Plan added comment explaining dual-use potential |
| PERSISTS | P1  | Line reference "line 87" slightly misleading (section starts at 80) | Still says "line 87" — cosmetic, functionally correct |
| NEW      | A4  | ElevenLabs voice IDs stale (Rachel→Janet, Bella→Sarah) | IDs confirmed wrong via API verification |
| NEW      | A5  | Import placement in `publish.ts` — after export, should be at top | TypeScript syntax error |
| NEW      | W2  | Templates seed data changed but DB not re-seeded | Missing operational step |
| NEW      | L4  | `responseModalities: ["IMAGE"]` may be unnecessary | Needs empirical testing |
| NEW      | L5  | `scribe_v1` when `scribe_v2` is available | Minor — newer model available |

**Prior score:** 64/100 → **Current score:** 76/100 (+12)

**Score change breakdown:**

- Fixed issues recovered: +36 points (A1+4, A2+4, A3+8, W1+4, D1+4, L1+4, L2+4, L3+2, P1-old+2)
- Persisting issues: -2 points (P1)
- New issues: -22 points (A4-8, A5-4, W2-4, L4-4, L5-2)
- Net change: +12
