# Fix Landing Page Overflow + Improve Webapp Test Script

## Context

Webapp testing revealed 18/25 test failures. Root cause analysis shows **two independent issues**:

1. **Landing page horizontal overflow** (16-64px at all viewports) — decorative CSS elements extend beyond the viewport, causing a horizontal scrollbar
2. **Test script builder timeout** — the Playwright test uses `networkidle` wait strategy on `/builder`, but WebContainer keeps network connections alive indefinitely, so it never fires

Once both are fixed, the test suite should go from 17/25 → 25/25 passing.

---

## Step 1: Fix Landing Page Horizontal Overflow

### Root Cause

Two components have absolutely-positioned decorative elements that extend beyond their containers without `overflow-hidden`:

**A) Hero section decorative background** (`hero-section.tsx:49`)
```tsx
<div className="absolute -z-10 w-[120%] h-[120%] bg-surface-container-low rounded-[3rem] -top-[10%] -right-[10%] rotate-3" />
```
- `w-[120%]` + `-right-[10%]` = extends 30% beyond parent's right edge
- Parent `<div className="lg:col-span-6 relative">` (line 48) has no overflow clipping

**B) CTA section decorative circles** (`cta-section.tsx:9-10`) — these are already inside an `overflow-hidden` container (line 8), so **not a problem**. Verified: `<div className="bg-primary-gradient ... relative overflow-hidden">`.

### Fix

**File: `src/features/landing/components/hero-section.tsx`** (line 48)

Change:
```tsx
<div className="lg:col-span-6 relative">
```
To:
```tsx
<div className="lg:col-span-6 relative overflow-hidden">
```

This clips the decorative `w-[120%]` background to the grid column bounds while keeping it visually identical (the visible portion of the rotated shape stays within the column).

**One line change. No visual difference — the clipped portion was already off-screen or behind content.**

---

## Step 2: Fix Test Script — Builder Timeout + Better Selectors

### Changes to `/tmp/bridges_webapp_test.py`

**A) Use `domcontentloaded` for `/builder` route** — WebContainer's WASM runtime keeps fetching indefinitely, so `networkidle` never resolves.

- Test 2 (Navigation): For `/builder` route, use `wait_until="domcontentloaded"` + explicit `wait_for_selector` on a known element
- Test 3 (Builder Flow): Same — use `domcontentloaded` + wait for chat input
- Test 4 (Responsive): Same for builder viewport tests

**B) Use correct builder selectors** based on actual DOM structure:
- Chat input: `input[placeholder*="therapy"]` (shadcn `<Input>`, not textarea)
- Preview: `iframe[title="App Preview"]`
- Resizable panels: `[data-panel-group-id]` (shadcn/radix attribute, not `[data-panel-group]`)
- Toolbar: `button:has-text("Preview")`, `button:has-text("Publish")`, `a[href="/dashboard"]`

**C) Add WebContainer preload to noise filter** for console warnings:
```python
noise_patterns += ["staticblitz.com", "preloaded using link preload"]
```

**D) Make BASE_URL configurable** — accept from environment or auto-detect:
```python
BASE_URL = os.environ.get("TEST_URL", "http://localhost:3000")
```

### Full list of line changes:

| Line(s) | Current | Change To |
|---------|---------|-----------|
| 12 | `BASE_URL = "http://localhost:3001"` | `BASE_URL = os.environ.get("TEST_URL", "http://localhost:3000")` |
| 112 | `wait_until="networkidle"` (all routes) | Route-specific: `"domcontentloaded"` for `/builder`, `"networkidle"` for others |
| 146 | `wait_until="networkidle"` | `wait_until="domcontentloaded"` + `page.wait_for_selector('input', timeout=10000)` |
| 150 | `[data-panel-group]` | `[data-panel-group-id]` |
| 158 | `textarea, input[type='text']` | `input[placeholder*="therapy"], input[placeholder*="changes"]` |
| 166 | `iframe, [data-panel-id]` | `iframe[title="App Preview"]` |
| 180 | `textarea, input[type='text']` | `input[placeholder*="therapy"], input[placeholder*="changes"]` |
| 219 | `wait_until="networkidle"` (builder) | `"domcontentloaded"` for builder paths |
| 245 | noise_patterns list | Add `"staticblitz.com"`, `"preloaded using link preload"` |

---

## Step 3: Re-run Tests and Verify

1. Restart dev server: `lsof -ti :3000 | xargs kill -9; npm run dev`
2. Confirm server on correct port
3. Run: `python3 /tmp/bridges_webapp_test.py`
4. Expected: 25/25 pass, 0 console errors, no horizontal overflow

### Verification checklist:
- [ ] Landing page `scrollWidth === clientWidth` at 375px, 768px, 1280px
- [ ] Builder page loads without timeout
- [ ] Chat input accepts text
- [ ] Preview iframe element found
- [ ] Resizable panels detected
- [ ] All console errors remain at 0
- [ ] All screenshots captured (10 total)

---

## Files Modified

| File | Change |
|------|--------|
| `src/features/landing/components/hero-section.tsx` | Add `overflow-hidden` to decorative container (line 48) |
| `/tmp/bridges_webapp_test.py` | Fix wait strategy, selectors, noise filter, configurable URL |
