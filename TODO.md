# Bridges — V2 Feature Backlog

Items explicitly deferred during the speech coach redesign (2026-04-02).
Add to these as design sessions produce more deferred items.

---

## Speech Coach — V2

### Active Session
- [ ] SLP remote monitoring of live sessions (teletherapy use case — separate feature, needs separate LiveKit room participant model)
- [ ] Video of the child during session (privacy + HIPAA considerations, needs consent flow)
- [ ] In-session sound correction audio models (real-time phoneme scoring, requires STT with phoneme-level output)
- [ ] Persistent per-child reward characters or avatars (motivational layer, needs art assets + character config schema)

### SLP Setup & Templates
- [ ] Template sharing between SLPs (org/team model, needs multi-tenancy)
- [ ] AI-generated template suggestions based on IEP goals (requires IEP data ingestion)
- [ ] SLP-facing analytics on template usage across caseload (usage dashboard)

### AI Coach Quality
- [ ] Real-time phoneme-level accuracy scoring (requires dedicated STT model with phoneme output, not transcript text)
- [ ] Dysarthria or fluency disorder coaching (current scope: articulation only)
- [ ] Multi-language support (Spanish, Mandarin — needs separate voice models and prompt stacks)

### Post-Session & Reporting
- [ ] Full IEP documentation system (HIPAA-compliant clinical records, out of scope for this build)
- [ ] Billing/insurance integration (CPT code mapping for telepractice)
- [ ] Offline mode (session playback without internet)
- [ ] HIPAA-compliant clinical record export (PDF with provider signature line)
- [ ] GFTA-2 standardized scoring integration (requires licensed test content)
- [ ] Progress report generation for IEP meetings (full formatted report, separate feature)

### Home Practice Integration
- [ ] Push notifications / SMS reminders for caregivers (needs notification consent model + Twilio/push infra)
- [ ] Caregiver-to-SLP messaging about session difficulties (async messaging feature, separate from existing teletherapy)
- [ ] Automated difficulty progression — AI decides when to advance to next sound (requires multi-session trend analysis + SLP approval gate)
- [ ] SLP weekly digest email (low priority — opt-in per patient, Resend integration exists)

---

## Tools Builder — V2

*(Add deferred items from the tools builder redesign here as they come up)*

---

## General Platform

*(Cross-cutting V2 items)*
