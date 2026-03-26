# Web Interface Guidelines Fixes

## Context
Audit of `src/` against Vercel's Web Interface Guidelines found 33 issues across accessibility, typography, semantics, performance, and focus states. The critical iframe sandbox issue (`allow-scripts allow-same-origin`) is excluded per user request.

## Changes by File

### 1. `src/shared/components/material-icon.tsx`
**Highest-leverage fix — adds `aria-hidden="true"` as default prop**
- Auto-fixes ~20 decorative icon instances across the entire app
- Icons inside buttons with `aria-label` should be hidden from screen readers anyway

### 2. `src/features/builder/components/chat-panel.tsx`
- Add `aria-label` to the chat `<Input>` (line ~343)
- Add `aria-label` to icon-only submit `<Button>` (line ~355)
- Replace `"Starting generation..."` with `"Starting generation…"` (line ~290)

### 3. `src/features/builder/components/code-panel.tsx`
- Add `aria-label="Copy file contents"` to copy button (line ~83)
- Add `aria-label="Download file"` to download button (line ~94)
- Replace `"Generating your files..."` with `"Generating your files…"` (line ~39)

### 4. `src/features/builder/components/builder-toolbar.tsx`
- Add `aria-label="Project name"` to inline name edit input (line ~74)
- Replace `"Loading Live Preview..."` with `"Loading Live Preview…"` (line ~102)
- Add `role="tab"` and `aria-selected` to segmented control buttons (Chat/Preview toggle, Preview/Code toggle)

### 5. `src/features/builder/components/preview-panel.tsx`
- Replace `"Setting up your preview..."` with `"Setting up your preview…"` (line ~53)
- Replace `transition-all` with `transition-[width]` on device size container (line ~33)

### 6. `src/features/dashboard/components/main-prompt-input.tsx`
- Add `aria-label="Describe a therapy tool"` to `<input>`
- Add `autocomplete="off"` to prevent password manager triggers
- Replace placeholder `"Describe a therapy tool..."` → `"Describe a therapy tool…"`
- Add `aria-label="Submit prompt"` to icon-only submit button

### 7. `src/features/dashboard/components/dashboard-view.tsx`
- Add `aria-hidden="true"` to decorative notification/help icons (line ~82-83) — already handled by MaterialIcon default, but also add `role="img"` removal or ensure they're not focusable

### 8. `src/features/landing/components/hero-section.tsx`
- Add `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` to both CTA Links (lines ~29, ~38)

### 9. `src/features/landing/components/cta-section.tsx`
- Add `focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary` to CTA Link (line ~22)

### 10. `src/shared/components/marketing-header.tsx`
- Add `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` to desktop CTA (line ~53) and mobile CTA (line ~84)

### 11. `src/features/landing/components/landing-footer.tsx`
- Replace `<span>` with `<Link href="#">` for Privacy Policy, Terms of Service, Accessibility (lines ~14-22)

### 12. `src/features/builder/components/blueprint-card.tsx`
- Change `<label>` to `<span>` in BlueprintField since it's display-only, not associated with an input (line ~15)

### 13. `src/features/builder/components/publish-success-modal.tsx`
- Add `aria-label` to Copy Link, QR Code, and Share icon buttons (lines ~96-141)

### 14. `src/features/sharing/components/share-dialog.tsx`
- Add `<DialogDescription className="sr-only">` for screen reader accessibility (after DialogTitle)

### 15. `src/features/builder/components/code-drawer.tsx`
- Replace `"Search files..."` with `"Search files…"` (line ~188)

### 16. `src/features/settings/components/settings-page.tsx`
- Add `onKeyDown` handler for Escape to close dropdown (line ~47)
- Add keyboard support for the custom dropdown menu

### 17. `src/features/dashboard/components/project-card.tsx`
- Replace hardcoded `formatTimeAgo` with `Intl.RelativeTimeFormat` for i18n-safe relative time

### 18. `src/app/layout.tsx`
- Add `<link rel="preconnect" href="https://fonts.googleapis.com" />`
- Add `<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />`
- Add `<meta name="theme-color" content="#f8faf8" media="(prefers-color-scheme: light)" />`
- Add `<meta name="theme-color" content="#191c1d" media="(prefers-color-scheme: dark)" />`

## Verification
1. `npx next build` — no build errors
2. `npx vitest run` — all 252 tests pass
3. Manual checks:
   - Tab through builder page — all buttons have visible focus rings
   - Screen reader test: icon-only buttons announce their labels
   - Loading states show `…` not `...`
   - Footer links are clickable
