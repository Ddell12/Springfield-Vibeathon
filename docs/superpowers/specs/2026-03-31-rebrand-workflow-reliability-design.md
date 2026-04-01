# Rebrand, Workflow IA, and Reliability Relaunch

**Date:** 2026-03-31
**Status:** Drafted for review
**Scope:** Company rebrand, SLP workflow information architecture, library merchandising, builder preview hardening, share/publish entitlement redesign, notification routing

---

## Overview

Bridges has outgrown its current framing as an AI builder with adjacent clinical modules. The next product step is a coordinated relaunch that makes the product feel clinician-native, AI-native, and operationally dependable.

This relaunch has three connected outcomes:

1. **Brand reset** — rename the entire company and product, replace the current logo, and establish a more credible clinician-first identity.
2. **Workflow reset** — reorganize the product around how SLPs actually work, especially by moving billing out of the primary sidebar and embedding it into sessions, signed notes, patient records, and a secondary operations area.
3. **Reliability reset** — harden the generation pipeline so preview creation, sharing, and publishing behave like dependable product features instead of fragile post-generation side effects.

The implementation should be sequenced internally as:

1. Reliability and entitlement fixes
2. Navigation and workflow UX changes
3. Brand application across the stabilized product

That sequencing reduces rework while still treating the initiative as one coherent relaunch.

---

## Approved Decisions

### Brand

- The rename applies to the **entire company and product**, not just the builder surface.
- The desired identity is **hybrid clinical trust + AI-native**.
- The name should carry a **subtle healthcare or communication cue**, but should not be literal or generic.
- The primary audience for immediate name resonance is **SLPs and clinical owners**.

### Billing

- Billing should move to a **hybrid model**:
  - mostly entered and advanced through workflow touchpoints
  - still accessible in one secondary admin or operations workspace
- Billing should **not** remain a first-tier SLP sidebar destination.

### Entitlements

- Free-tier users **should still be able to share** a successfully generated app after hitting the saved-app limit.
- Saving additional apps and publishing can remain gated separately.

---

## Market Research: Billing Placement in Comparable Platforms

The strongest comparable therapy and practice-management platforms treat billing as part of clinical and operational workflow, not as the main product destination.

### 1. SimplePractice

- Billing is tied directly to **appointment status**, which determines whether an appointment is billable.
- Billing is also accessed through client-facing and reporting workflows, not only through a standalone billing page.
- This supports a workflow model where scheduling, attendance, and billing are tightly connected.

Sources:
- https://support.simplepractice.com/hc/en-us/articles/360018410872-Managing-appointment-statuses-and-billing
- https://support.simplepractice.com/hc/en-us/articles/41995508032269-Navigating-the-appointment-page
- https://support.simplepractice.com/hc/en-us/articles/25260889730957-Navigating-the-Appointment-status-report

### 2. Prompt

- Prompt positions itself as an integrated speech therapy platform spanning scheduling, patient management, checkout, and billing.
- The product framing emphasizes one operational system rather than billing as an isolated top-level product identity.

Sources:
- https://www.promptemr.com/specialities/speech-therapy
- https://www.promptemr.com/features

### 3. HelloNote

- HelloNote explicitly states that signed documentation and charting feed billing and claims.
- That is a documentation-led billing model: billing follows clinical completion instead of starting as a separate destination.

Source:
- https://hellonote.com/documentation/

### 4. WebPT

- WebPT describes billing as EMR-integrated and connected to documentation, claims review, and financial workflows.
- The product positioning centers clinical workflow and operational throughput together.

Sources:
- https://get.webpt.com/billing-software
- https://www.webpt.com/insight-emr

### 5. Practice Perfect

- Practice Perfect presents billing and accounts receivable alongside scheduling, client demographics, and clinical documentation as part of a unified operational suite.
- This is still direct access to billing, but not billing as the primary product identity.

Sources:
- https://practiceperfectemr.com/features
- https://practiceperfectemr.com/features/billing-payments-accounts
- https://practiceperfectemr.com/pricing

### Research Conclusion

The pattern across these products is consistent:

- Billing is important, but it is usually **embedded into calendar, documentation, patient, and revenue-review workflows**.
- Billing is often directly accessible, but it is **rarely the first thing the product says it is about**.

**Inference:** Bridges should move billing out of the primary sidebar and reposition it as a secondary operations workspace fed by sessions, signed notes, and patient context.

