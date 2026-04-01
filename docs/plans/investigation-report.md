# Springfield Vibeathon - Investigation Report

## Issue 1: Missing `/tools/[id]/edit` route

### Current State
- **Existing tool routes**: Only `/tools/new` exists (`src/app/(app)/tools/new/page.tsx`)
- **Routes.ts**: No `TOOLS_EDIT` constant exists in `src/core/routes.ts`
- **Current ROUTES constants**: `TOOL_VIEW`, `MY_TOOLS`, `TEMPLATES` — but no edit route for tools

### Navigation & Builder Hook Analysis
- The `use-tool-builder.ts` hook manages wizard state with 4 steps
- It has `instanceId` field (can load existing app_instances) and supports editing via `updateInstance` mutation
- The hook supports both creating new tools and updating existing ones through debounced autosave
- However, there's **no initialization logic to load existing instance by ID**

### Publish Panel Behavior
- `PublishPanel` only generates a share token URL: `/apps/{shareToken}`
- No "Edit" button after publish
- No link back to an edit page for published tools

### Backend Support (Convex)
- `tools.ts` has:
  - `get(id)` - query to fetch by ID
  - `update(id, ...)` - mutation to update existing instance
  - `listBySLP()` - list user's tools
  - Database has no screenshot/thumbnail field for app_instances
- Supports editing existing instances ✓
- But no query to prefetch instance data for edit mode

### What Needs to Be Created
1. **New route**: `src/app/(app)/tools/[id]/page.tsx` - edit page that loads existing tool by ID
2. **Route constant**: Add `TOOLS_EDIT: (id: string) => /tools/${id}` to `src/core/routes.ts`
3. **useToolBuilder enhancement**: Add initialization logic to load existing instance when editing
4. **Navigation link**: Add edit button in publish-panel.tsx or add edit capability to library/My Apps

### Known Issues
- ProjectCard clicks route to `/builder/{id}` (wrong - builder is for creating, not editing tools)
- My Apps page uses `sessions.list` (builder sessions) not `tools.listBySLP()` - scope mismatch
- No "Edit Tool" action in My Apps card menu

---

## Issue 2: Library Pagination + Card Images

### Current Pagination State
- **My Apps** (`my-tools-page.tsx`):
  - ✓ Implements pagination manually: `PAGE_SIZE = 12`, calculates `totalPages`, slices data
  - ✓ Uses URL search params to track page: `?page=1`
  - ✓ Handles navigation with `router.replace(/library?tab=${v}&page=1)`
  - ✗ **No Pagination component** - just manual slice/display
  
- **Templates** (`templates-page.tsx`):
  - ✓ Implements pagination manually: `PAGE_SIZE = 12`
  - ✓ Uses URL search params
  - ✗ **No Pagination component**
  - ✗ **Missing pagination UI controls** - no "Next", "Previous", or page numbers shown to user

### Card Images/Thumbnails State

#### My Apps Cards
- Requires `thumbnail` field: session has `previewUrl` field ✓
- ProjectCard receives: `thumbnail: session.previewUrl ?? null`
- Data flow: `sessions.previewUrl` → `ProjectCard.thumbnail` ✓

#### Templates Cards
- Uses conditional rendering: checks for `imageUrl` in template
- `THERAPY_SEED_PROMPTS` from `convex/templates/therapy_seeds.ts` provides template data
- Falls back to gradient + icon if no imageUrl
- Image handling: Next.js Image component with object-cover ✓

### What's Missing

1. **Pagination UI Component**:
   - ✗ No `src/shared/components/ui/pagination.tsx` exists
   - ✗ No pagination controls (prev/next buttons, page numbers, dots)
   - Both pages calculate totals but don't display them
   
2. **My Apps Thumbnail Display Issue**:
   - Data model `sessions` **has** `previewUrl` field ✓
   - ProjectCard **expects** `thumbnail` field ✓
   - Mapping is correct ✓
   - **No known issue** - should display fine if previewUrl is populated

3. **Templates Thumbnail Issue**:
   - `THERAPY_SEED_PROMPTS` data structure needs `imageUrl` field
   - Only displayed if `"imageUrl" in template` and `template.imageUrl` is truthy
   - Need to verify therapy_seeds.ts includes imageUrl fields for templates

### Database (Convex Schema)

#### app_instances (tools)
Fields: templateType, title, patientId, slpUserId, configJson, status, version, shareToken, publishedAt
- **Missing thumbnail/screenshot field** - no image storage

#### sessions (My Apps in builder)
Fields: userId, title, query, state, blueprint, sandboxId, previewUrl, publishedUrl, patientId, archived
- **Has previewUrl** ✓

### What Needs to Be Created

1. **Pagination Component** (`src/shared/components/ui/pagination.tsx`):
   - Prev/Next buttons
   - Page number display or dots
   - Current page highlight
   - Reusable for both My Apps and Templates

2. **Update both pages to display pagination**:
   - My Apps: Add pagination controls below grid
   - Templates: Add pagination controls below grid
   - Connect to URL search params for navigation

3. **Optional: Add image support to app_instances**:
   - Add `thumbnailUrl` field to schema (for manual tool thumbnails)
   - Or generate screenshot after publish
   - Currently relying on session.previewUrl which may not exist for published tools

---

## Summary

| Issue | Status | Type |
|-------|--------|------|
| Missing `/tools/[id]/edit` route | Not implemented | Create new route + hook init |
| Pagination UI component | Not implemented | Create component + integrate |
| My Apps pagination controls | Not shown | Add UI integration |
| Templates pagination controls | Not shown | Add UI integration |
| Tool thumbnail images | Partially supported | Works for sessions, needs tool-specific support |
| Route constant for edit | Not defined | Add to routes.ts |

