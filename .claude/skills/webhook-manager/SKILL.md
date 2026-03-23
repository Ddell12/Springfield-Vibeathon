---
name: webhook-manager
description: Manages webhook registrations — register, list, update, and deactivate webhook sources. Use when managing webhooks: "register a webhook for Stripe", "list my webhooks", "deactivate the GitHub webhook".
metadata:
  timeout: 3m
  parameters:
    action:
      type: string
      default: list
      description: "Action to perform: register, list, update, deactivate, activate, test"
---

# Webhook Manager

Aura receives external webhooks via two endpoints:

1. **Convex HTTP** — `POST /webhook?name=<source>` on the Convex deployment URL
2. **Daemon** — `POST /webhooks/<source>` on the local trigger server (via Tailscale Funnel)

Each webhook source can be registered with per-source auth configuration in the `webhookRegistrations` Convex table. Unregistered sources fall back to global Bearer token auth.

---

## Webhook Registration Fields

| Field             | Description                                                   |
| ----------------- | ------------------------------------------------------------- |
| `source`          | Identifier (e.g., "stripe", "github", "elevenlabs")           |
| `description`     | Human-readable description                                    |
| `secret`          | Signing secret for verification                               |
| `signatureMethod` | `hmac-sha256`, `hmac-sha1`, `bearer`, or `none`               |
| `signatureHeader` | Header containing the signature (e.g., `x-hub-signature-256`) |
| `targetTaskId`    | Trigger.dev task ID to invoke (default: `agent-job`)          |
| `active`          | Whether this registration is active                           |

---

## Actions

### register — Register a new webhook source

Use the Convex mutation to register a new source:

```bash
# Via Convex dashboard or API
npx convex run webhooks/registrations:register \
  '{"source": "stripe", "description": "Stripe payment events", "secret": "whsec_...", "signatureMethod": "hmac-sha256", "signatureHeader": "stripe-signature", "targetTaskId": "agent-job"}'
```

### list — List all registrations

```bash
npx convex run webhooks/registrations:list '{"activeOnly": true}'
```

### update — Update a registration

```bash
npx convex run webhooks/registrations:update \
  '{"id": "REGISTRATION_ID", "targetTaskId": "new-task-id"}'
```

### deactivate — Deactivate a webhook source

```bash
npx convex run webhooks/registrations:deactivate '{"id": "REGISTRATION_ID"}'
```

### activate — Reactivate a webhook source

```bash
npx convex run webhooks/registrations:activate '{"id": "REGISTRATION_ID"}'
```

### test — Test a webhook endpoint

```bash
# Test via daemon endpoint (Tailscale Funnel)
curl -X POST "https://macbook-pro.tail9a8f2e.ts.net/webhooks/test" \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"test": true, "message": "Hello from webhook test"}'

# Test via Convex HTTP endpoint
curl -X POST "https://careful-lark-398.convex.cloud/webhook?name=test" \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## Common Patterns

**"Register a webhook for Stripe"**

- Register with `signatureMethod: "hmac-sha256"`, `signatureHeader: "stripe-signature"`, provide the Stripe webhook signing secret

**"Register a webhook for GitHub"**

- Register with `signatureMethod: "hmac-sha256"`, `signatureHeader: "x-hub-signature-256"`, provide the GitHub webhook secret

**"Register a webhook for ElevenLabs"**

- Register with `signatureMethod: "bearer"` and the ElevenLabs API key as the secret

**"List my webhooks"**

- Call `webhooks/registrations:list` and format as a table

**"Deactivate the Stripe webhook"**

- Look up by source, then call `deactivate` with the registration ID

---

## Webhook Event Storage

All incoming webhook events are stored in the `webhookEvents` Convex table with:

- `webhookName` — the source identifier
- `payload` — raw request body
- `receivedAt` — ISO timestamp
- `status` — `pending`, `triggered`, or `failed`

Query recent events:

```bash
npx convex run vault/webhookEvents:getRecent '{"webhookName": "stripe", "limit": 10}'
```

---

## Auth Methods Explained

| Method        | How It Works                                                           |
| ------------- | ---------------------------------------------------------------------- |
| `bearer`      | Checks `Authorization: Bearer <token>` against stored secret           |
| `hmac-sha256` | Computes HMAC-SHA256 of body with secret, compares to signature header |
| `hmac-sha1`   | Computes HMAC-SHA1 of body with secret, compares to signature header   |
| `none`        | No authentication — use only for trusted internal sources              |
