---
name: new-app
description: Scaffold a new full-stack project with Next.js (latest), Convex backend, Clerk auth (optional), shadcn/ui, Tailwind v4, and TypeScript. Use when starting a new project, bootstrapping a SaaS, building a prototype, entering a hackathon, or when the user says "new project", "new app", "starter kit", "scaffold", "bootstrap", "init project", or "create app". Runs a setup script then generates boilerplate files, creates a GitHub repo, sets up CI/CD, and deploys to Vercel.
---

# New App

Scaffold a production-ready full-stack project foundation. Stack: Next.js + Convex + Clerk + shadcn/ui + Tailwind v4.

## Workflow

There are two modes:
- **Template mode** (preferred): Clone from `ddell12/hackathon-starter` GitHub template if it exists
- **Scaffold mode** (fallback): Create from scratch using `create-next-app` if template repo doesn't exist yet

### 1. Gather Requirements

Ask the user (skip if already provided):

```
- Project name? (kebab-case, e.g. "my-saas-app")
- Target directory? (default: ~/Projects/<project-name>)
- AI personality / system prompt? (e.g. "helpful dental assistant", "friendly fitness coach")
- Voice agent? (ElevenLabs — yes/no, default no)
- Admin panel? (yes/no, default yes)
- Billing? (Stripe — yes/no, default no)
- shadcn base color? (neutral | gray | zinc | stone | slate — default: neutral)
```

### 2a. Template Mode (preferred)

If `ddell12/hackathon-starter` exists on GitHub:

```bash
gh repo create <project-name> --private --template ddell12/hackathon-starter --clone
cd ~/Projects/<project-name>
```

Then customize:
- Rename in `package.json` (name, description)
- Update `src/lib/ai/system-prompt.ts` with AI personality
- If voice=no: remove ElevenLabs components and voice-related code
- If admin=no: remove `/dashboard/admin` route
- If billing=no: remove Stripe components and billing routes
- Run `npm install`

### 2b. Scaffold Mode (fallback)

If template repo doesn't exist, run the setup script:

```bash
bash <skill-path>/scripts/setup.sh \
  --name <project-name> \
  --dir <target-directory> \
  --auth yes \
  --theme <neutral|gray|zinc|stone|slate> \
  --components "button,card,input,dialog,sonner,dropdown-menu,table,avatar,badge,sidebar,command"
```

The script handles:
- `npx create-next-app@latest` with TypeScript, Tailwind, App Router, src/ dir, import alias
- `npx convex dev --once` to initialize Convex project (interactive — user picks project name)
- `npx shadcn@latest init -y -b <theme>` to initialize shadcn/ui
- `npx shadcn@latest add` for requested components
- Clerk SDK install: `@clerk/nextjs`, `@clerk/backend`, `svix`
- `next-themes` for dark mode support
- Dev dependency installs: `prettier`, `vercel`
- Writes `.prettierrc` config
- Adds `.vercel` to `.gitignore`

### 3. Generate Boilerplate Files

After the script completes, generate these files using the templates in `references/templates.md`. Adapt content to the project name and auth choice.

**Always generate:**

| File | Purpose |
|------|---------|
| `convex/schema.ts` | Starter schema with users table (if auth) or empty schema |
| `src/components/convex-provider.tsx` | ConvexProviderWithClerk (auth) or ConvexProvider (no auth) |
| `src/components/theme-provider.tsx` | next-themes wrapper for dark mode |
| `src/components/mode-toggle.tsx` | Dark/light/system theme dropdown toggle |
| `src/app/layout.tsx` | Root layout with providers, fonts, ThemeProvider, Toaster |
| `src/app/page.tsx` | Landing page with project name |
| `src/app/loading.tsx` | Spinner for Suspense fallback |
| `src/app/error.tsx` | Error boundary with retry button |
| `src/app/not-found.tsx` | 404 page with "Go Home" link |
| `src/lib/utils.ts` | cn() utility (shadcn generates this) |
| `next.config.ts` | transpilePackages: ["convex"] |
| `.env.local` | Placeholder env vars with instructions |
| `CLAUDE.md` | Project instructions for Claude Code |
| `.github/workflows/ci.yml` | Lint + typecheck on push/PR to main |
| `.github/workflows/deploy.yml` | Convex deploy + Vercel prebuilt deploy on push to main |

**If auth=yes, also generate:**

| File | Purpose |
|------|---------|
| `convex/auth.config.ts` | Clerk JWT provider config |
| `convex/users.ts` | `current` query, `upsertFromClerk` / `deleteFromClerk` internalMutations |
| `convex/http.ts` | httpRouter with `/clerk-users-webhook` POST handler + svix verification |
| `src/middleware.ts` | Clerk middleware with public/protected routes |
| `src/app/sign-in/[[...sign-in]]/page.tsx` | Clerk sign-in page |
| `src/app/sign-up/[[...sign-up]]/page.tsx` | Clerk sign-up page |

### 4. Git + GitHub + Vercel Setup

After generating all boilerplate files:

1. Initialize git and make initial commit:
   ```bash
   git init
   git add -A
   git commit -m "Initial scaffold"
   ```

2. Create GitHub repo and push:
   ```bash
   gh repo create <project-name> --private --source=. --push
   ```

