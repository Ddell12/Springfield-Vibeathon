# Deployment & Infrastructure

<!--
MVP FOCUS: Everything needed to go from code to live app.
Vercel (frontend) + Convex Cloud (backend) + Clerk (auth) + Stripe (billing).
Don't plan for multi-region, CDN tuning, or observability dashboards.
Just make it deployable and keep it running.
-->

## Architecture Overview

```
[Browser]
    │
    ├── Next.js (Vercel) ─── Static/SSR pages, Clerk middleware
    │
    └── Convex Cloud ─────── Queries, mutations, actions, file storage
            │
            ├── Clerk (webhooks)
            ├── Stripe (webhooks)
            ├── AI APIs (Claude/OpenAI/Gemini)
            └── Resend (email)
```

---

## Environment Variables

### Next.js (Vercel Dashboard)

| Variable | Value | Source |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | `https://{project}.convex.cloud` | Convex dashboard |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | Clerk dashboard |
| `CLERK_SECRET_KEY` | `sk_live_...` | Clerk dashboard (used by proxy.ts) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Convention |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | Convention |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Stripe dashboard (if billing) |

### Convex Dashboard (Environment Variables)

| Variable | Value | Source |
|---|---|---|
| `CLERK_JWT_ISSUER_DOMAIN` | `https://verb-noun-00.clerk.accounts.dev` | Clerk dashboard (needed by `convex/auth.config.ts`) |
| `CLERK_WEBHOOK_SECRET` | `whsec_...` | Clerk dashboard → Webhooks (verified with `svix` npm package) |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe dashboard (if billing) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe dashboard → Webhooks (if billing) |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Anthropic console (if AI — used by both `@anthropic-ai/claude-agent-sdk` and `@anthropic-ai/sdk`) |
| `OPENAI_API_KEY` | `sk-...` | OpenAI console (if AI alternative) |
| `GOOGLE_AI_API_KEY` | `AI...` | Google AI Studio (if AI alternative) |
| `RESEND_API_KEY` | `re_...` | Resend dashboard (if email) |
| `R2_ACCOUNT_ID` | `...` | Cloudflare dashboard (if R2 needed) |
| `R2_ACCESS_KEY_ID` | `...` | Cloudflare R2 API tokens (if R2 needed) |
| `R2_SECRET_ACCESS_KEY` | `...` | Cloudflare R2 API tokens (if R2 needed) |
| `R2_BUCKET_NAME` | `{project}-assets` | Cloudflare R2 bucket (if R2 needed) |

---

## Deployment Setup

### Vercel (Frontend)

| Setting | Value |
|---|---|
| Framework | Next.js (auto-detected) |
| Build command | `next build` (default) |
| Output directory | `.next` (default) |
| Node version | 20.x |
| Root directory | `.` |
| Git branch | `main` |

**Deploy triggers**: Push to `main` → auto-deploy.

### Convex Cloud (Backend)

| Setting | Value |
|---|---|
| Project | Created via `npx convex dev --once` |
| Deploy command | `npx convex deploy` |
| Production URL | `https://{project}.convex.cloud` |

**Deploy triggers**: GitHub Actions runs `npx convex deploy` on push to `main`.

### GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit          # Typecheck
      - run: npx convex deploy          # Deploy Convex
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}
      # Vercel deploys automatically via Git integration
```

---

## Domain & DNS

| Domain | Points To | Purpose |
|---|---|---|
| {app.com} | Vercel | Production frontend |
| {app.com} (Convex) | Convex Cloud | Backend (managed by Convex, no DNS needed) |

**Vercel domain setup**: Add custom domain in Vercel dashboard → update DNS records.

---

## Webhook Endpoints

| Service | Webhook URL | What It Receives |
|---|---|---|
| Clerk | `https://{convex-url}/clerk-webhook` | User created/updated/deleted |
| Stripe | `https://{convex-url}/stripe-webhook` | Payment/subscription events |

**Setup steps**:
1. Deploy Convex first (need the production URL)
2. Add webhook URL in Clerk dashboard → Webhooks → select events (user.created, user.updated, user.deleted)
3. Add webhook URL in Stripe dashboard → Developers → Webhooks → select events
4. Copy webhook secrets to Convex environment variables