---

## Proposed Product Structure

### Initiative Framing

This work should be treated as a **coordinated relaunch**, not a pile of unrelated fixes.

Why:

- the current brand, navigation, and reliability issues reinforce each other
- fixing reliability without restructuring the product leaves the wrong mental model in place
- restructuring the product without fixing reliability creates a cleaner shell around broken critical flows
- rebranding before those fixes would apply a new identity to an unstable experience

### Recommended Internal Sequence

1. **Reliability first**
   - preview availability
   - share/publish contract separation
   - entitlement UX cleanup
   - notification routing reliability
2. **Workflow IA second**
   - billing relocation
   - sidebar and route changes
   - library card and pagination improvements
3. **Brand rollout third**
   - company rename
   - logo and wordmark
   - product-wide copy and visual application

---

## Information Architecture

### Primary SLP Navigation

Recommended primary sidebar:

- Builder
- Patients
- Sessions
- Speech Coach
- Library

### Billing Placement

Billing moves out of primary navigation and into a **secondary Practice or Operations area** accessed from the account/admin surface.

Billing remains a real destination, but not a top-level peer to the product’s core clinical workflows.

### Workflow Entry Points for Billing

Billing actions should surface from:

- **Sessions**
  - status badge such as `Needs billing`, `Ready`, `Billed`
  - quick action to open the billing record or next step
- **Signed notes**
  - direct “continue billing” or “review billing” action after documentation is finalized
- **Patient record**
  - billing history and insurance context in patient detail
- **Secondary operations workspace**
  - queue and review views for unbilled, ready, and billed items

### Rationale

This preserves direct access while aligning the product with real SLP workflow:

- clinical work happens first
- billing follows clinical completion
- revenue review happens in a separate management context

---

## Library Design

### Product Goal

The library should become a **visual catalog**, not a text-heavy list of cards.

Clinicians should be able to recognize an app quickly based on what it looks like and what it is for, especially when the library grows to dozens of items.

### Tabs

- `My Apps`
- `Templates`

### Pagination

Add pagination to both tabs so users do not need to scroll through long unbounded lists.

Behavior:

- page size should be fixed and predictable
- pagination state should be preserved in the URL
- tab changes should preserve or reset pagination intentionally, not incidentally

### Card Imaging Strategy

#### Built apps

Preferred source: **actual preview screenshot** captured from the generated app.

Fallback order:

1. latest successful app screenshot
2. deterministic placeholder thumbnail derived from app type or blueprint
3. no-image fallback card only when capture fails entirely

#### Templates

Preferred source: **curated representative screenshot** of the target app experience.

Fallback order:

1. real screenshot of seeded template output
2. AI-generated image that clearly previews the intended interface
3. styled placeholder only when neither exists

### Card Metadata

Cards should prioritize recognition and purpose:

- title
- one-line use case
- image thumbnail
- compact footer such as `Template`, `Built by you`, `Updated recently`, or `Used in sessions`

### UX Intent

The library should feel closer to a therapy materials catalog than a developer asset manager.

---

## Builder Preview Reliability

### Product Goal

The builder should treat **preview availability** as a first-class success condition.

The design target is that every successful generation should produce a usable preview automatically, with clear system state and safe retry behavior when preview creation fails.

### Current Problem

Preview generation is currently experienced as fragile:

- the UI can reach a “live” state without a dependable preview
- failures collapse into a generic “Something didn’t look right”
- preview generation, bundle creation, and preview loading are not surfaced as distinct states

### Required System States

The system should explicitly model:

- generating source
- bundling preview artifact
- validating preview artifact
- loading preview
- preview ready
- preview retrying
- preview failed with classified reason

### Hardening Approach

- Separate **generation success**, **bundle success**, and **preview load success** in persisted session/build state.
- Persist build artifacts and statuses for each session so the UI can recover and re-open a known-good preview.
- Retry transient failures automatically when safe.
- Keep the last good preview visible during regeneration or rebuild.
- Add a targeted `Retry preview` action instead of a vague generic retry flow.
- Instrument failure reasons so the team can monitor actual preview reliability.

### UI Contract

The UI should always be able to tell the user one of the following:

- the app is still generating
- the app is bundling for preview
- the system is retrying preview creation
- the preview is ready
- preview creation failed and can be retried
- preview creation failed and needs product support or a different generation path