3. Link Vercel project:
   ```bash
   npx vercel link --yes
   ```

4. Extract Vercel IDs and set as GitHub secrets:
   ```bash
   VERCEL_ORG_ID=$(cat .vercel/project.json | npx -y json orgId)
   VERCEL_PROJECT_ID=$(cat .vercel/project.json | npx -y json projectId)
   gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID"
   gh secret set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID"
   ```

### 5. Invoke env-setup Skill + Convex Env Vars

Invoke the `env-setup` skill to populate `.env.local` with real API keys from the user's Obsidian vault and Bitwarden.

Then set Convex environment variables using the setup script:
```bash
# Build the flags based on user's choices
FLAGS=""
[[ "$BILLING" == "yes" ]] && FLAGS="$FLAGS --with-stripe"
[[ "$VOICE" == "yes" ]] && FLAGS="$FLAGS --with-elevenlabs"
# R2 and Resend are always included
FLAGS="$FLAGS --with-r2 --with-resend"

bash <skill-path>/scripts/setup-convex-env.sh $FLAGS
```

Then set GitHub deployment secrets:
```bash
bash <skill-path>/scripts/setup-github-secrets.sh
```

Remind the user about the Clerk webhook (must be done manually in Clerk Dashboard):
- Clerk Dashboard → Webhooks → Add endpoint
- URL: `<CONVEX_SITE_URL>/clerk-users-webhook`
- Events: `user.created`, `user.updated`, `user.deleted`
- Copy the signing secret → it's set by `setup-convex-env.sh` as `CLERK_WEBHOOK_SECRET`

### 6. Post-Setup Instructions

Print summary to user:

```
Setup complete! Your project is ready at <target-directory>.

What was set up:
- Next.js 16 app with TypeScript 5.9, Tailwind v4, shadcn/ui
- Convex backend (schema, auth, user management, file storage)
- Clerk auth (sign-in, sign-up, middleware, webhook sync)
- AI chat (Claude API + ai-elements UI components)
- Voice agent (ElevenLabs — if selected)
- Dark mode with next-themes
- Error boundary, loading states, 404 page
- GitHub repo (private) with CI/CD workflows
- Vercel project linked, deployment secrets configured
- .env.local populated from Bitwarden
- Convex env vars set from Bitwarden

Remaining manual step:
1. Configure Clerk webhook (2 minutes):
   - Clerk Dashboard → Webhooks → Add endpoint
   - URL: <CONVEX_SITE_URL>/clerk-users-webhook
   - Events: user.created, user.updated, user.deleted
   - Copy signing secret → already set as CLERK_WEBHOOK_SECRET

Start developing:
   - Terminal 1: npx convex dev
   - Terminal 2: npm run dev
   - Open http://localhost:3000

Deploy to production:
   - ./scripts/deploy.sh --subdomain <appname>
   - Live at https://<appname>.dellai.agency
```

## Automation Scripts

All scripts live in `<skill-path>/scripts/` and are copied into each project's `scripts/` dir:

| Script | Purpose |
|--------|---------|
| `setup.sh` | Scaffold from scratch (fallback mode) |
| `verify-toolchain.sh` | Check all CLI tools installed + correct versions |
| `setup-bitwarden-keys.sh` | Verify all required API keys exist in Bitwarden |
| `setup-convex-env.sh` | Set Convex env vars from Bitwarden |
| `setup-github-secrets.sh` | Set GitHub Actions secrets for CI/CD |
| `deploy.sh` | Full production deployment (Vercel + Convex + GitHub + DNS) |

See `references/env-example.md` for the complete `.env.example` template with all variables documented.

## File Templates

See `references/templates.md` for all file contents. Key patterns:

**Convex provider (with Clerk):**
```tsx
'use client'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { useAuth } from '@clerk/nextjs'
```

**Convex provider (no auth):**
```tsx
'use client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
```

**Auth config:**
```ts
// convex/auth.config.ts
export default {
  providers: [{ domain: process.env.CLERK_JWT_ISSUER_DOMAIN!, applicationID: "convex" }]
}
```

**Theme provider:**
```tsx
'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
```

**Clerk webhook handler:**
```ts
// convex/http.ts — verifies svix signature, routes user.created/updated/deleted
```

## Tech Stack Versions (keep updated)

- Next.js: latest (currently 16.1) — App Router, React 19, Turbopack
- Convex: latest (currently 1.32+)
- Clerk: @clerk/nextjs latest (currently 6.x), @clerk/backend latest
- Tailwind CSS: v4.2+ (CSS-first config, no tailwind.config.js)
- shadcn/ui: latest (CLI-based, CSS variables, base-color flag)
- TypeScript: 5.9 strict mode (6.0 in beta)
- Zod: 4.x (import via `zod/v4` subpath)
- next-themes: latest (0.4.6, dark mode)
- svix: latest (1.86.x, webhook verification)
- Node.js: v24 LTS (Krypton) — required by ESLint 10
- ESLint: 10.x (flat config, `eslint.config.ts`)

**Note:** `transpilePackages: ["convex"]` is no longer needed in `next.config.ts` with Convex 1.32+ and Next.js 16+.