---

## Service Accounts & Keys

<!-- Track what accounts are needed. Keys stored in Bitwarden, not here. -->

| Service | Account | Dashboard URL | Key Location |
|---|---|---|---|
| Convex | {project name} | dashboard.convex.dev | Bitwarden: API Keys/Cloud-Infrastructure |
| Clerk | {app name} | dashboard.clerk.com | Bitwarden: API Keys/Cloud-Infrastructure |
| Vercel | {project name} | vercel.com/dashboard | Bitwarden: API Keys/Cloud-Infrastructure |
| Cloudflare (R2) | {if needed} | dash.cloudflare.com | Bitwarden: API Keys/Cloud-Infrastructure |
| Stripe | {account name} | dashboard.stripe.com | Bitwarden: API Keys/Business-Services |
| Anthropic | Dell AI Agency | console.anthropic.com | Bitwarden: API Keys/AI-ML |
| OpenAI | {if needed} | platform.openai.com | Bitwarden: API Keys/AI-ML |
| Google AI | {if needed} | aistudio.google.com | Bitwarden: API Keys/AI-ML |
| ElevenLabs | {if voice AI} | elevenlabs.io/app | Bitwarden: API Keys/AI-ML |
| Resend | {domain} | resend.com/api-keys | Bitwarden: API Keys/Communication |
| GitHub | ddell12 | github.com/settings | Bitwarden: Logins/Dev-Tech |

---

## Pre-Launch Checklist

### Before First Deploy
- [ ] Convex project created (`npx convex dev --once`)
- [ ] Convex components registered in `convex/convex.config.ts` (Stripe, Resend, etc.)
- [ ] `convex/auth.config.ts` configured with Clerk JWT issuer domain
- [ ] Clerk app created, OAuth providers configured, JWT template named "convex"
- [ ] All Vercel env vars set (including production Clerk keys)
- [ ] All Convex env vars set (including `CLERK_JWT_ISSUER_DOMAIN`)
- [ ] `svix` package installed for Clerk webhook verification
- [ ] GitHub Actions secrets set (`CONVEX_DEPLOY_KEY`)
- [ ] GitHub repo connected to Vercel

### Before Going Live
- [ ] Switch Clerk to production instance (separate from dev)
- [ ] Switch Stripe to live mode (separate keys from test)
- [ ] Webhook endpoints registered and verified (Clerk + Stripe → Convex HTTP actions)
- [ ] `src/proxy.ts` configured with `clerkMiddleware()` + `createRouteMatcher()` for protected routes
- [ ] Custom domain configured in Vercel
- [ ] DNS propagated
- [ ] Resend domain verified (for custom from address)
- [ ] Tested: signup → core action → billing (if applicable)
- [ ] Error pages work (404, 500, auth redirect)

### Monitoring (MVP-level)
- [ ] Vercel deployment notifications (built-in)
- [ ] Convex dashboard — function logs, error rates
- [ ] Stripe webhook logs — delivery status
- [ ] Clerk dashboard — auth errors
- [ ] {Optional: Vercel Analytics for basic usage}

---

## Cost Estimates (MVP)

| Service | Free Tier | When You'll Pay | Estimated Monthly |
|---|---|---|---|
| Vercel | Hobby plan (free) | Custom domains on Pro ($20/mo) | $0-20 |
| Convex | Free tier (generous) | High usage | $0 |
| Clerk | 10K MAU free | >10K users | $0 |
| Stripe | No monthly fee | 2.9% + $0.30 per transaction | Variable |
| Resend | 3K emails/mo free | >3K emails | $0 |
| Anthropic | Pay per use | First API call | ~${X}/mo estimated |
| GitHub | Free for public repos | Private repos on Teams | $0 |

**Total MVP cost**: ~$0-20/mo + AI API usage + Stripe transaction fees

---

## Open Questions

- {question}

`[POST-MVP]`: {staging environment, preview deployments per PR, error tracking (Sentry), uptime monitoring, database backups (Convex handles), log aggregation, performance monitoring, rate limiting, WAF/DDoS protection}
