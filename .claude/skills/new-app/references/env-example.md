# .env.example Template

This is the `.env.example` that ships with every project created from the hackathon-starter template. Copy to `.env.local` and fill in values.

```env
# ══════════════════════════════════════════════════════
# Project Environment Variables
# Copy this file to .env.local and fill in your values.
# Never commit .env.local to git.
# ══════════════════════════════════════════════════════

# ── Convex Backend ───────────────────────────────────
# Run 'npx convex dev' to get your deployment URL
NEXT_PUBLIC_CONVEX_URL=

# ── Auth (Clerk) ─────────────────────────────────────
# From: dashboard.clerk.com → Your App → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Clerk route config
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# ── Billing (Stripe) — optional ─────────────────────
# From: dashboard.stripe.com → Developers → API Keys
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
# STRIPE_SECRET_KEY=

# ── Voice AI (ElevenLabs) — optional ─────────────────
# From: elevenlabs.io → Profile → API Key
# ELEVENLABS_API_KEY=
# From: elevenlabs.io → Voices → copy ID of chosen voice
# NEXT_PUBLIC_ELEVENLABS_VOICE_ID=

# ══════════════════════════════════════════════════════
# Convex Environment Variables (set via CLI, not here)
# ══════════════════════════════════════════════════════
# These are set in the Convex dashboard or via:
#   npx convex env set <VAR_NAME> <value>
#
# CLERK_JWT_ISSUER_DOMAIN    — Clerk Dashboard → JWT Templates → Issuer URL
# CLERK_WEBHOOK_SECRET       — Clerk Dashboard → Webhooks → signing secret
# ANTHROPIC_API_KEY          — console.anthropic.com → API Keys
# R2_ACCOUNT_ID              — Cloudflare Dashboard → Account ID
# R2_ACCESS_KEY_ID           — Cloudflare R2 → API Tokens
# R2_SECRET_ACCESS_KEY       — Same token page
# R2_BUCKET_NAME             — Convention: {project}-assets
# RESEND_API_KEY             — resend.com → API Keys
# STRIPE_SECRET_KEY          — dashboard.stripe.com
# STRIPE_WEBHOOK_SECRET      — Per-project, from Stripe webhook registration
# ELEVENLABS_API_KEY         — elevenlabs.io → Profile → API Key
```

## Convex Env Var Quick Reference

After running `npx convex dev`, set these for your project:

```bash
# Required (auth)
npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://YOUR_APP.clerk.accounts.dev"
npx convex env set CLERK_WEBHOOK_SECRET "whsec_..."

# Required (AI)
npx convex env set ANTHROPIC_API_KEY "sk-ant-..."

# Optional (file storage)
npx convex env set R2_ACCOUNT_ID "..."
npx convex env set R2_ACCESS_KEY_ID "..."
npx convex env set R2_SECRET_ACCESS_KEY "..."
npx convex env set R2_BUCKET_NAME "{project}-assets"

# Optional (email)
npx convex env set RESEND_API_KEY "re_..."

# Optional (billing)
npx convex env set STRIPE_SECRET_KEY "sk_live_..."
npx convex env set STRIPE_WEBHOOK_SECRET "whsec_..."

# Optional (voice)
npx convex env set ELEVENLABS_API_KEY "..."
```
