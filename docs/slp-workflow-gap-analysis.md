# Bridges — SLP Workflow Gap Analysis
**Date:** March 30, 2026  
**Scope:** Table-stakes features required for a complete SLP platform — what's incomplete, what's missing, and what needs to be done.

---

## Overview

Bridges covers approximately **60% of a complete SLP workflow**. The AI app builder, patient management, SOAP notes, goal tracking, scheduling, teletherapy, home programs, and parent communication are all production-ready. However, five universally-required platform features are missing entirely, and several built features have gaps that would prevent an SLP from relying on Bridges as their only practice tool.

This report covers only **table-stakes requirements** — features present in every serious SLP platform (SimplePractice, Fusion/Ensora, TheraPlatform, Ambiki) and features that SLP-native platforms specifically offer beyond general EMRs. Niche requirements (standardized test scoring, CF supervision, IEP compliance tracking, prior authorization workflows) are excluded.

---

## Part 1 — Incomplete Features

These features exist in Bridges but have gaps that prevent them from being production-complete for a full SLP workflow.

---

### 1. Telehealth / Video Sessions

**Status:** Built — missing billing compliance, consent capture, and a security fix.

**What works:** LiveKit video integration, appointment scheduling, recording, AI meeting summaries, multi-participant streams.

**What's needed to complete it:**

#### a) Fix the LiveKit token auth security gap
The LiveKit token route is missing an auth check (documented in project memory). Any unauthenticated caller can potentially obtain a room token. This must be fixed before any SLP trusts Bridges with patient sessions.

**Fix:** Add Clerk auth guard to the token generation route. Verify the requesting user is either the SLP who owns the appointment or the caregiver linked to the patient. Reject all other requests with 401.

#### b) Telehealth consent form capture
Many states legally require signed telehealth consent before the first remote session, and all major payers require it for billing. Without documented consent, telehealth claims can be denied or create legal exposure.

**Fix:** Add a telehealth consent form to the intake packet (see Part 2, Item 1). When a caregiver books their first video appointment, gate entry with a one-time consent acknowledgment stored in Convex against the `caregiverLinks` record.

#### c) Telehealth session type flag on notes and billing
Telehealth CPT claims require modifier 95. The session note already captures session type (`in-person` / `teletherapy` / `parent-consultation`) but this signal isn't surfaced anywhere billing-facing. When billing is added (see Part 2, Item 2), the telehealth flag must automatically apply modifier 95.

**Fix:** Surface the `sessionType` field on any billing/superbill output. No code change needed today — the data is already stored correctly.

---

### 2. Session Notes

**Status:** Built — missing same-day signature enforcement and group session support.

**What works:** SOAP format, structured data entry, AI narrative generation, goal linkage, draft → signed workflow.

**What's needed to complete it:**

#### a) Same-day signature enforcement
Medicare and most commercial payers require session notes to be signed on the date of service. A note signed three days later can be flagged in a payer audit and the claim denied or recouped.

**Fix:** Add a timestamp to the signed status transition. Display a warning badge on any note that was signed more than 24 hours after the session date. Do not block signing (SLPs get sick, technology fails) but make the deviation visible.

#### b) Group session documentation (CPT 92508)
Group therapy (2+ patients, same time, same SLP) is billed under CPT 92508. It requires a single note that references all participating patients. Currently notes are 1:1 with a single patient.

**Fix:** Add a "group session" mode to the session note editor where the SLP selects 2–6 patients. Generate one note record per patient (for individual records) but allow shared objective data to be entered once and distributed. Store a `groupSessionId` linking the sibling notes.

---

### 3. Goal Tracking

**Status:** Built — missing the Plan of Care document and goal modification audit trail.

**What works:** 8 therapy domains, IEP-style templates, target accuracy, consecutive session criteria, progress charts, progress report generation.

**What's needed to complete it:**

#### a) Plan of Care (POC) as a formal document
Goal tracking in Bridges is excellent, but goals live inside the app — they aren't currently exportable as a signed, dated Plan of Care. Medicare requires a physician-signed POC before treatment begins. Even private-pay SLPs need a signed treatment plan on file to document informed consent for services.

