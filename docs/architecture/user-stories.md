# User Stories — Bridges

## Epic: Tool Creation

**US-001: Create a tool from natural language**
As James (parent), I want to describe what therapy tool I need in plain language so that I get a working, personalized tool without any technical knowledge.
- Given I send a description, the AI responds with the tool or a clarifying question
- Tool preview appears within 30 seconds
- Preview is interactive (tappable elements)
- Vague description → AI asks a follow-up, never generates a broken tool

**US-002: Customize a generated tool via chat**
As James, I want to refine my tool by chatting so that it perfectly fits my child's needs.
- Modification updates the existing tool (not a new one)
- Preview re-renders within 3 seconds
- Contradictory modification → AI explains and suggests alternatives

**US-003: Save a tool for later**
As James, I want my tools saved automatically so I can return to them.
- Tool appears in My Tools after creation
- My Tools shows titles and timestamps

## Epic: Tool Sharing

**US-004: Share a tool via link**
As James, I want to share my tool with a link so anyone can use it immediately.
- Share dialog with copyable link and native share
- Shared link works without an account
- Invalid link → friendly 404 with CTA

## Epic: Templates

**US-005: Browse and use templates**
As James, I want to browse pre-built templates so I can start from something.
- Categorized template gallery
- Selecting a template loads it into the builder
- Categories: Communication, Behavior Support, Daily Routines, Academic Skills

## Epic: Communication Board TTS

**US-006: Hear requests spoken aloud**
As James, I want my communication board to speak when my son taps a picture.
- Tapping a card → full sentence spoken within 2 seconds
- Voice sounds natural and child-appropriate
- TTS unavailable → show text in large banner instead
