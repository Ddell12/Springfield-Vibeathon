# Bitwarden Vault Structure

The user's Bitwarden vault is organized into two top-level folder trees: **API Keys** (for developer secrets) and **Logins** (for service accounts).

## API Keys Folder Structure

API keys are stored as **Secure Notes** with **hidden custom fields**. The field `name` matches the environment variable name (e.g., `ANTHROPIC_API_KEY`).

```
API Keys/
├── AI-ML/
│   ├── Anthropic        → ANTHROPIC_API_KEY
│   ├── OpenAI           → OPENAI_API_KEY_LOVEABLE, OPENAI_API_KEY_SDK, OPENAI_API_KEY_EXPORT
│   │                      ⚠ Name collision — use ID: 59e12b91-3f10-4e7c-8513-b3ee001e83c1
│   ├── ElevenLabs       → ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
│   └── Gemini           → GEMINI_API_KEY
│
├── Cloud-Infrastructure/
│   ├── Vercel           → VERCEL_AI_GATEWAY_KEY, VERCEL_TOKEN
│   └── Cloudflare-R2    → CLOUDFLARE_R2_TOKEN, CLOUDFLARE_R2_ACCESS_KEY_ID,
│                           CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_ENDPOINT, R2_ACCOUNT_ID
│
├── Developer-Tools/
│   ├── GitHub           → GITHUB_TOKEN_CURSOR, GITHUB_TOKEN_CLAUDE_CODE, GITHUB_TOKEN, GITHUB_PAT
│   ├── Clerk            → NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY,
│   │                      CLERK_JWT_ISSUER_DOMAIN
│   │                      ⚠ Name collision — use ID: 1948a149-d2c2-48eb-935c-b401013acb9b
│   ├── Langsmith        → LANGCHAIN_API_KEY, LANGCHAIN_PROJECT
│   └── Linear           → (not yet in vault)
│
├── Databases/
│   ├── Convex           → CONVEX_DEPLOY_KEY (per-project — may need regeneration)
│   ├── Supabase         → SUPABASE_ACCESS_TOKEN, SUPABASE_API_URL, SUPABASE_GRAPHQL_URL,
│   │                      SUPABASE_S3_STORAGE_URL, SUPABASE_DB_URL, SUPABASE_STUDIO_URL,
│   │                      SUPABASE_INBUCKET_URL, SUPABASE_JWT_SECRET, SUPABASE_ANON_KEY,
│   │                      SUPABASE_SERVICE_ROLE_KEY, SUPABASE_S3_ACCESS_KEY, SUPABASE_S3_SECRET_KEY,
│   │                      SUPABASE_DB_PASSWORD_AI_AGENT, SUPABASE_DB_PASSWORD_WEBUI
│   └── Planetscale      → (not yet in vault)
│
├── Communication/
│   ├── Telegram         → TELEGRAM_CHAT_ID
│   └── Resend           → RESEND_API_KEY, RESEND_API_KEY_2
│
├── Business-Services/
│   ├── Stripe           → STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY
│   ├── Notion           → (not yet in vault)
│   └── Asana            → (not yet in vault)
│
├── APIs-Data/
│   ├── Composio         → COMPOSIO_API_KEY
│   ├── Firecrawl        → (not yet in vault)
│   └── Exa              → (not yet in vault)
│
└── MCP-Servers/
    └── (MCP server credentials)
```

## Logins Folder Structure

Login credentials are stored as **Login** items with `username` and `password` fields.

```
Logins/
├── Financial/         → Bank accounts, payment processors
├── Entertainment/     → Streaming, gaming
├── Dev-Tech/          → Developer service logins (dashboards, consoles)
├── Personal-Social/   → Social media, personal accounts
├── Shopping-Retail/   → E-commerce accounts
├── Utilities-Services/ → ISP, phone, utilities
└── Work-Professional/ → Work-related logins
```

## Item Type Patterns