**Fix:** Add a "Generate Plan of Care" action on the patient's goals view. Produce a formatted PDF containing: patient demographics, diagnosis (ICD-10), long-term and short-term goals, prescribed frequency/duration, projected discharge date, and SLP signature block. See Part 2, Item 3 for the full POC feature.

#### b) Goal modification audit trail
When an SLP modifies an active goal (changes target accuracy, adjusts criterion, rewrites the goal language), there must be a record of what changed, when, and why. Insurance audits and IEP amendments both require this.

**Fix:** On goal edit, before saving, snapshot the previous goal state into an `amendmentLog` array stored on the goal document. Expose a "History" view on the goal detail page showing the changelog with timestamps.

---

### 4. Progress Reports

**Status:** Built — missing multi-audience output and physician signature routing.

**What works:** Weekly, monthly, IEP format reports; AI generation from session data; signing.

**What's needed to complete it:**

#### a) Multi-audience output formatting
The same progress data needs to be communicated to three different audiences with different reading expectations:
- **Insurance/clinical** — formal language, standard scores, medical necessity justification, clinician credentials
- **Parent-friendly** — plain language, goal summaries, celebration of progress, next steps in accessible terms
- **IEP team** — educational framing, IDEA-aligned language, tied to educational impact

**Fix:** Add an "audience" selector to the progress report generator: Clinical, Parent, or IEP Team. The AI prompt for each output should be adjusted accordingly. The underlying data is identical; only the framing changes.

#### b) Physician POC signature (for Medicare patients)
Medicare Part B requires a physician or NPP to sign and date the Plan of Care. Until signed, the SLP cannot bill. Currently there is no mechanism to route a document to a physician for signature or to record that signature.

**Fix:** For now, add a "Physician signature on file" checkbox with a date field to the Plan of Care document. A full e-signature routing workflow (DocuSign / HelloSign) is a later enhancement — the immediate need is the field to record that the signed document exists.

---

### 5. Home Programs

**Status:** Built — missing printable export.

**What works:** SLP-created programs, frequency settings, caregiver logging, speech coach integration, goal linkage.

**What's needed to complete it:**

#### a) PDF / printable export
Not every caregiver will use the Bridges app. A grandparent, school aide, or sitter needs a printed handout they can follow. Without a print view, the home program only reaches caregivers who are digitally engaged.

**Fix:** Add a "Print / Export PDF" button to the home program view. The output should display: program title, target skill in plain language, 2–3 practice activities with step-by-step instructions, frequency, and the SLP's name and contact info. Use browser print CSS or a server-side PDF generator.

---

## Part 2 — Missing Table Stakes Features

These features are **absent entirely** from Bridges and are present in every SLP platform on the market. An SLP cannot run their full practice without them.

---

### 1. Patient Intake Packet & HIPAA Consent Forms

**Why it's table stakes:** HIPAA mandates that covered entities provide a Notice of Privacy Practices and obtain signed consent before delivering services. Every SLP platform ships these forms. Their absence creates federal legal exposure.

**What Bridges is missing:** There is a caregiver invite flow, but no structured intake packet. The following forms must be collected from every new patient/family before the first session:

| Form | Legal Requirement |
|------|-----------------|
| HIPAA Notice of Privacy Practices (NPP) acknowledgment | Federal law (45 CFR §164.520) |
| Consent for evaluation and treatment | State law + ASHA standard |
| Financial responsibility / fee agreement | No Surprises Act (2022) + payer compliance |
| Authorization to release/exchange information | HIPAA (required per third party: school, MD, etc.) |
| Cancellation / attendance policy acknowledgment | Enables no-show fee enforcement |
| Telehealth consent | Many states + all major payers require this |

**What needs to be built:**

