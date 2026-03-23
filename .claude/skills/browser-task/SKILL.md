---
name: browser-task
description: "Execute browser automation tasks with credential injection and session management. Use when: user needs to interact with a website (login, fill forms, navigate dashboards, extract data, take screenshots), fix account issues on web portals, book services online, or any task requiring browser interaction. Triggers on: 'login to', 'go to website', 'check my account', 'fix on website', 'browse to', 'open dashboard', 'book online', 'order from'."
---

# Browser Task Skill

Execute autonomous browser tasks using Playwright MCP with Bitwarden credential injection.

## Prerequisites

- Playwright MCP enabled (check config)
- Bitwarden CLI unlocked for credential retrieval
- Persistent browser profile at `~/.config/aura/browser-profile/`
- Refer to @browser-router for tool selection if Playwright isn't the right fit

## Before Every Browser Task — Telegram Approval Gate

**MANDATORY:** Get explicit user approval before interacting with any authenticated website.

1. Send Telegram message: what site, what you'll do, what credentials you'll use
2. Wait for approval
3. Only proceed after explicit approval

## Browser Task Flow

### Step 1: Check Session State

1. Navigate to the target site's dashboard/home URL
2. Take a snapshot (`browser_snapshot`) to check if you're logged in
3. If the page shows a dashboard/account → session is valid, skip to Step 3
4. If redirected to login → proceed to Step 2

### Step 2: Login with Credentials

1. Use `get_credentials("<service>")` to retrieve username/password from Bitwarden
2. Fill the login form:
   - `browser_fill_form` with username and password fields
   - `browser_click` on the submit button
3. Handle 2FA if prompted:
   - **TOTP (authenticator app stored in Bitwarden):**
     - Run: `bw get totp "<service>"` via Bash to generate current code
     - Fill the 2FA field with the code
   - **SMS/Push 2FA (not in Bitwarden):**
     - Send Telegram message: "[Service] needs a 2FA code. Check your phone and reply with the code."
     - Wait for user reply
     - Fill the 2FA field with the provided code
4. Verify login succeeded with another snapshot

### Step 3: Execute the Task

- Navigate to the relevant page
- Perform the required actions (click, fill, extract)
- Take screenshots at key decision points for audit trail
- Save screenshots to `~/.config/aura/browser-screenshots/`

### Step 4: Handle Failures

If Playwright automation breaks (CAPTCHA, unusual layout, dynamic content):

1. Take a screenshot to understand the current state
2. Try alternative selectors or approaches
3. If still stuck → notify user via Telegram with screenshot, ask for guidance
4. As a last resort, suggest Computer Use mode (vision-based interaction)

### Step 5: Write Results to Vault

Write outcome to daily note:

```markdown
## Browser Task: [Service/Site]

- **URL:** [target URL]
- **Outcome:** [Success/Failed/Partial]
- **Actions taken:** [bullet list]
- **Screenshots:** [paths]
```

### Step 6: Notify via Telegram

Send summary with outcome.

## Screenshot Audit Trail

For sensitive flows (banking, insurance, payment):

- Screenshot BEFORE each major action
- Screenshot AFTER each major action
- Save to `~/.config/aura/browser-screenshots/YYYY-MM-DD/[task-name]/`
- Include timestamps in filenames

## Common Patterns

### Dashboard Navigation

```
browser_navigate → browser_snapshot → identify target link → browser_click → browser_snapshot
```

### Form Filling

```
browser_snapshot → identify form fields → browser_fill_form → browser_click (submit) → browser_snapshot (confirm)
```

### Data Extraction

```
browser_navigate → browser_snapshot → read data from snapshot → write to vault
```

## Security Rules

- NEVER store credentials in vault or logs — always retrieve fresh from Bitwarden
- NEVER screenshot pages showing full credit card numbers or SSNs
- NEVER auto-submit payment without explicit Telegram approval
- Close browser session after task completion
