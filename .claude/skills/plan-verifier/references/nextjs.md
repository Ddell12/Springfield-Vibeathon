# Next.js (App Router)

Last updated: 2026-03-06

> PROJECT CONTEXT: Next.js 16 with App Router exclusively (dashboard at `dashboard/`). Convex is the backend. Never use Pages Router patterns.

---

## Quick Reference

| Pattern              | Correct                                                               | Wrong                                                 |
| -------------------- | --------------------------------------------------------------------- | ----------------------------------------------------- |
| Data fetching        | `async` Server Component with `await`                                 | `getServerSideProps`, `getStaticProps` (Pages Router) |
| Client interactivity | `"use client"` at top of file                                         | Using hooks in Server Components                      |
| Navigation           | `<Link>` from `next/link`                                             | `<a href="...">` for internal links                   |
| Images               | `<Image>` from `next/image`                                           | `<img>` tags                                          |
| Page metadata        | `export const metadata` or `export async function generateMetadata()` | `<title>` or `<meta>` in JSX                          |
| Page/layout exports  | `export default function Page()`                                      | Named exports for page/layout                         |
| Error boundaries     | `error.tsx` with `"use client"`                                       | `error.tsx` as Server Component (will break)          |
| Route params         | `params` is a `Promise` — must `await`                                | Synchronous `params.id` access (removed in v16)       |
| Search params        | `searchParams` is a `Promise` — must `await`                          | Synchronous `searchParams.q` access                   |
| Caching              | Opt-in with `"use cache"` directive or `fetch` options                | Assuming implicit caching (v14 behavior)              |
| Server Actions       | Define in separate file with `"use server"`                           | Inline `"use server"` in Client Components            |
| Convex imports       | `import { api } from "convex/_generated/api"`                         | Relative path imports to Convex                       |

---

## Best Practices (Non-Obvious)

- **`fetch()` NOT cached by default** since v15. Opt in with `{ cache: 'force-cache' }` or `"use cache"` directive.
- **`"use cache"` is preferred over `unstable_cache`** in v16. Can apply to pages, components, or functions.
- **Wrap slow fetches in `<Suspense>`** to enable streaming — top-level awaits block the entire page.
- **Never combine conflicting fetch options** like `{ revalidate: 3600, cache: 'no-store' }` — both silently ignored.
- **Client router enforces 30-second minimum stale time** regardless of config.
- **Anything passed Server→Client is serialized** into the JS bundle. Never pass secrets or large datasets.

---

## Known Gotchas

### 1. Async params and searchParams (BREAKING in v16)

`params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` are all `Promise`-based. Synchronous access removed.

```tsx
// CORRECT (v16)
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}

// WRONG (crashes in v16)
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params; // TypeError: params is a Promise
}
```

### 2. Overly broad `"use client"` boundaries

Placing `"use client"` too high forces large static sections to hydrate. Extract interactive parts into small Client Components.

### 3. `fetch()` caching defaults changed

v14 cached by default, v15+ does not. Pages may become slow after upgrade without explicit caching.

### 4. Middleware auth bypass (CVE-2025-29927)

`x-middleware-subrequest` header bypasses middleware. Update to 15.2.3+. Never rely solely on middleware for auth.

### 5. `"use client"` does NOT mean client-only

Client Components are still prerendered on the server. The directive means "needs client-side JS capabilities."

### 6. `useSearchParams` without Suspense

Opts the entire route into client-side rendering. Always wrap in `<Suspense>`.

### 7. Next.js 16 removed features

AMP removed. `middleware.ts` deprecated (use `proxy.ts`). Node 18 dropped (requires 20.9+).

---

## Common AI Plan Mistakes

1. **Suggesting `getServerSideProps`/`getStaticProps`** — Pages Router only.
2. **Forgetting `"use client"` on `error.tsx`** — MUST be a Client Component.
3. **Synchronous params access** — `params` is a Promise in v16.
4. **Creating API routes for internal data** — use Server Components or Convex.
5. **Placing `"use client"` on entire pages** — extract interactive child instead.
6. **Assuming fetch is cached** — opt-in since v15.
7. **Mixing `next/router` and `next/navigation`** — App Router uses `next/navigation`.
8. **Using `<Head>` from `next/head`** — use Metadata API.
9. **Creating `_app.tsx`/`_document.tsx`** — Pages Router files.
10. **Not wrapping `useSearchParams` in Suspense** — opts route into CSR.
11. **Passing non-serializable props** Server→Client (functions, classes, Dates).

---

## Project-Specific: Convex Client Component

```tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api"; // PATH ALIAS, not relative

export function TaskList() {
  const tasks = useQuery(api.tasks.dashboard.listByStatus, { status: "active" });
  if (!tasks) return <div>Loading...</div>;
  return (
    <ul>
      {tasks.map((t) => (
        <li key={t._id}>{t.title}</li>
      ))}
    </ul>
  );
}
```

## v16 Async Params Pattern

```tsx
export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <article>...</article>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Post ${id}` };
}
```

---

Sources: [Next.js App Router Docs](https://nextjs.org/docs/app), [Next.js 16 Blog](https://nextjs.org/blog/next-16), [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16), [Next.js Caching Guide](https://nextjs.org/docs/app/guides/caching)
