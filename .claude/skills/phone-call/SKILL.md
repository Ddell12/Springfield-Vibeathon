---
name: phone-call
description: "Make outbound phone calls via ElevenLabs Conversational AI + Twilio. Use when: user asks to call a business (cancel membership, schedule appointment), coordinate with contacts by phone, or any task requiring a voice call. Triggers on: 'call', 'phone', 'cancel membership', 'cancel subscription', 'schedule appointment', 'book appointment'."
---

# Phone Call Skill

Make outbound phone calls using ElevenLabs Conversational AI agents with Twilio.

## Prerequisites

- ElevenLabs MCP server connected (tools: `create_agent`, `make_outbound_call`, `list_conversations`, `get_conversation`)
- Twilio phone number linked to ElevenLabs (phone_number_id stored in Bitwarden as "ElevenLabs Phone Number ID")
- Bitwarden unlocked for credential/PII retrieval

## Before Every Call — Telegram Approval Gate

**MANDATORY:** Never make a call without explicit user approval.

1. Send a Telegram message describing the call:
   - Who you're calling and why
   - What information you'll provide if asked (name, account number, etc.)
   - What outcome you expect
2. Wait for user to approve via inline keyboard or reply
3. Only proceed after explicit approval

## Persistent Aura Agent

A general-purpose Aura voice agent exists on ElevenLabs for all outbound calls:

- **Agent ID:** `agent_6501kjx79pv1ejbtb2szvp8v8msk`
- **Name:** Aura — Personal Assistant
- **Voice:** Eric (cjVigY5qzO86Huf0OWal) — smooth, professional
- **LLM:** gemini-2.0-flash-001, temp 0.4
- **Max duration:** 600s (10 min), turn timeout 10s

This agent handles cancellations, bookings, inquiries, and coordination calls with a single system prompt. **Use this agent by default** — only create a disposable agent if the call requires highly specialized behavior not covered by Aura's general prompt.

## Call Flow

### Step 1: Gather Context

- Identify the business/contact to call and the phone number
- Use Bitwarden CLI to retrieve relevant credentials:
  - `bw get item "<service>"` for account numbers, membership IDs
  - `bw get item "Identity Verification"` for PII (name, DOB, last 4 SSN, address) — this is a secure note
- Determine the call objective (cancel, book, inquire, coordinate)

### Step 2: Make the Call

1. Retrieve the phone_number_id from Bitwarden: `bw get item "ElevenLabs Phone Number ID"`
2. Call `mcp__ElevenLabs__make_outbound_call` with:
   - `agent_id`: `agent_6501kjx79pv1ejbtb2szvp8v8msk` (persistent Aura agent)
   - `agent_phone_number_id`: from Bitwarden
   - `to_number`: business phone number in E.164 format (+1XXXXXXXXXX)

> **Fallback:** If the call requires specialized behavior (e.g., navigating a very specific IVR tree with custom responses), create a disposable agent via `mcp__ElevenLabs__create_agent` with a tailored system prompt instead.

### Step 3: Monitor and Record

1. Wait 2-3 minutes, then check `mcp__ElevenLabs__list_conversations` for the agent
2. Use `mcp__ElevenLabs__get_conversation` to get the transcript
3. If call is still active, wait and check again

### Step 4: Write Results to Vault

Write a summary to the daily note (`Daily Notes/YYYY-MM-DD.md`):

```markdown
## Phone Call: [Business Name]

- **Time:** HH:MM
- **Outcome:** [Success/Failed/Needs follow-up]
- **Confirmation #:** [if applicable]
- **Summary:** [2-3 sentence summary]
```

### Step 5: Notify via Telegram

Send a Telegram message with the outcome summary.

## Agent Templates

### Cancellation Call

- first_message: "Hi, I'm calling to cancel my [membership/policy/subscription]."
- System prompt focus: identity verification, get confirmation number, confirm no further charges

### Booking Call

- first_message: "Hi, I'd like to schedule an appointment."
- System prompt focus: available times, preferences, confirm booking details

### Coordination Call

- first_message: "Hey [name], this is DeShawn's assistant calling about [topic]."
- System prompt focus: be friendly, confirm plans, relay information
