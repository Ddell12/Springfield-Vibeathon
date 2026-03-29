# Plan: Fix Preview Pipeline — Tailwind CDN + CSS + Animations + FOUC (COMPLETED)

## Context

The builder preview renders unstyled apps in the iframe on deployed Vercel (bridgeai-iota.vercel.app). There are **4 compounding issues** causing broken styling: wrong CDN config variable, a race condition, missing animation CSS (from `tailwindcss-animate` plugin the CDN can't load), and CSS `@layer` conflicts. Plus a polish item for FOUC prevention.

## Changes

All changes are in **2 files**: `src/app/api/generate/route.ts` and `src/features/builder/components/preview-panel.tsx`.

---

### Fix 1: Tailwind CDN Config — Wrong Variable + Race Condition
**File:** `src/app/api/generate/route.ts` (~lines 297-298)
**Priority:** Critical — this is the primary cause of all unstyled content

**Current:**
```html
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwindcss.config = { darkMode: ["class"], theme: { extend: ${twExtend} } };</script>
```

**Replace with:**
```html
<script>window.tailwind = { config: { darkMode: ["class"], theme: { extend: ${twExtend} } } };</script>
<script src="https://cdn.tailwindcss.com"></script>
```

**Why:** (a) The CDN reads `tailwind.config`, not `tailwindcss.config` — config was silently ignored. (b) Pre-defining `window.tailwind` before the CDN `<script src>` eliminates the async race condition in blob: URL context.

---

### Fix 2: Inline `tailwindcss-animate` CSS
**File:** `src/app/api/generate/route.ts` (~line 299, the `<style>` tag)
**Priority:** High — 12 shadcn/ui components (dialog, sheet, popover, dropdown, toast, etc.) depend on `animate-in`/`animate-out` classes

The CDN can't load the `tailwindcss-animate` Node plugin via `require()`. We need to inline the CSS it would generate as a static `<style>` block in the bundle HTML.

**Add a second `<style>` tag** after the existing `<style>${processedCss}</style>` containing:

```css
/* tailwindcss-animate — inlined because CDN can't load Node plugins */
@keyframes enter {
  from {
    opacity: var(--tw-enter-opacity, 1);
    transform: translate3d(var(--tw-enter-translate-x, 0), var(--tw-enter-translate-y, 0), 0)
      scale3d(var(--tw-enter-scale, 1), var(--tw-enter-scale, 1), var(--tw-enter-scale, 1))
      rotate(var(--tw-enter-rotate, 0));
  }
}
@keyframes exit {
  to {
    opacity: var(--tw-exit-opacity, 1);
    transform: translate3d(var(--tw-exit-translate-x, 0), var(--tw-exit-translate-y, 0), 0)
      scale3d(var(--tw-exit-scale, 1), var(--tw-exit-scale, 1), var(--tw-exit-scale, 1))
      rotate(var(--tw-exit-rotate, 0));
  }
}

.animate-in { animation: enter 150ms; }
.animate-out { animation: exit 150ms; }

/* Fade */
.fade-in { --tw-enter-opacity: 0; }
.fade-in-0 { --tw-enter-opacity: 0; }
.fade-out { --tw-exit-opacity: 0; }
.fade-out-0 { --tw-exit-opacity: 0; }
.fade-out-80 { --tw-exit-opacity: 0.8; }

/* Zoom */
.zoom-in-90 { --tw-enter-scale: 0.9; }
.zoom-in-95 { --tw-enter-scale: 0.95; }
.zoom-out-95 { --tw-exit-scale: 0.95; }

/* Slide — enter */
.slide-in-from-top { --tw-enter-translate-y: -100%; }
.slide-in-from-top-2 { --tw-enter-translate-y: -0.5rem; }
.slide-in-from-top-full { --tw-enter-translate-y: -100%; }
.slide-in-from-top-\[48\%\] { --tw-enter-translate-y: -48%; }
.slide-in-from-bottom { --tw-enter-translate-y: 100%; }
.slide-in-from-bottom-2 { --tw-enter-translate-y: 0.5rem; }
.slide-in-from-bottom-full { --tw-enter-translate-y: 100%; }
.slide-in-from-left { --tw-enter-translate-x: -100%; }
.slide-in-from-left-2 { --tw-enter-translate-x: -0.5rem; }
.slide-in-from-left-1\/2 { --tw-enter-translate-x: -50%; }
.slide-in-from-left-52 { --tw-enter-translate-x: -13rem; }
.slide-in-from-right { --tw-enter-translate-x: 100%; }
.slide-in-from-right-2 { --tw-enter-translate-x: 0.5rem; }
.slide-in-from-right-52 { --tw-enter-translate-x: 13rem; }

/* Slide — exit */
.slide-out-to-top { --tw-exit-translate-y: -100%; }
.slide-out-to-top-\[48\%\] { --tw-exit-translate-y: -48%; }
.slide-out-to-bottom { --tw-exit-translate-y: 100%; }
.slide-out-to-left { --tw-exit-translate-x: -100%; }
.slide-out-to-left-1\/2 { --tw-exit-translate-x: -50%; }
.slide-out-to-left-52 { --tw-exit-translate-x: -13rem; }
.slide-out-to-right { --tw-exit-translate-x: 100%; }
.slide-out-to-right-52 { --tw-exit-translate-x: 13rem; }
.slide-out-to-right-full { --tw-exit-translate-x: 100%; }
```

This covers every `tailwindcss-animate` class used across the 12 scaffold UI components (dialog, sheet, popover, dropdown-menu, select, tooltip, toast, context-menu, hover-card, menubar, navigation-menu, accordion).

**Implementation:** Define this as a const string (e.g. `ANIMATE_CSS`) near the top of the bundling block and inject it as `<style>${ANIMATE_CSS}</style>` in the HTML template.

---

### Fix 3: Move `:root` Variables Out of `@layer base`
**File:** `src/app/api/generate/route.ts` (~lines 257-267, CSS processing)
**Priority:** Medium — prevents potential cascade conflicts with CDN-injected layers

The processed CSS currently preserves `@layer base { :root { ... } }` from index.css. The CDN injects its own `@layer base` rules. While `:root` custom properties aren't affected by specificity issues, the second `@layer base` block (with `* { @apply border-border }`) becomes inert after stripping.

**Add a processing step** to unwrap `:root` and `.dark` blocks from `@layer base`:
```typescript
// Unwrap :root and .dark from @layer base — CDN manages its own layers
.replace(/@layer\s+base\s*\{(\s*:root\s*\{[\s\S]*?\}\s*)\}/g, '$1')
.replace(/@layer\s+base\s*\{(\s*\.dark\s*\{[\s\S]*?\}\s*)\}/g, '$1')
// Remove empty @layer base blocks (left after @apply stripping)
.replace(/@layer\s+base\s*\{\s*(?:\/\*[^*]*\*\/\s*)*\}/g, '')
```

---

### Fix 4: FOUC Prevention
**File:** `src/features/builder/components/preview-panel.tsx`
**Priority:** Low (polish) — prevents flash of unstyled content while CDN loads

Add an `onLoad` handler to the iframe and overlay a loading shimmer until the iframe signals ready:

1. Add state: `const [iframeReady, setIframeReady] = useState(false)`
2. Reset on new bundle: `useEffect(() => setIframeReady(false), [blobUrl])`
3. Add `onLoad={() => setIframeReady(true)}` to the `<iframe>`
4. Render a backdrop overlay when `hasPreview && !iframeReady`:
   ```tsx
   {hasPreview && !iframeReady && (
     <div className="absolute inset-0 flex items-center justify-center bg-background/80">
       <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
     </div>
   )}
   ```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/app/api/generate/route.ts` | Fix 1 (CDN config), Fix 2 (animate CSS), Fix 3 (unwrap @layer) |
| `src/features/builder/components/preview-panel.tsx` | Fix 4 (FOUC overlay) |

## Verification

1. **Local test:** `npm run dev` → open `/builder` → generate "Create a card with a teal heading and a button that slides in". Confirm:
   - Card has correct `bg-primary` teal color
   - Button has entrance animation (proves `tailwindcss-animate` CSS works)
   - Fonts are Nunito/Inter
   - No flash of unstyled content (loading overlay appears briefly)

2. **Console check:** In iframe dev tools:
   - No `ReferenceError` errors
   - `getComputedStyle(document.documentElement).getPropertyValue('--primary')` returns `"0 0% 9%"`
   - `getComputedStyle(document.querySelector('.bg-primary')).backgroundColor` resolves

3. **Component test:** Open a dialog or sheet in the generated app — confirm it fades/zooms in smoothly (not instant pop)

4. **Regression:** `npm test` — existing unit tests should pass unchanged

5. **Deploy:** Push to Vercel, test on `bridgeai-iota.vercel.app/builder` to confirm blob: URL context works
