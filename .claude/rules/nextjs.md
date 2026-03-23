# Next.js App Router Rules

## Routing

- Use the App Router (`app/` directory). Never mix with Pages Router.
- File-based routing: `app/foo/page.tsx` → `/foo`, `app/foo/[id]/page.tsx` → `/foo/:id`.
- Layout files (`layout.tsx`) wrap all child pages; do not duplicate shared UI in pages.
- `loading.tsx` provides Suspense boundaries for route segments.
- `error.tsx` must be a Client Component (`"use client"`); receives `error` and `reset` props.
- `not-found.tsx` handles 404 within a segment.

## Server vs Client Components

- All components are Server Components by default — no `"use client"` unless needed.
- Add `"use client"` only when the component uses hooks, browser APIs, or event handlers.
- Keep Client Components small and push data fetching up to Server Components.
- Never import server-only modules (database, fs, crypto) in Client Components.

## Data Fetching

- Fetch data in Server Components using `async`/`await` directly.
- Use `cache()` from React for request-level deduplication.
- Prefer `generateStaticParams` for static dynamic routes; use `revalidate` for ISR.
- API routes live in `app/api/route.ts` and export named HTTP handlers (`GET`, `POST`, etc.).

## Metadata

- Export `metadata` object or `generateMetadata` function from `page.tsx` or `layout.tsx`.
- Never set `<title>` or `<meta>` tags in JSX — use the Metadata API exclusively.

## Patterns

- Co-locate page-specific components under the route segment, not in a global `components/`.
- Shared UI belongs in `components/` at the root of `src/`.
- Use `<Link>` from `next/link` for client-side navigation; never use `<a>` for internal links.
- Use `<Image>` from `next/image` for all images — never bare `<img>`.
- Server Actions (`"use server"`) handle form mutations; pair with `useFormStatus` / `useActionState`.
- Route handlers that mutate data must verify CSRF or use same-origin checks.
