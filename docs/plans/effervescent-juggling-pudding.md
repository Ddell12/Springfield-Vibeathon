# Fix AI Pipeline Generation Failure — Missing `contents` Field

## Context

The pipeline crashes during code generation with `ArgumentValidationError: Object is missing the required field 'contents'`. The `generated_files:upsert` mutation requires `{contents, purpose}` but receives `undefined` for both. This happens because `toolUse.input` is unsafely cast with `as` (line 440) and never validated at runtime — if the LLM returns different field names, the values are silently `undefined`.

Additionally, the `validatePhase` error-fix path (line 625-644) silently swallows all errors, making failures invisible.

## Plan

### Step 1: Add runtime validation before file upsert in `implementPhase`
**File:** `convex/pipeline.ts` (lines 438-442 and 470-479)

Before pushing to `collectedFiles`, validate the tool input has actual content:

```typescript
for (const toolUse of toolUseBlocks) {
  if (toolUse.name === "write_file") {
    const input = toolUse.input as Record<string, unknown>;
    const filePath = (input.filePath ?? input.file_path ?? input.path) as string | undefined;
    const fileContents = (input.fileContents ?? input.file_contents ?? input.contents ?? input.code) as string | undefined;
    const filePurpose = (input.filePurpose ?? input.file_purpose ?? input.purpose ?? "") as string;

    if (filePath && fileContents) {
      collectedFiles.push({ filePath, fileContents, filePurpose });
    } else {
      console.warn("Skipping file with missing fields:", JSON.stringify(input).slice(0, 200));
    }
  }
}
```

This handles LLM field name variations (`fileContents` vs `contents` vs `content` vs `code`) gracefully.

### Step 2: Add same validation before upsert in `validatePhase`
**File:** `convex/pipeline.ts` (lines 625-644)

Add logging when Zod parsing fails, and validate fields before upsert:

```typescript
try {
  const reviewJson = extractJson(textBlock.text);
  const parsed = PhaseImplementationSchema.safeParse(JSON.parse(reviewJson));
  if (parsed.success) {
    for (const file of parsed.data.files) {
      if (!file.fileContents) {
        console.warn("Validation fix skipped file missing contents:", file.filePath);
        continue;
      }
      await ctx.runMutation(internal.generated_files.upsert, { ... });
    }
  } else {
    console.warn("Validation fix parsing failed:", parsed.error.message);
  }
} catch (error) {
  console.warn("Validation fix JSON parse failed:", error instanceof Error ? error.message : "unknown");
}
```

### Step 3: Make the pipeline error catch propagate to UI
**File:** `convex/pipeline.ts` (line 55-60)

The top-level catch already calls `setFailed`. Verify the UI shows the failed state instead of "Implementing..." forever. Check how the frontend reads `session.state === "failed"`.

**File:** `src/features/builder/components/` — search for how `"failed"` state is rendered.

### Step 4: Strengthen the VALIDATION_PROMPT
**File:** `convex/pipeline_prompts.ts` (line 101-112)

Add explicit field name enforcement to the validation prompt.

## Files to Modify

| File | Change |
|------|--------|
| `convex/pipeline.ts:438-442` | Add field name fallback + validation before pushing to collectedFiles |
| `convex/pipeline.ts:625-644` | Add logging on parse failure, validate before upsert |
| `convex/pipeline_prompts.ts:101-112` | Strengthen validation prompt with explicit field names |

## Verification

1. `npx convex dev --once` — deploys without errors
2. Build a therapy tool E2E — all phases complete without `ArgumentValidationError`
3. Check Convex logs for any `console.warn` about skipped files (should be none with correct tool schema)
4. If the LLM does use wrong field names, the fallback catches it instead of crashing
