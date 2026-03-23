# Bitwarden CLI Command Reference

Complete reference for the `bw` Password Manager CLI.

## Table of Contents

- [Authentication](#authentication)
- [Session Management](#session-management)
- [Core CRUD Commands](#core-crud-commands)
- [Search and Filter](#search-and-filter)
- [Utility Commands](#utility-commands)
- [Environment Variables](#environment-variables)
- [Item Type Enums](#item-type-enums)
- [Global Options](#global-options)

## Authentication

### Login with email/password (interactive)
```bash
bw login [email] [password]
```

### Login with API key (automated/CI)
```bash
BW_CLIENTID="client_id" BW_CLIENTSECRET="client_secret" bw login --apikey
```
Get API key from: vault.bitwarden.com > Settings > Security > Keys > API Key.

### Login with SSO
```bash
bw login --sso
```

### Check login status
```bash
bw login --check
```

### Logout
```bash
bw logout
```

## Session Management

### Unlock vault
```bash
# Interactive (prompts for master password)
export BW_SESSION=$(bw unlock --raw)

# From environment variable
export BW_SESSION=$(bw unlock --passwordenv BW_PASSWORD --raw)

# From file
export BW_SESSION=$(bw unlock --passwordfile ~/path/to/password.txt --raw)
```

### Pass session per-command (alternative to export)
```bash
bw list items --session "SESSION_KEY"
```

### Lock vault
```bash
bw lock
```

### Check status
```bash
bw status
# Returns: {"serverUrl":"...","lastSync":"...","userEmail":"...","userId":"...","status":"unlocked"}
```

## Core CRUD Commands

### get — Retrieve a single item

```bash
# By name (searches, must return exactly one match)
bw get item "Anthropic"

# By UUID
bw get item "a1b2c3d4-..."

# Specific data shortcuts
bw get username "GitHub"
bw get password "GitHub"
bw get uri "GitHub"
bw get totp "GitHub"         # Time-based OTP
bw get notes "ItemName"

# Get item template (for creating new items)
bw get template item
bw get template item.login
bw get template item.card
bw get template item.identity
bw get template folder
```

### list — Retrieve multiple items

```bash
# All items
bw list items

# Filter by folder
bw list items --folderid "folder-uuid"

# Search
bw list items --search "anthropic"

# Trashed items
bw list items --trash

# Folders
bw list folders

# Organizations
bw list organizations
```

### create — Create new items

```bash
# Create from template
bw get template item | jq '.name="New API Key" | .type=2 | .notes="sk-..."' | bw encode | bw create item

# Create a folder
bw get template folder | jq '.name="API Keys/New-Category"' | bw encode | bw create folder

# Attach a file to an item
bw create attachment --file ./cert.pem --itemid "item-uuid"
```

### edit — Update existing items

```bash
# Get item, modify, re-encode, update
bw get item "ItemName" | jq '.name="Updated Name"' | bw encode | bw edit item "item-uuid"
```

### delete — Remove items

```bash
# Soft delete (moves to trash, 30-day retention)
bw delete item "item-uuid"

# Permanent delete
bw delete item "item-uuid" --permanent

# Delete attachment
bw delete attachment "attachment-uuid" --itemid "item-uuid"
```

### restore — Recover from trash

```bash
bw restore item "item-uuid"
```

## Search and Filter

### Search by keyword
```bash
bw list items --search "stripe" | jq '.[].name'
```

### Filter by folder ID
```bash
# First get folder ID
FOLDER_ID=$(bw list folders | jq -r '.[] | select(.name=="API Keys/AI-ML") | .id')

# Then list items in that folder
bw list items --folderid "$FOLDER_ID" | jq '.[].name'
```

### Find items with specific field names
```bash
bw list items --search "keyword" | jq '.[] | select(.fields[]?.name == "ANTHROPIC_API_KEY") | .name'
```

### Count items
```bash
bw list items --search "API" | jq length
```

## Utility Commands

### sync — Pull latest vault data
```bash
bw sync
bw sync --quiet          # No output
bw sync --last           # Show last sync timestamp
```

### generate — Create passwords/passphrases
```bash
# Random password
bw generate -uln --length 32

# With special characters
bw generate --special --length 40

# Passphrase
bw generate --passphrase --words 4 --separator -

# Passphrase with number and capitalize
bw generate --passphrase --words 5 --separator - --capitalize --includeNumber
```

### encode — Base64 encode for create/edit
```bash
echo '{"name":"test"}' | bw encode
# Output: eyJuYW1lIjoidGVzdCJ9
```

### config — Set server URL
```bash
# Bitwarden cloud (default)
bw config server https://vault.bitwarden.com

# EU region
bw config server https://vault.bitwarden.eu

# Self-hosted
bw config server https://your.domain.com
```

### export — Export vault
```bash
bw export --format json --output ./backup.json
bw export --format encrypted_json --password "encryption-pw"
```

### import — Import from other managers
```bash
bw import lastpasscsv ./export.csv
bw import --formats    # List supported formats
```

### serve — Local REST API
```bash
bw serve --port 8087 --hostname localhost
# Then use: curl http://localhost:8087/list/object/items
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `BW_SESSION` | Session key from `bw unlock --raw` |
| `BW_CLIENTID` | API key client ID (for `bw login --apikey`) |
| `BW_CLIENTSECRET` | API key client secret |
| `BW_PASSWORD` | Master password (for `bw unlock --passwordenv`) |
| `BITWARDENCLI_APPDATA_DIR` | Custom config directory (multi-account support) |
| `BITWARDENCLI_DEBUG` | Enable debug output (`true`) |
| `NODE_EXTRA_CA_CERTS` | Path to CA certificates for self-signed TLS |

## Item Type Enums

| Type | Value | Description |
|------|-------|-------------|
| Login | 1 | Username/password with optional URIs and TOTP |
| Secure Note | 2 | Free-form notes with optional custom fields |
| Card | 3 | Credit/debit card details |
| Identity | 4 | Personal identity information |
| SSH Key | 5 | SSH key pairs |

### Custom Field Types

| Type | Value | Description |
|------|-------|-------------|
| Text | 0 | Visible text field |
| Hidden | 1 | Hidden/masked field (used for API keys) |
| Boolean | 2 | True/false toggle |

## Global Options

| Flag | Purpose |
|------|---------|
| `--pretty` | Format JSON output with indentation |
| `--raw` | Return raw output (no descriptions) |
| `--response` | Wrap output in standardized JSON response |
| `--quiet` | Suppress stdout |
| `--nointeraction` | Disable interactive prompts (for scripts) |
| `--session <key>` | Pass session key inline |
| `-v, --version` | Show CLI version |
| `-h, --help` | Show help |

## Common jq Patterns for Bitwarden

```bash
# Get specific custom field by name
| jq -r '.fields[] | select(.name=="FIELD_NAME") | .value'

# Get first custom field value
| jq -r '.fields[0].value'

# Get all field names
| jq '[.fields[].name]'

# Get all fields as key-value pairs
| jq '.fields[] | {(.name): .value}'

# Get login username
| jq -r '.login.username'

# Get login password
| jq -r '.login.password'

# Get first URI
| jq -r '.login.uris[0].uri'

# Get notes
| jq -r '.notes'

# Fallback chain: field → password → notes
| jq -r '.fields[0].value // .login.password // .notes'

# List item names from search results
| jq -r '.[].name'

# Filter items with a specific field name
| jq '.[] | select(.fields[]?.name == "TARGET") | .name'
```
