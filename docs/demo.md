# Demo Plan — Bridges

> Target: 3–5 minute video for Springfield Vibeathon judges.
> Record after Phase 6 is complete. This doc plans the script, flow, and preparation.

---

## The Hook (0:00 – 0:30)

**Open with the problem, not the product.**

> "Every week, parents of autistic children get sent home from therapy with a stack of photocopied worksheets and one instruction: 'practice this at home.' But every kid on the spectrum is different — and every app in the App Store treats them the same. So most parents just... wing it. 23 hours between therapy sessions, and nothing to work with."
>
> "Bridges fixes that. A parent describes what their child needs — in their own words — and gets a working, personalized therapy tool in 30 seconds. No coding. No configuring. Just describe and build."

**Visual:** Start on a clean browser, Bridges landing page visible. Don't touch anything yet — let the words land.

---

## Live Demo (0:30 – 3:30)

### Demo Flow 1: The Magic Moment — Parent Builds a Communication Board (1:30)

**This is the most important part of the demo. Show it working from scratch, not pre-loaded.**

1. **Start fresh.** Click "Start Building" from the landing page. Empty builder screen — chat on left, blank preview on right.

2. **Type a real request:** "I need something to help my son practice requesting snacks"

3. **AI asks a follow-up:** The AI should ask "What are his favorite snacks?" (show the streaming response)

4. **Respond naturally:** "Goldfish crackers, apple slices, and yogurt tubes"

5. **Tool generates.** Show the communication board appearing in the preview — with AI-generated picture cards (not stock icons), a sentence strip "I want ___", and a play button.

6. **Interact with it.** Tap a picture card — "goldfish crackers" appears in the sentence strip. Tap the play button — **the app speaks "I want goldfish crackers" out loud.** Let the audio play fully. This is the emotional peak.

7. **Customize via chat.** Type: "Can you make the pictures bigger and add a 'yogurt' card?" Show the tool updating in real-time.

8. **Share it.** Tap Share — show the link and QR code. Say: "Every tool gets a link that works on any phone. No app store, no download."

**Narration style:** "I'm typing this live — there's no pre-loaded data here. The AI already knows what a communication board is, what requesting means in therapy, and how to structure this for a child. I didn't have to explain any of that."

### Demo Flow 2: Therapist Builds a Token Board (0:45)

1. **New tool.** Click "New Tool" to start fresh.

2. **Type:** "Build me a 5-star token board with a choice of iPad, swing, or bubbles at the end"

3. **Tool generates** — 5 empty star slots, reinforcer choices at the bottom.

4. **Interact:** Tap to earn tokens (show the animation). Earn all 5 — show the reinforcer selection appearing. Select "iPad" — show the celebration pulse.

5. **Quick note:** "A therapist just saved 30 minutes of laminating. And when the kid gets bored of stars next week, she changes the icon in 5 seconds instead of remaking the whole board."

### Demo Flow 3: Templates (0:30)

1. **Navigate to Templates.** Show the gallery — categories: Communication, Behavior Support, Daily Routines, Academic Skills.

2. **Tap "Morning Routine Schedule."** Show it loading in the builder pre-configured.

3. **Customize:** "Change this to a bedtime routine — add brush teeth, put on pajamas, and story time." Show the AI updating the schedule.

4. **Quick note:** "Parents who don't know what to ask for can start here and make it their own."

### Edge Case / Robustness Moment (0:15)

Show one thing that demonstrates robustness:
- Type something vague: "help my kid talk better"
- The AI asks a clarifying question instead of generating something random: "Can you tell me more about what your child is working on? For example, are they practicing requesting items, naming things, or building sentences?"

**Narration:** "It doesn't guess. It asks. Because a wrong tool is worse than no tool."

---

## Technical Walk (3:30 – 4:15)

**45 seconds showing one technically interesting thing. Don't show the whole codebase — show one deep thing.**

Option A — The therapy knowledge base (recommended):
> "Under the hood, Bridges has a knowledge base of ABA therapy terminology, speech therapy concepts, and developmental milestones — embedded as vectors and searchable via semantic search. When a parent says 'requesting snacks,' the AI retrieves context about manding, communication boards, and PECS-style layouts. That's why it generates the right tool type without being told. The domain intelligence is the moat."

Show (briefly): The Convex dashboard with the knowledgeBase table, or a quick terminal view of the RAG search returning relevant therapy context.

Option B — Config-based generation:
> "Bridges doesn't generate code. The AI produces a JSON configuration — 'communication board, 3 columns, these cards, TTS enabled' — and pre-built React components render it instantly. That's why generation takes seconds, not minutes, and why every tool works perfectly on the first try."

Show: A tool config JSON object next to the rendered component.

---

## Close (4:15 – 4:45)

