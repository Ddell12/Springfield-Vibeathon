---
name: bitwarden
description: "Retrieve, create, and manage secrets, API keys, credentials, and usernames in Bitwarden CLI (bw) for software development. Use when: (1) an app or project needs API keys, tokens, or credentials to function, (2) setting up environment variables for a new or existing project, (3) verifying which secrets exist before building an integration, (4) any task that requires fetching secrets from a password manager, (5) creating or storing a new API key in the vault, (6) updating an existing secret with a new value. Triggers on: 'get secret', 'get API key', 'bitwarden', 'bw unlock', 'fetch credentials', 'pull keys from bitwarden', 'create', 'store API key', 'add key to bitwarden', 'save secret', or when a project needs secrets wired up."
---

# Bitwarden CLI for Software Development

Retrieve API keys, credentials, and secrets from Bitwarden for use in app development.

## Prerequisites

- Bitwarden CLI installed: `npm install -g @bitwarden/cli`
- User is logged in: `bw login` (one-time)
- `jq` installed for JSON parsing

## Quick Start — Get a Secret

```bash
# 1. Unlock (returns session key)
export BW_SESSION=$(bw unlock --raw)

# 2. Sync vault
bw sync --quiet

# 3. Get a secret by item name + field name
bw get item "Anthropic" | jq -r '.fields[] | select(.name=="ANTHROPIC_API_KEY") | .value'
```

## Authentication & Session Management

### Unlock the vault

Always check if already unlocked before prompting:

```bash
if [[ -z "${BW_SESSION:-}" ]]; then
  export BW_MASTER_PASSWORD='Peace12345$$'
  export BW_PASSWORD="$BW_MASTER_PASSWORD"
  export BW_SESSION=$(bw unlock --raw --passwordenv BW_PASSWORD 2>/dev/null)
  unset BW_PASSWORD
  if [[ -z "$BW_SESSION" ]]; then
    echo "Failed to unlock Bitwarden" >&2
    exit 1
  fi
fi
bw sync --quiet 2>/dev/null || true
```

The `BW_MASTER_PASSWORD` env var enables non-interactive unlock. The `bw-unlock.sh` helper also supports this automatically.

Use the `scripts/bw-unlock.sh` helper to handle this reliably.

### Check vault status

```bash
bw status | jq -r '.status'
# Returns: "unlocked", "locked", or "unauthenticated"
```

### Lock when done

```bash
bw lock
```

## Retrieving Secrets

### Get a named custom field from an item

This is the **primary pattern** — most API keys are stored as custom fields on Secure Notes:

```bash
bw get item "ItemName" | jq -r '.fields[] | select(.name=="FIELD_NAME") | .value'
```

### Get the first/default field value (fallback chain)

When the field name is unknown, try multiple locations:

```bash
bw get item "ItemName" | jq -r '.fields[0].value // .login.password // .notes'
```

### Search for items by keyword

```bash
bw list items --search "stripe" | jq '.[].name'
```

### Get login credentials (username + password)

```bash
bw get item "ServiceName" | jq -r '{user: .login.username, pass: .login.password}'
```

### Get all fields from an item

```bash
bw get item "ItemName" | jq '.fields[] | {(.name): .value}'
```

### Use the helper script

The `scripts/bw-get-field.sh` script wraps all extraction logic:

```bash
# Get specific field
./scripts/bw-get-field.sh "Anthropic" "ANTHROPIC_API_KEY"

# Get default value (first field / password / notes)
./scripts/bw-get-field.sh "Anthropic"

# Get login username
./scripts/bw-get-field.sh "GitHub" --username

# Get login password
./scripts/bw-get-field.sh "GitHub" --password
```

## Writing Secrets to Targets

### Set as shell environment variable (current session only)

```bash
export ANTHROPIC_API_KEY=$(bw get item "Anthropic" | jq -r '.fields[] | select(.name=="ANTHROPIC_API_KEY") | .value')
```

### Write to .env file (never echo the value)

```bash
VALUE=$(bw get item "Anthropic" | jq -r '.fields[] | select(.name=="ANTHROPIC_API_KEY") | .value')
echo "ANTHROPIC_API_KEY=$VALUE" >> .env
```

### Set as Convex environment variable

```bash
VALUE=$(bw get item "Anthropic" | jq -r '.fields[] | select(.name=="ANTHROPIC_API_KEY") | .value')
npx convex env set ANTHROPIC_API_KEY "$VALUE"
```

### Set as GitHub Actions secret

```bash
VALUE=$(bw get item "Anthropic" | jq -r '.fields[] | select(.name=="ANTHROPIC_API_KEY") | .value')
gh secret set ANTHROPIC_API_KEY --body "$VALUE"
```

## Vault Organization

Read `references/vault-map.md` for the complete folder structure and item naming conventions. Key folders:

| Folder                          | Contents                              |
| ------------------------------- | ------------------------------------- |
| `API Keys/AI-ML`                | Anthropic, OpenAI, ElevenLabs, Gemini |
| `API Keys/Cloud-Infrastructure` | Vercel, Cloudflare R2, AWS            |
| `API Keys/Developer-Tools`      | GitHub, Clerk, Linear, Langsmith      |
| `API Keys/Databases`            | Convex, Supabase, Planetscale         |
| `API Keys/Communication`        | Telegram, Resend, Twilio              |
| `API Keys/Business-Services`    | Stripe, Notion, Asana                 |
| `API Keys/APIs-Data`            | Composio, Firecrawl, Exa              |
| `API Keys/MCP-Servers`          | MCP server credentials                |