### Reliability Principle

The preview is not a decorative extra. It is the primary proof that the generated app exists and works.

---

## Share, Save, and Publish Contract

### Current Product Problem

The current flow couples sharing to `ensureForSession`, which also enforces free-tier app saving limits. This creates the wrong contract:

- users hit a saved-app cap
- sharing is blocked even when the app was generated successfully
- the product logs an error-like path instead of showing a deliberate entitlement decision

### Desired Separation

These actions should become distinct product concepts:

#### Save to My Apps

- persists a session as part of the user’s saved library
- remains eligible for free-tier limits

#### Share

- creates or exposes a shareable link for a successful generated app
- should remain allowed for free users even after the saved-app cap is reached
- should not depend on the same entitlement path as saving

#### Publish

- stronger distribution action
- can remain premium-gated
- should have its own preflight checks and button-state messaging

### UX Expectations

- Users should understand what action is blocked and why.
- Upgrade prompts should be deliberate product moments, not fallback error handlers.
- Console errors should not be the mechanism for normal entitlement enforcement.

---

## Notification Routing

### Product Goal

The notification bell should function as a navigation surface, not just a passive message list.

### Required Click Behavior

When a notification is clicked:

1. mark it as read
2. close the popover
3. route the user to the correct destination

### Routing Priority

1. Use an explicit `link` when present.
2. If no explicit link exists, resolve a route from the notification type and referenced entity.
3. If no exact route can be resolved, route to the nearest relevant default page rather than doing nothing.

### Fallback Examples

- session-related notification → session detail or sessions list
- notes-ready notification → session note or patient session record
- billing-related notification → billing review queue or patient billing context

### Non-Goal

The product should never leave the user in a state where clicking a notification appears broken.

---

## Brand Direction

### Desired Brand Attributes

The new identity should feel:

- clinician-trusted
- AI-native
- operationally capable
- warm without becoming soft or childish
- credible to SLP owners and private practices

### What the Brand Should Avoid

- children’s app energy
- generic “AI startup” naming patterns
- sterile EHR heaviness
- chat bubble clichés
- neon or gradient-heavy AI visual language

### Naming Criteria

The new name should:

- work for the entire company and product
- feel credible to SLPs and clinical owners first
- suggest communication, progress, clarity, or clinical intelligence without being literal
- be ownable enough for a company-scale brand
- be easy to say, recommend, and remember

### Naming Territories to Explore

#### 1. Communication and Clarity

Names that suggest expression, understanding, language, voice, or clarity without sounding like a narrow AAC product.

#### 2. Clinical Intelligence and Progress

Names that suggest forward motion, insight, precision, or adaptive support without sounding cold or enterprise-only.

#### 3. Connection and Coordination

Names that suggest support across therapist, patient, caregiver, and care plan workflows, but with more authority than the current brand.

### Logo Direction

Recommended identity system:

- wordmark-first
- restrained symbol optional, not mandatory
- typography-led trust
- one intelligent accent gesture is acceptable
- no mascot system
- no overly playful iconography

---

## Scope Boundaries

### In Scope

- company and product rename direction
- logo direction
- billing relocation and workflow access model
- library thumbnail and pagination design
- builder preview reliability model
- share/save/publish separation
- notification click-through behavior

### Out of Scope

- final name selection in this spec
- final logo execution in this spec
- direct clearinghouse billing integrations
- full marketing site rewrite beyond brand application planning
- implementation details for every backend mutation or schema change

---

## Risks

### 1. Rebrand before reliability

If the new brand ships before preview/share/publish reliability improves, the relaunch will amplify product trust problems instead of solving them.

### 2. Billing becomes too hidden

If billing is removed from the main sidebar without strong workflow entry points and a discoverable secondary operations area, users may perceive it as missing rather than repositioned.

### 3. Thumbnail pipeline adds fragility

If screenshot generation for library cards is not designed as a resilient background workflow with fallback imagery, library improvements could create a new operational failure mode.

### 4. Entitlement logic stays coupled

If sharing, saving, and publishing continue to share one backend pathway, UX improvements will remain superficial and regress easily.

---

## Recommended Next Step

Create an implementation plan that breaks this relaunch into phases:

1. reliability and entitlement fixes
2. IA and workflow changes
3. brand system rollout

The implementation plan should keep each phase independently testable and releasable, while preserving the relaunch narrative across the whole initiative.