- An intake packet step in the caregiver onboarding flow (after accepting the invite, before the first appointment is confirmed)
- Each form rendered as a digital document with an e-signature or checkbox acknowledgment stored with a timestamp in Convex
- An `intakeForms` table tracking which forms each caregiver has completed and when
- SLP-facing status indicator on the patient profile showing "Intake complete" or listing outstanding forms
- Default form templates generated from the patient's assigned SLP (name, practice name, contact info auto-populated)
- A "Good Faith Estimate" for self-pay/out-of-network patients (required by the No Surprises Act — must be provided before services begin if patient requests it or if they are uninsured)

---

### 2. Clinical Billing — CPT Codes, Superbills, and Session Billing Records

**Why it's table stakes:** Every SLP platform on the market — including SimplePractice (general EMR), TheraPlatform, Fusion, and Ambiki — has CPT code billing. ASHA publishes official superbill templates as a baseline standard. Without this, SLPs cannot get paid for the sessions they document in Bridges.

> **Important distinction:** Bridges already has Stripe billing for its own subscription. This is different — this is the infrastructure for SLPs to bill *their patients and insurance companies* for *clinical services*.

**What Bridges is missing:**

A billing record attached to each session note. The session note documents what happened clinically; the billing record documents what to charge for it.

**Core CPT codes Bridges must support:**

| Code | Service | Notes |
|------|---------|-------|
| 92507 | Individual speech/language/voice treatment | Most-billed SLP code |
| 92508 | Group speech/language treatment (2+ patients) | |
| 92521 | Evaluation — speech fluency only | |
| 92522 | Evaluation — speech sound production only | Cannot bill same day as 92523 |
| 92523 | Evaluation — speech sound production + language | |
| 92524 | Voice/resonance behavioral analysis | |
| 92526 | Treatment of swallowing dysfunction | |
| 92597 | AAC device evaluation | |
| 92609 | AAC device service/programming | |

**Required modifiers:**

| Modifier | When Required |
|----------|-------------|
| GP | Required on every SLP claim — identifies services under an SLP plan of care |
| 95 | Required on all telehealth claims |
| KX | Required when Medicare therapy cap threshold is exceeded ($2,480 in 2026) |

**What needs to be built:**

- A `billingRecords` table linked to session notes and patients
- A billing record auto-created when a session note is signed, pre-populated with the most likely CPT code based on session type and goals
- SLP can review/edit CPT code, modifiers, diagnosis (ICD-10), fee, and place of service before finalizing
- A **superbill generator**: a formatted PDF containing NPI, tax ID, date of service, CPT codes + modifiers, ICD-10 diagnosis codes, fee charged, place of service, and SLP signature. This is what out-of-network patients submit to their insurance.
- A billing dashboard showing: unbilled sessions, billed sessions, date billed, and amount
- Basic insurance information fields on the patient profile (carrier name, member ID, group number) — enough to pre-populate the superbill
- ICD-10 diagnosis code linked to the patient record (already partially exists via diagnosis field — needs ICD-10 code mapping added)

**What this is NOT (yet):** Direct claim submission to insurance clearinghouses (Change Healthcare, Availity) and ERA/EOB processing are advanced features that can come later. The immediate need is superbill generation and session billing records — this alone covers private-pay and out-of-network SLPs, which is the majority of private practice.

---

### 3. Treatment Plan / Plan of Care Document

**Why it's table stakes:** ASHA documentation standards and Medicare Part B both require a formal Plan of Care to be established before treatment begins. All SLP platforms include a POC template. It is the clinical contract between the SLP, the patient/family, and the payer.

**What Bridges is missing:** Goals exist in the system but there is no generated, signable POC document that can be given to the family and filed in the patient record.

**What needs to be built:**

A "Generate Plan of Care" action on the patient profile that produces a document containing:
- Patient name, DOB, date of plan
- Diagnosis (ICD-10 codes)
- Long-term goals (pulled from active goals, 6–12 month horizon)
- Short-term goals / objectives (pulled from active goals)
- Prescribed frequency and duration (e.g., "2x/week, 45 minutes, 12 weeks")
- Projected discharge criteria
- SLP signature block (name, credentials, license number, date)
- Physician signature block (name, NPI, date) — with a "signature on file" checkbox for now
- A `planOfCare` table in Convex storing the generated document, linked to the patient, with a `signedAt` timestamp