> "I built Bridges because my son Ace has Level 1 autism. I've downloaded dozens of apps trying to help him practice at home between therapy sessions. None of them fit his specific goals, his specific interests, or his specific developmental level."
>
> "There are 1.5 million families like mine in the US. ABA therapy costs $50–100 an hour, waitlists are 6–12 months, and parents are left on their own for 23 hours a day. Bridges gives them the power to build exactly what their child needs — in their own words."
>
> "This is day one. Next: progress tracking so therapists can see what happens at home, video analysis of therapy sessions, and a community library where therapists share their best tools with every parent."

**End on the product, not a slide.** Keep the communication board visible on screen with the "I want goldfish crackers" sentence strip showing.

---

## Pre-Recording Checklist

### Environment
- [ ] Close Slack, email, notifications, all non-essential apps
- [ ] Use an incognito/clean browser window
- [ ] Set browser zoom to 100% (or 110% if text is small)
- [ ] Verify localhost is running and warmed up (load the builder page once before recording)
- [ ] Verify Convex backend is connected (check the Convex dashboard)
- [ ] Verify API keys are working: Claude, ElevenLabs, Google AI
- [ ] Verify audio output works (TTS will play during demo)
- [ ] Set screen resolution to 1920x1080 (1080p recording)

### Content
- [ ] Knowledge base is seeded (RAG returns relevant results)
- [ ] Templates are loaded (gallery has all 8)
- [ ] NO pre-existing tools in the database (start fresh for the demo)
- [ ] Test the exact demo flow 2-3 times before recording

### Recording
- [ ] Use OBS Studio or QuickTime (free, no watermarks)
- [ ] Use a headset or close microphone (clear audio is critical)
- [ ] Record at 1080p or higher
- [ ] Do a 30-second test recording first — check audio levels and resolution
- [ ] One clean take > choppy edits. Minor mistakes are fine.
- [ ] Add captions after recording (CapCut for auto-captions)

### After Recording
- [ ] Trim dead space at start/end
- [ ] Add captions (judges may watch on mute first)
- [ ] Export as MP4, under 100MB
- [ ] Upload to Vibeathon platform AFTER code is submitted

---

## Script Outline (Word Count Target: ~600 words for 4 minutes)

| Timestamp | Section | Words | Key Visual |
|-----------|---------|-------|------------|
| 0:00–0:30 | Hook — the problem | ~80 | Landing page, still |
| 0:30–2:00 | Demo 1 — communication board + TTS | ~200 | Live typing → tool generates → TTS plays |
| 2:00–2:45 | Demo 2 — token board | ~100 | Token animation → reinforcer selection |
| 2:45–3:15 | Demo 3 — templates | ~80 | Gallery → customize → done |
| 3:15–3:30 | Edge case — vague input | ~40 | AI asks clarifying question |
| 3:30–4:15 | Technical walk — RAG/config | ~100 | Convex dashboard or JSON config |
| 4:15–4:45 | Close — Ace's story + vision | ~100 | Product on screen, camera on Desha |

---

## What Judges Will See (Mapped to Their Rubric)

| Judge Criteria | How We Address It |
|---------------|-------------------|
| **Real problem?** | Open with the 23-hours-between-therapy-sessions pain. Personal story with Ace. |
| **Demo is real?** | Start from blank state. Type live. No pre-loaded data. Generate fresh tools. |
| **Understand what you built?** | Technical walk explains RAG + config-based generation. "We chose this because..." |
| **Usable?** | Show a non-technical parent flow. 30 seconds to first tool. No jargon in UI. |
| **Complete?** | 5 working tool types, TTS, AI image gen, sharing, templates. Don't demo anything broken. |

---

## What NOT to Say

- "AI-powered" without showing what that means (show the RAG, show the config)
- "We used Claude" without explaining how (show the therapy-aware system prompt, the tool calling)
- "We plan to add..." for more than 15 seconds (vision is the close, not the body)
- Any developer jargon: "component," "API," "deploy," "Convex," "Next.js" (in the pitch — fine in the technical walk)
- "We didn't have time to..." — only say what you shipped

## What TO Say

- "I built this because my son Ace has autism"
- "The AI already speaks therapy language — you don't have to"
- "30 seconds from description to working tool"
- "Every tool works on any phone with just a link"
- "This is all live — there's nothing pre-loaded here"
- "No two kids on the spectrum are the same. No tool should be either."

---

## Backup Plan

If the live demo breaks during recording:
1. **Have a pre-recorded backup** of the full demo flow (record a clean run before the "real" recording)
2. If TTS fails: the sentence text still displays visually — mention "text-to-speech normally plays here"
3. If AI is slow: keep talking ("The AI is thinking about this — it's checking our therapy knowledge base for context...")
4. If generation fails entirely: switch to showing a template and customizing it (still demonstrates the core loop)

The golden rule: **show what actually works.** 3 features done perfectly beats 5 features with glitches.