### Secure Note with Custom Fields (API Keys)

Most API keys follow this pattern. Extract with:

```bash
bw get item "ItemName" | jq -r '.fields[] | select(.name=="ENV_VAR_NAME") | .value'
```

To see all fields on an item:

```bash
bw get item "ItemName" | jq '[.fields[] | {name: .name, type: .type}]'
```

### Login Item (Service Credentials)

Service logins have `username` and `password` fields:

```bash
# Username
bw get item "ServiceName" | jq -r '.login.username'

# Password
bw get item "ServiceName" | jq -r '.login.password'

# URI (dashboard URL)
bw get item "ServiceName" | jq -r '.login.uris[0].uri'
```

### Notes Field

Some items store data in the `notes` field:

```bash
bw get item "ItemName" | jq -r '.notes'
```

## Per-Project vs Shared Keys

| Type | Example | Notes |
|------|---------|-------|
| **Shared** | `ANTHROPIC_API_KEY` | Same key across all projects |
| **Per-project** | `CONVEX_DEPLOY_KEY` | Generated per Convex project |
| **Per-project** | `CLERK_WEBHOOK_SECRET` | Generated per Clerk webhook endpoint |
| **Per-project** | `STRIPE_WEBHOOK_SECRET` | Generated per Stripe webhook endpoint |
| **Per-project** | `CONVEX_URL` | Unique per deployment (`npx convex dev` outputs it) |
| **Generated** | `NEXTAUTH_SECRET` | `openssl rand -base64 32` |

Per-project keys may not exist in Bitwarden — they are generated during project setup. If a key is missing, check whether it's a per-project type before reporting it as missing.

## Dashboard URLs for Missing Keys

When a key is not found in Bitwarden, direct the user to the correct dashboard:

| Service | Dashboard URL |
|---------|--------------|
| Anthropic | console.anthropic.com |
| OpenAI | platform.openai.com/api-keys |
| ElevenLabs | elevenlabs.io (Profile > API Key) |
| Gemini | aistudio.google.com/apikey |
| Clerk | dashboard.clerk.com (API Keys) |
| Convex | dashboard.convex.dev (Settings > Deploy Key) |
| Stripe | dashboard.stripe.com/apikeys |
| Resend | resend.com/api-keys |
| GitHub | github.com/settings/tokens |
| Vercel | vercel.com/account/tokens |
| Cloudflare R2 | dash.cloudflare.com (R2 > API Tokens) |
| Supabase | supabase.com/dashboard (Settings > API) |
| Composio | app.composio.dev |
| Firecrawl | firecrawl.dev |
| Exa | exa.ai |
| Linear | linear.app/settings/api |
| Telegram | t.me/BotFather |

## Item Creation Conventions

### Naming Rules

| Element | Convention | Example |
|---------|-----------|---------|
| Item name | Brand/service name (capitalized, hyphens for multi-word) | `Anthropic`, `Cloudflare-R2` |
| Field name | Exact env var name (UPPER_SNAKE_CASE) | `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY` |
| Folder path | `API Keys/{category}` for secrets, `Logins/{category}` for credentials | `API Keys/AI-ML` |

### Field Types

| Type | Value | Use for |
|------|-------|---------|
| Hidden | 1 | All secrets, API keys, tokens — **default for bw-add-key.sh** |
| Text | 0 | Non-sensitive metadata only (e.g., account region, project name) |

### Adding a New Folder Category

Folders must exist before items can be assigned to them:

```bash
# Create a new folder
echo '{"name":"API Keys/NewCategory"}' | bw encode | bw create folder
bw sync --quiet
```

### Collision Prevention

- `bw-add-key.sh` checks for existing items before creating
- Without `--force`: errors if an item with the same name exists
- With `--force`: delegates to `bw-update-field.sh` to add/update fields on the existing item
- Name collisions between item types (Secure Note vs Login with same name) are handled by the search fallback pattern that prefers Secure Notes (type 2)