The POC should be regenerated whenever goals are significantly modified (treatment plan amendment). Amendments are stored as versioned documents.

---

### 4. Evaluation Report

**Why it's table stakes:** Every new patient relationship begins with a formal evaluation. The evaluation report is the clinical document that establishes diagnosis, baseline, and the rationale for treatment. All SLP platforms include evaluation report templates — it is the foundational clinical document in SLP practice.

**What Bridges is missing:** Bridges has session SOAP notes (ongoing treatment documentation) but no evaluation report. There is no way to document the initial evaluation, record assessment findings, assign a diagnosis, or produce the report that goes to the family, referring physician, and insurance company.

**What needs to be built:**

An evaluation report module with the following sections:

| Section | Content |
|---------|---------|
| Identifying information | Patient name, DOB, date of evaluation, referral source |
| Background / case history | Developmental history, prior services, chief complaint (pull from intake form) |
| Assessment tools administered | Checklist of tests used with scores input |
| Results by domain | Structured fields: articulation, language, fluency, voice, pragmatics, AAC — each with narrative and numeric findings |
| Behavioral observations | Free-text clinical observations |
| Clinical interpretation | AI-assisted narrative interpreting scores and observations |
| Diagnosis | ICD-10 code picker with description |
| Prognosis | Dropdown: excellent / good / fair / guarded |
| Recommendations | Services recommended (frequency/duration), referrals to other providers, accommodations |
| Clinician signature | Name, credentials, license number, date |

A `evaluations` table in Convex linked to the patient. The evaluation drives: ICD-10 codes on the patient record, initial goals (the SLP can generate a goal set from the evaluation findings), and the first Plan of Care.

**AI opportunity:** The evaluation report narrative sections (results interpretation, clinical impressions, recommendations) are a direct AI generation target using the same Claude pipeline that generates SOAP notes. SLPs report this as one of the most time-intensive writing tasks they do. Pre-filling these sections from structured score input would be a strong differentiator.

---

### 5. Discharge Summary

**Why it's table stakes:** Every SLP platform includes discharge documentation. ASHA and Medicare documentation standards both require a discharge summary at the end of services. It closes the clinical record and may be needed for insurance audits, school transitions, or future evaluations.

**What Bridges is missing:** There is a patient status field that can be set to "discharged," but no discharge summary document.

**What needs to be built:**

A discharge summary generator triggered when a patient is moved to "discharged" status, producing:

- Date range of services
- Presenting diagnosis at intake
- Initial goals and baseline performance (pulled from first evaluation or initial goals)
- Goals achieved (pulled from goal records with "met" status)
- Goals not met (with explanation — plateau, family request, insurance exhausted, etc.)
- Discharge reason (dropdown: goals met / plateau / family request / insurance exhausted / transition to another provider / other)
- Recommendations for continued services or follow-up
- Return-to-therapy criteria if applicable
- Clinician signature with credentials and date

A `dischargeSummaries` table linked to the patient. When a discharge summary exists, display it prominently on the patient profile for the "discharged" status view.

**AI opportunity:** This is another natural AI generation target. The system already has all the data (goals, session notes, progress trends, evaluation findings). Claude can draft the full narrative from structured data with one click.

---

## Part 3 — Missing Common Features (SLP-Native Expectations)

These features are not in every general EMR, but are standard in SLP-specific platforms. An SLP choosing Bridges over a tool like Fusion or Ambiki will expect these.

---

### 6. Live In-Session Trial Data Collection

**Why it matters:** The data that goes into SOAP notes is collected *during* the session — on paper or a separate tap-app — then manually entered into the note afterward. Every SLP-native platform (Fusion, Ambiki, SLP Toolkit, TheraPlatform) has a live data collection interface built in. SimplePractice (a general EMR) is the only major platform without it.

**What Bridges is missing:** A tapping interface for real-time trial-by-trial data collection during an active session.

**What needs to be built:**

A "Start Session" mode on the session note or from the patient profile that launches a minimal, touch-optimized data collection screen:

