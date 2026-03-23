# Hosting & Deployment — Bridges

> All hosting, deployment, and service account details in one place.
> AI agents: reference this when deploying, configuring CI/CD, or debugging infra.

---

## Services & URLs

| Service | Purpose | Dashboard URL | Status |
|---------|---------|--------------|--------|
| **Vercel** | Frontend hosting + edge functions | https://vercel.com/dashboard | Not yet set up |
| **Convex** | Backend, database, file storage, vector search | https://dashboard.convex.dev | Not yet set up |
| **GitHub** | Repository, PRs, Actions CI/CD | https://github.com/desha/ | Not yet set up |
| **Clerk** | Auth (Phase 6) | https://dashboard.clerk.com | Not yet set up |
| **Anthropic** | Claude API (LLM) | https://console.anthropic.com | Active |
| **Google AI Studio** | Embeddings + Nano Banana Pro images | https://aistudio.google.com | Active |
| **ElevenLabs** | Text-to-speech | https://elevenlabs.io/app | Active |
| **fal.ai** | Nano Banana Pro (alternative) | https://fal.ai/dashboard | Optional |

## Project IDs & Config

> Fill these in as services are provisioned.

| Key | Value | Notes |
|-----|-------|-------|
| GitHub Repo | `desha/bridges` | TBD — created in TASK-001 |
| Vercel Project ID | — | Set after Vercel link |
| Vercel Team/Org | — | Personal or team account |
| Convex Deployment (dev) | — | From `npx convex dev` |
| Convex Deployment (prod) | — | From `npx convex deploy` |
| Clerk App ID | — | Created in Phase 6 |
| Production URL | — | `bridges.vercel.app` or custom domain |

## Environment Variables

### Local Development (`.env.local`)

```env
# Convex
CONVEX_DEPLOYMENT=dev:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# AI — Claude
ANTHROPIC_API_KEY=sk-ant-...

# AI — Google (Embeddings + Image Gen)
GOOGLE_API_KEY=AIza...

# TTS — ElevenLabs
ELEVENLABS_API_KEY=...

# Image Gen — fal.ai (optional, alternative to Google direct)
FAL_KEY=...

# Clerk (Phase 6 only)
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
# CLERK_SECRET_KEY=sk_test_...
```

### Convex Environment (set via CLI)

```bash
npx convex env set ANTHROPIC_API_KEY "sk-ant-..."
npx convex env set GOOGLE_API_KEY "AIza..."
npx convex env set ELEVENLABS_API_KEY "..."
npx convex env set FAL_KEY "..."  # optional
```

### Vercel Environment (set in dashboard)

Same vars as `.env.local` plus:
- `CONVEX_DEPLOY_KEY` — for CI/CD Convex deploys (generate at Convex dashboard → Settings → Deploy Keys)

### GitHub Secrets (for Actions CI/CD)

| Secret Name | Source | Used By |
|-------------|--------|---------|
| `CONVEX_DEPLOY_KEY` | Convex dashboard → Deploy Keys | deploy.yml |
| `ANTHROPIC_API_KEY` | Anthropic console | E2E tests (if AI calls needed) |
| `CLERK_SECRET_KEY` | Clerk dashboard | E2E auth tests (Phase 6) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard | E2E auth tests |

## Deployment Workflow

### Development
```bash
npx convex dev          # Starts Convex dev server (watches for changes)
npm run dev             # Starts Next.js dev server
```

### Preview (PR branches)
- Vercel auto-creates preview deployments for every PR
- Convex dev deployment is shared (no per-branch Convex preview)

### Production
```bash
npx convex deploy       # Deploys schema + functions to prod Convex
# Vercel auto-deploys on push to main via GitHub integration
```

### CI/CD Pipeline (GitHub Actions)

```
Push/PR → ci.yml:
  ├── Checkout
  ├── Install deps (npm ci)
  ├── Lint (npm run lint)
  ├── Type check (npx tsc --noEmit)
  ├── Unit tests (npm test -- --run)
  ├── Install Playwright browsers
  ├── E2E tests (npx playwright test)
  └── Upload test report artifact

Merge to main → deploy.yml:
  ├── All CI steps above
  ├── Convex deploy (npx convex deploy --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL)
  └── Vercel deploys automatically via GitHub app
```

## Domain & DNS

| Item | Value | Notes |
|------|-------|-------|
| Domain | — | TBD — `bridges.tools` or `usebridges.com` or Vercel subdomain |
| DNS Provider | — | Vercel or Cloudflare |
| SSL | Automatic | Vercel handles SSL for all deployments |

## Cost Tracking

| Service | Free Tier Limit | Current Tier | Monthly Cost |
|---------|----------------|-------------|-------------|
| Vercel | 100GB bandwidth | Hobby | $0 |
| Convex | 1M fn calls, 1GB storage | Free | $0 |
| Claude API | Pay-per-token | — | ~$30 est. |
| Google AI | 500 req/day (Studio) | Free | $0 |
| ElevenLabs | 10K chars/month | Free/Starter | $0–5 |
| GitHub | Unlimited public repos | Free | $0 |
| GitHub Actions | 2000 min/month | Free | $0 |
| **Total** | | | **~$35/month** |

## Troubleshooting

### Convex deploy fails in CI
- Ensure `CONVEX_DEPLOY_KEY` secret is set in GitHub repo settings
- Check that schema changes are backwards-compatible (Convex rejects breaking schema changes)

### Vercel build fails
- Check `NEXT_PUBLIC_CONVEX_URL` is set in Vercel env vars
- Convex generates types at build time — ensure `npx convex deploy` runs before `next build`

### E2E tests fail in CI but pass locally
- Playwright browsers must be installed: `npx playwright install --with-deps` in CI
- Check if tests depend on seeded data — run seed before E2E in CI

### Clerk auth not working in preview
- Clerk requires the exact domain in allowed origins — add Vercel preview URLs to Clerk dashboard