## Verifying Keys Exist

Before starting a project, verify required keys are available:

```bash
./scripts/bw-check-keys.sh "Anthropic" "Clerk" "Convex"
```

Or inline:

```bash
if bw get item "Anthropic" &>/dev/null; then
  echo "Anthropic key found"
else
  echo "Anthropic key MISSING — get from console.anthropic.com"
fi
```

## Creating & Managing Items

### Create a new API key item

Use the `scripts/bw-add-key.sh` helper to create a Secure Note with hidden fields:

```bash
# Create with one field
./scripts/bw-add-key.sh "Acme" "API Keys/AI-ML" "ACME_API_KEY=sk-abc123"

# Create with multiple fields
./scripts/bw-add-key.sh "Twilio" "API Keys/Communication" "TWILIO_SID=AC..." "TWILIO_AUTH_TOKEN=abc..."

# Create or update if exists (--force)
./scripts/bw-add-key.sh "ElevenLabs" "API Keys/AI-ML" --force "NEW_FIELD=value"
```

The script handles:

- Folder path → UUID resolution
- Duplicate detection (errors unless `--force`)
- All fields created as hidden (type 1)
- Proper `.secureNote = {"type": 0}` for BW CLI
- Post-create vault sync

### Update or add fields on an existing item

Use `scripts/bw-update-field.sh` to modify fields on an existing item:

```bash
# Update an existing field value
./scripts/bw-update-field.sh "Anthropic" "ANTHROPIC_API_KEY=sk-newkey"

# Add a new field + update existing
./scripts/bw-update-field.sh "ElevenLabs" "ELEVENLABS_MODEL_ID=eleven_turbo" "ELEVENLABS_VOICE_ID=newvoice"
```

Reports UPDATED or ADDED per field to stderr.

### Manual creation (without helper)

The raw BW CLI pipeline for creating a Secure Note:

```bash
bw get template item \
  | jq '.type = 2 | .name = "ItemName" | .folderId = "FOLDER-UUID" | .secureNote = {"type": 0} | .fields = [{"name": "ENV_VAR", "value": "secret", "type": 1}]' \
  | bw encode \
  | bw create item
```

Key gotchas:

- `.secureNote = {"type": 0}` is **required** — BW CLI rejects Secure Notes without it
- Always `bw encode` before `bw create item`
- Field type 1 = Hidden (use for all secrets)

### Naming conventions

| Element     | Convention            | Example                      |
| ----------- | --------------------- | ---------------------------- |
| Item name   | Brand name            | `Anthropic`, `Cloudflare-R2` |
| Field name  | Exact env var name    | `ANTHROPIC_API_KEY`          |
| Folder path | `API Keys/{category}` | `API Keys/AI-ML`             |

## Security Rules

1. **NEVER** echo, log, or print secret values to stdout/stderr visible to the user
2. **NEVER** write secrets to files tracked by git (check `.gitignore` first)
3. **NEVER** include secret values in commit messages, PR descriptions, or comments
4. **ALWAYS** pipe secrets directly into their target (`export`, `.env`, `convex env set`)
5. **ALWAYS** lock the vault (`bw lock`) after bulk operations complete
6. **PREFER** `bw get item` over `bw list items` when you know the item name (faster, no ambiguity)
7. If Bitwarden is locked, prompt the user to unlock — never skip or use placeholder values
8. If `bw get item "Name"` fails with "More than one result", use the item ID from `references/vault-map.md`, or fall back to: `bw list items --search "Name" | jq '.[] | select(.name == "Name" and .type == 2)'` to filter to the Secure Note
9. When creating items, **ALWAYS** use hidden fields (type 1) for secrets — never type 0 (Text) for sensitive values
10. After creating or editing items, **ALWAYS** sync the vault (`bw sync --quiet`)

## Advanced: CLI Reference

Read `references/cli-commands.md` for the full command reference including:

- Creating and editing vault items
- Folder and collection management
- Password generation
- Export/import operations
- The `bw serve` local REST API
- Environment variables and global options

## Troubleshooting

| Problem                 | Solution                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `bw: command not found` | `npm install -g @bitwarden/cli`                                                                                                        |
| Session expired         | Re-run `export BW_SESSION=$(bw unlock --raw)`                                                                                          |
| Item not found          | Try `bw list items --search "keyword"` to find exact name                                                                              |
| `jq: error` on fields   | Item may be a Login (not Secure Note) — use `.login.password` instead of `.fields[]`                                                   |
| Empty result from `jq`  | Field name mismatch — run `bw get item "Name" \| jq '.fields[].name'` to see available fields                                          |
| `bw sync` fails         | Check internet connection, try `bw login --check`                                                                                      |
| "More than one result"  | Name collision with Login items — use item ID or `bw list items --search "Name" \| jq '.[] \| select(.name == "Name" and .type == 2)'` |
