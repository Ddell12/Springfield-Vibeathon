# Speech Coach Review Reliability And Results

**Date:** 2026-04-02
**Status:** Approved
**Program:** Speech Coach and Builder Upgrade Initiative

## Objective

Make Speech Coach sessions complete reliably and produce useful clinician-facing results instead of getting stuck in `Reviewing`. Done means every session reaches a terminal state within 90 seconds of ending, preserves a readable transcript, surfaces AI-generated analysis with useful scores and insights, and still gives therapists a recoverable path when review fails.

## Background

Today the live Speech Coach session UI is minimal, session history depends on a later progress record appearing, and failed or stalled review work leaves sessions stuck in a vague `Reviewing` state. The current results path hides too much of the raw session evidence and does not give clinicians a clear way to understand what happened, what the child said, or what to do next.

The user request adds another requirement: the live session should visually support the child by showing the current target item as an image or flash card while the coach prompts it, then immediately reflect success with a green check and use fireworks only for milestone moments.

## Product Decisions

- Results should use a summary-first hierarchy with the transcript clearly visible on the same screen.
- Review timeout is 90 seconds.
- Live visual prompts should be driven only by planned target items, not arbitrary keywords.
- Correct responses should show a green check immediately, with fireworks only on milestone moments.

## Desired Behavior

- When a live session is active, then the child sees the current planned target card or image, not only a generic listening indicator.
- When the coach prompts a planned target item such as `sad`, then the matching visual appears in the session UI while that prompt is active.
- When the child produces the target correctly, then the UI shows a green check immediately.
- When the child hits a milestone, then the UI may add a gentle celebration such as fireworks without celebrating every single correct response.
- When a session ends, then transcript persistence starts immediately before AI review begins.
- When AI review succeeds, then the session shows structured scores, strengths, patterns, recommendations, and the full transcript on the same results screen.
- When AI review does not finish within 90 seconds, then the session moves to a failed review state instead of staying in `Reviewing`.
- When review fails, then therapists can still see the raw transcript and can retry review explicitly.

## Session State Model

The session lifecycle should become explicit:

`configuring -> active -> transcript_ready -> analyzing -> analyzed`

Failure branches:

`analyzing -> review_failed`

Retry branch:

`review_failed -> analyzing -> analyzed | review_failed`

This spec assumes the current vague `completed` status is too weak for the new experience. If the implementation keeps existing storage values for backward compatibility, the app layer should still map them onto these clearer product states.

## Transcript Contract

Speech Coach should persist structured turn data rather than only relying on a downstream summary object.

Each turn should capture:

- coach utterance text
- active target item id
- active target label
- target visual asset reference if available
- child transcript or best-guess utterance
- attempt outcome: `correct`, `approximate`, `incorrect`, `no_response`
- retry count
- timestamps

This transcript becomes the source for both:

- clinician review and auditability
- live child-facing UI state such as target card display and success feedback

## Results UX

The results page should use this hierarchy:

1. Session status and top-level outcome
2. Score cards
3. Key insights and recommendations
4. Full transcript

### Scores

The AI review should generate a small, stable set of scores:

- overall session score
- production accuracy
- consistency
- cueing/support dependence
- engagement

Scores should be understandable in plain clinical language. Avoid developer or model-centric wording.

### Insights

The AI review should produce:

- strengths noticed
- breakdowns or error patterns
- recommended next targets
- suggested home practice notes
- notable cueing patterns

### Transcript Presentation

The transcript should appear on the same results page, directly below the summary content, not behind another route or modal. Each turn should show who spoke, what target was active, and the attempt outcome.

## Live Session UI

The current active session UI should be upgraded from a generic listening state to a clinically meaningful practice surface.

Must show:

- current planned target card or image
- current session state such as `listen`, `your turn`, `try again`, `nice job`
- green check on successful attempt
- milestone fireworks only when a defined threshold is met

Should not show:

- constantly changing visuals driven by incidental coach wording
- noisy celebration on every successful attempt

## Error Handling

- If transcript persistence fails, end the session in an explicit failure state with a retry path where possible.
- If AI review fails, move to `review_failed` and preserve transcript access.
- If a transcript exists but analysis is missing, the UI should still render transcript-first fallback content instead of a dead-end spinner.
- If the user manually retries review, the retry should be idempotent and should not duplicate transcript data.

## Boundaries

**Always:**
- Preserve child-friendly and clinician-friendly wording in the UI.
- Keep route files thin and place the work inside `src/features/speech-coach/` and the owning Convex speech coach domain.
- Match `DESIGN.md`: warm surfaces, teal emphasis, minimal motion, celebration only where meaningful.
- Preserve server-side authorization for access to transcript and results.

**Ask first:**
- Introducing a new third-party analytics or speech scoring service beyond the current stack
- Expanding the score model beyond the five agreed top-level scores
- Shipping caregiver-visible clinician analysis by default

**Never:**
- Never leave a finished session in an indefinite `Reviewing` state
- Never hide the raw transcript when it exists
- Never drive visuals from arbitrary non-target words the coach says

## Technical Pointers

- `src/features/speech-coach/components/active-session.tsx`
- `src/features/speech-coach/components/session-history.tsx`
- `src/features/speech-coach/components/progress-card.tsx`
- `src/features/speech-coach/hooks/use-speech-session.ts`
- `src/features/speech-coach/livekit/agent.ts`
- `src/features/speech-coach/livekit/tools.ts`
- `convex/speechCoach.ts`
- `convex/schema.ts`

## Risks And Mitigations

- **Risk:** Live transcript quality is imperfect.  
  **Mitigation:** store best-guess child utterances plus attempt outcomes, and present them as review aids rather than exact medical records.

- **Risk:** The review job times out often and creates a poor experience.  
  **Mitigation:** enforce the 90-second terminal-state rule, keep transcript visible, and add explicit retry.

- **Risk:** The live target-card UI becomes visually noisy.  
  **Mitigation:** limit visuals to planned targets and gate fireworks to milestone events only.

## Verification

**Automated:**
- [ ] Session lifecycle tests cover `analyzed` and `review_failed` terminal states
- [ ] Transcript persistence tests cover structured turns
- [ ] Result mapping tests cover score and insight rendering
- [ ] Live session UI tests cover target-card, success, and milestone feedback states

**Manual:**
- [ ] Start a speech coach session and confirm the active target card appears during practice
- [ ] Complete a correct attempt and confirm the green check appears
- [ ] Hit a milestone and confirm celebration appears only then
- [ ] End a session and confirm results either analyze successfully or fail within 90 seconds
- [ ] Confirm transcript remains visible even when AI review fails
- [ ] Retry a failed review and confirm the session reaches a new terminal state cleanly

## Out Of Scope

- Automatic caregiver-facing home reports
- Arbitrary keyword-to-image generation during live sessions
- A brand new speech coach runtime architecture