- Target display (goal and target pulled from active goals)
- Large `+` (correct) and `−` (error) tap buttons, thumb-reachable on mobile
- Cue level toggle: Independent / Min Cue / Mod Cue / Max Cue
- Running tally displayed (e.g., "14/20 — 70%")
- Multi-target support: swipe between targets mid-session
- End session → data auto-populates the structured data fields in the SOAP note

This closes the paper-to-digital gap and makes the SOAP note generation require near-zero manual data entry.

---

### 7. Goal Bank

**Why it matters:** Bridges has IEP-style goal templates (fill-in-the-blank), which is a good start. But SLP-native platforms ship curated, domain-organized, age-appropriate pre-written goals that SLPs can browse, filter, and customize. This is a key time-saver for new patient onboarding and is expected in any SLP-native tool.

**What Bridges is missing:** A browsable, filterable library of pre-written SLP goals organized by domain, age range, and skill level.

**What needs to be built:**

- A goal bank seeded with 200–400 pre-written goals covering all 8 therapy domains
- Filter by domain (articulation, language, fluency, voice, AAC, pragmatics, feeding)
- Filter by age group (0–3, 3–5, 5–8, 8–12, 12–18, adult)
- Filter by skill level within domain (e.g., articulation: isolation → syllable → word → phrase → sentence → conversation)
- Search by keyword
- Each goal includes: goal text template with `[fill-in]` fields, example baseline data, typical criterion
- "Add to patient" button that opens the goal editor pre-populated with the template
- SLPs can also contribute custom goals to their personal bank

This extends the existing goal templates system — the data model already supports it. The work is seeding the content library and building the browse/filter UI.

---

## Summary Table

### Incomplete Features

| Feature | Gap | Effort |
|---------|-----|--------|
| Telehealth | Auth security fix, telehealth consent capture, modifier 95 flag | Small |
| Session Notes | Same-day signature warning, group session format | Small–Medium |
| Goal Tracking | Goal modification audit trail, POC generation trigger | Small |
| Progress Reports | Multi-audience output (clinical / parent / IEP), physician sig field | Medium |
| Home Programs | PDF/printable export | Small |

### Missing Table Stakes

| Feature | Why It's Blocking | Effort |
|---------|-----------------|--------|
| Patient Intake Packet + HIPAA Forms | Federal legal requirement; every SLP platform has this | Medium |
| Clinical Billing (CPT codes, superbills) | SLPs cannot get paid without it | Large |
| Plan of Care / Treatment Plan document | Required by ASHA standards and Medicare before treatment | Medium |
| Evaluation Report | Every patient starts here; foundational clinical document | Large |
| Discharge Summary | Required at end of every patient relationship | Small–Medium |

### Missing Common Features (SLP-Native Expectation)

| Feature | Why It's Expected | Effort |
|---------|-----------------|--------|
| Live In-Session Trial Data Collection | Standard in Fusion, Ambiki, SLP Toolkit, TheraPlatform | Medium |
| Goal Bank (browsable library) | Standard in all SLP-native platforms | Medium |

---

## Recommended Build Order

1. **Telehealth auth fix** — security gap, must be resolved immediately
2. **Patient intake packet + HIPAA forms** — legal compliance, required before any SLP onboards patients
3. **Evaluation report module** — this is how every patient relationship starts; it feeds the POC and goal creation
4. **Plan of Care document** — links evaluation to treatment; required for Medicare and most payers
5. **Clinical billing + superbills** — revenue-critical; without this SLPs need a second tool just to get paid
6. **Discharge summary** — closes the patient record cleanly
7. **Progress report multi-audience output** — improves existing feature; parent-friendly format is high-value
8. **Live in-session data collection** — removes the last paper workflow from SLP daily life
9. **Goal bank** — accelerates onboarding and goal creation speed
10. **Home program PDF export** — reaches caregivers who aren't app users

---

*Sources: SimplePractice, TheraPlatform, Fusion/Ensora, Ambiki, SLP Toolkit feature comparisons; ASHA documentation standards and Medicare billing guidelines; HIPAA 45 CFR §164.520; No Surprises Act (2022); verified March 2026.*
