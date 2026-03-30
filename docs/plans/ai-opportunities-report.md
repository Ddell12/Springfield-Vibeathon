# AI Opportunities for Bridges — Comprehensive Research Report

> **Date:** 2026-03-30
> **Purpose:** Identify novel AI capabilities that help SLPs do more than was possible 4+ years ago and empower parents who don't know how to help their kids. Each opportunity includes evidence, competitive landscape, technical fit with Bridges' stack, and implementation approach.

---

## What Bridges Already Has

| Capability | Tech |
|---|---|
| AI code generation (builds interactive therapy apps) | Claude Sonnet via SSE streaming |
| Therapy image generation | Google Gemini |
| Text-to-speech | ElevenLabs `eleven_flash_v2_5` |
| Speech-to-text | ElevenLabs Scribe v2 |
| RAG knowledge base (therapy domain) | Google Gemini embeddings + Convex vector search |
| AAC template (80 core words, Fitzgerald colors) | Pre-built in builder |
| Sandboxed preview with 40+ shadcn components | WAB + Parcel bundling |

---

## Opportunity Matrix — All 11 Opportunities at a Glance

| # | Opportunity | Evidence Strength | Competition | Stack Fit | Effort | Impact |
|---|---|---|---|---|---|---|
| 1 | AI Social Skills Coach | RCT validated (Stanford Noora) | Research-only | Perfect | Medium | Highest |
| 2 | Parent Voice Cloning for AAC | ElevenLabs partnerships | Voice Keeper, Smartbox | Perfect | Low | High |
| 3 | Auto SOAP Notes from Sessions | Market validated ($100M+) | Ambiki, SPRY (standalone) | Good | Medium | High |
| 4 | Articulation Feedback in Apps | Emerging (55% accuracy) | Sara Speech, LumaSpeech | Good | Med-High | Medium |
| 5 | AI Social Story Generator | RCT validated (EMooly) | EZducate (static only) | Perfect | Low-Med | High |
| 6 | Language Sample Analyzer | Gold standard assessment | No web app competitor | Good | Medium | High |
| 7 | Generative Music for Regulation | Meta-analysis validated | MusePlay (standalone) | Easy | Low | Medium |
| 8 | Video Analysis for Autism Screening | FDA precedent (Cognoa) | Cognoa, SenseToKnow | New API (Twelve Labs) | High | Highest |
| 9 | AI Bedtime Story Generator | AutiHero study (218 stories, 16 families) | Scarlett Panda, Oscar | Perfect | Low-Med | High |
| 10 | AI Kids Video Section | Established EBP (video modeling) | Gemiini (pre-recorded only) | New (Remotion + Suno) | High | Highest |
| 11 | Game-Based ABA Section | MITA: 2.2x language gains (n=6,454) | Otsimo, MITA, AutiSpark | Perfect | Med-High | Highest |

---

## 1. AI Social Skills Coach

### What It Is
LLM-powered structured role-play where children practice social scenarios (greeting a friend, ordering food, handling conflict) with an AI that plays different characters, scores responses, and scaffolds difficulty.

### Evidence
Stanford's **Noora** chatbot ran a randomized controlled trial (published Feb 2025 in *Journal of Autism and Developmental Disorders*):
- **71% of autistic participants improved empathetic responses** after just 4 weeks
- Protocol: 10 statements/day, 5 days/week
- Improvements **generalized to real conversations**, not just the app
- The chatbot grades responses, offers gentle corrections, and validates correct empathetic responses

### Competition
- **Noora** — research prototype only, not commercially available
- No commercial product offers structured, clinically validated social skills role-play via AI

### How It Fits Bridges
Already have Claude streaming + multi-turn chat + TTS/STT. A "Social Skills Practice" template where the AI follows structured therapeutic protocols is directly buildable:
- SLP defines scenarios and target skills
- Claude plays characters with structured grading rubrics
- ElevenLabs voices the characters
- Progressive difficulty (simple greetings → complex conflict resolution)
- Session data logged for SLP review

### Technical Approach
```
SLP defines: scenario, target skills, difficulty level
  → Claude system prompt with therapeutic protocol + grading rubric
  → Multi-turn conversation with child (text or voice via STT/TTS)
  → Real-time scoring: empathy, appropriateness, specificity
  → Session summary with scores → stored in Convex
  → SLP dashboard shows progress over time
```

### Effort: Medium — new template type + structured prompting, no new APIs

---

## 2. Parent Voice Cloning for AAC Apps

### What It Is
Parents record 30-60 seconds of speech → ElevenLabs clones their voice → child's AAC app speaks in mom or dad's voice instead of a robotic default.

### Why It Matters
For non-verbal kids, hearing a familiar voice from their communication device is emotionally transformative. Research shows familiar voices increase device engagement and reduce abandonment rates.

### Evidence & Ecosystem
- **ElevenLabs + Smartbox partnership** — voice cloning integrated into Grid 3 and Grid for iPad AAC software
- **ElevenLabs Impact Program** — free voice cloning licenses for patients with permanent speech loss. SLPs and AAC specialists can apply directly
- **The Voice Keeper** — creates personalized AAC voice in 1 minute, compatible with major communication apps
- **Important limitation:** ElevenLabs prohibits cloning voices of anyone under 18. Can clone parent's voice, not child's

### Competition
- Voice Keeper — standalone voice cloning for AAC
- Smartbox/Grid — built-in via ElevenLabs partnership
- Nobody offers voice cloning *inside a therapy app builder*

### How It Fits Bridges
Already using ElevenLabs with `eleven_flash_v2_5`. Add a "Record Your Voice" flow:
1. Parent records guided sentences (30-60 seconds)
2. ElevenLabs Instant Voice Clone API creates voice profile
3. Voice ID stored in Convex user profile
4. Generated AAC apps use parent's cloned voice for TTS
5. Option to switch between cloned voice and default child-friendly voices

### Effort: Low — ElevenLabs voice cloning API + recording UI

---

## 3. Auto SOAP Notes from Therapy Sessions

### What It Is
When an SLP uses a Bridges-built app in a session, the app automatically generates a draft SOAP note documenting targets addressed, accuracy data, child responses, and next steps.

### Why It Matters
- SLPs spend **6-10 minutes per session** on documentation
- Products like SPRY report **60% reduction in admin time**, 45% improvement in billing accuracy
- 2025 JMIR study rated AI SOAP note quality as "good to excellent"
- AI documentation tools slash charting time by up to 70%
- 78% of SLPs report improved outcomes when using AI tools (more therapy time, less paperwork)

### Competition (All Standalone — None Inside Therapy Apps)
| Product | What It Does | Price |
|---|---|---|
| **Ambiki** (Tenalog AI) | Records sessions, auto-generates SOAP notes, extracts structured data | Subscription |
| **SPRY / Sprypt** | AI Scribe captures conversations, syncs with EMRs (Epic/Cerner) | $49-99/mo |
| **TheraPlatform** | AI transcription + telehealth + 40+ therapy apps | Subscription |
| **AutoNotes** | AI clinical documentation from recordings | Subscription |
| **PatientNotes** | Dedicated AI SOAP note generator for SLPs | Subscription |

**The gap:** Every product is a standalone documentation tool. Nobody generates SOAP notes *from within the therapy activity itself*.

### How It Fits Bridges
Generated apps already run therapy activities. Add event tracking:
```
During session: app logs events
  → { type: "trial", target: "/r/ in initial position", response: "correct", prompt_level: "independent", timestamp }
  → { type: "trial", target: "/r/ in medial position", response: "incorrect", prompt_level: "verbal", timestamp }

After session: Claude generates SOAP note
  S: "Child was engaged and motivated by the dinosaur-themed activity."
  O: "20 trials targeting /r/: 14/20 correct (70%) at independent level. Errors concentrated in medial position."
  A: "Progress toward /r/ mastery. Initial position approaching criterion (90%). Medial position needs continued work."
  P: "Continue /r/ in medial position with visual cues. Increase complexity to phrases when 80% accuracy reached."
```

### Effort: Medium — event logging in generated apps + Claude summarization Convex action

---

## 4. Articulation Feedback in Generated Apps

### What It Is
Child says a target word → STT captures it → AI analyzes whether the target sound was produced correctly → visual/audio feedback (green check / try again animation).

### Evidence
- **Sara Speech** — won 1st place at 2025 Startup Columbia ($25K prize), 37 pilot partnerships with therapists, detects errors across 23 sounds for ages 4-12
- **SpeechLP** — launched at ASHA 2025, voice-activated articulation games designed by certified SLPs
- **LumaSpeech** — AI-powered feedback between therapy sessions with SLP dashboards

### Important Caveat
Stanford tested 15 ASR models on disordered speech — best hit only **55% accuracy for disorder diagnosis**. FDA recommends 80-85%. However, for **practice feedback** (not diagnosis), even imperfect detection is useful, especially with SLP oversight. Fine-tuning Whisper on child speech improves performance significantly.

### Competition
- Sara Speech, LumaSpeech, SpeechLP — all standalone apps
- None let SLPs *build custom* articulation activities

### How It Fits Bridges
ElevenLabs Scribe v2 for transcription → phoneme-level analysis → visual feedback:
```
SLP defines: target sound (/r/), position (initial/medial/final), word list
  → Generated app presents words with images
  → Child says word → Scribe v2 transcribes
  → Claude analyzes: did the transcription match expected pronunciation?
  → Visual feedback: animated celebration or gentle "try again"
  → Accuracy data logged for SOAP notes
```

### Effort: Medium-High — phoneme analysis layer on top of existing STT

---

## 5. AI Social Story Generator

### What It Is
Parent says "my child is anxious about going to the dentist" → AI generates a personalized social story with custom illustrations showing that specific scenario, with the child's name and interests woven in.

### Evidence
- **EMooly** (published ACM IMWUT 2025) — combined AR + generative AI for social-emotional learning. Controlled study with 24 autistic children showed **significant improvement in emotion recognition** using AI-generated social stories covering 7 emotions
- **AutiHero** (arXiv 2509.17608) — two-week study with 16 autistic child-parent pairs. Parents created **218 AI-generated stories** and read an average of **4.25 stories per day**. Results showed effective behavioral guidance and high engagement
- Social Stories (Carol Gray, 1990) are the gold-standard evidence-based intervention with decades of validation

### Competition
| Product | Limitation |
|---|---|
| **EZducate** | 15,000+ families, but produces static PDFs |
| **Nookly** | AI social stories with personalization, but not interactive |
| **Scarlett Panda** | 70+ languages, autism support, but generic audience |
| **Story Spark** | Autism/dyslexia support, but static output |

**The gap:** Nobody generates *interactive* social stories. Every competitor produces static text/images.

### How It Fits Bridges
This is a perfect template type. The builder already generates interactive apps:
- Claude writes the social story following Carol Gray's structure (descriptive, perspective, directive sentences)
- Gemini generates per-page illustrations (already integrated)
- ElevenLabs narrates (already integrated)
- Output is an interactive, swipeable app with TTS narration
- Parent describes the scenario in plain language — exactly the Bridges UX model

### Effort: Low-Medium — new template prompt + existing Gemini + ElevenLabs

---

## 6. Language Sample Analyzer Template

### What It Is
SLP records a child speaking naturally for 3-5 minutes → AI auto-transcribes → calculates standard linguistic metrics → presents a progress dashboard.

### Why It Matters
Language sample analysis (LSA) is the **gold standard** for assessing a child's language abilities, but most SLPs skip it because manual transcription takes 30-45 minutes per sample. Even imperfect auto-transcription that saves 70% of effort is a game-changer.

### What It Measures
| Metric | What It Tells the SLP |
|---|---|
| **MLU** (Mean Length of Utterance) | Grammatical complexity — are sentences getting longer? |
| **TTR** (Type-Token Ratio) | Vocabulary diversity — how many unique words? |
| **Grammatical error patterns** | Specific syntax targets (verb tense, pronouns, articles) |
| **Narrative structure** | Story grammar elements (setting, problem, resolution) |
| **Fluency markers** | Disfluencies, revisions, abandoned utterances |

### Competition
- **Automated LLUNA** — research-stage narrative language assessment tool
- **SALT Software** — manual transcription + analysis (desktop, expensive, labor-intensive)
- No web app does this well today

### How It Fits Bridges
```
SLP records child speaking (3-5 min) → ElevenLabs Scribe v2 transcribes
  → Claude analyzes transcript:
    - Calculates MLU, TTR, error patterns
    - Identifies specific grammatical targets
    - Compares to age norms
  → Results stored in Convex with timestamps
  → Dashboard shows trends across sessions
  → SLP corrects transcription errors (AI assists, human confirms)
```

### Effort: Medium — pre-built template + NLP analysis pipeline

---

## 7. Generative Music for Sensory Regulation

### What It Is
AI generates calming or stimulating music matched to a child's sensory needs — tempo, instrumentation, and style adapt based on the therapy goal.

### Evidence
- **2025 meta-analysis of 18 studies** — music therapy significantly improved social skills, behavioral abilities, and **sensory/emotional regulation** in children with ASD
- **EmoMusik-Net** (Nature Scientific Reports, 2025) — real-time adaptive music generation for autism therapy using facial expression recognition
- **Context-AI Tune (CAT)** — Suno API-powered adaptive music tailored to stress level and surroundings

### How It Fits Bridges
ElevenLabs has a music composition API (`compose_music` — already available as MCP tool):
- "Calming Music" template: slow tempo, gentle acoustic instruments, nature sounds
- "Rhythm Activity" template: structured beats for motor planning exercises
- "Transition Song" template: custom songs for routine transitions (cleanup time, circle time)
- Could also integrate Suno API for vocal children's songs with lyrics

### Effort: Low — ElevenLabs music API + simple template

---

## 8. Video Analysis for Autism Screening (Twelve Labs)

### What It Is
Parents record structured video clips of their child at home → Twelve Labs AI analyzes behavioral markers (eye contact, response to name, joint attention, repetitive behaviors) → generates a structured report with timestamped observations → SLP reviews flagged moments instead of watching raw footage.

### Why This Is Revolutionary
4 years ago, autism screening required an in-person clinic visit with a specialist (average wait: 13 months). Now:

| Product | FDA Status | How It Works | Accuracy |
|---|---|---|---|
| **Canvas Dx (Cognoa)** | FDA authorized (2021) | Parent questionnaire + physician input + ML | 81% PPV, 98% NPV |
| **EarliPoint** | FDA cleared (2022) | Eye-tracking during 12-min movie | 78% sensitivity, 85% specificity |
| **SenseToKnow (Duke/NIH)** | Research stage | Tablet camera during well-child visit | 88% sensitivity, 81% specificity |
| **NODA** | Not FDA authorized | Parent records 4x 10-min home videos, specialist reviews | 85% sensitivity, 94% specificity |
| **Korean Home Video AI** | Research (2025) | 3 structured tasks, pose estimation + NLP | AUROC 0.83, 80% sensitivity |

**SenseToKnow identified 9 children missed by standard M-CHAT screening** and showed consistent accuracy across sex, race, and ethnicity — addressing the diagnostic disparity gap.

### Behavioral Markers AI Can Detect from Video

| Marker | What AI Measures | Research Finding |
|---|---|---|
| **Eye contact** | Gaze duration on faces vs. objects | 4.25s lacking in ASD vs 1.30s in TD (p<0.001) |
| **Response to name** | Latency to orient when name called | 5.29s ASD vs 3.62s TD (p=0.017) |
| **Joint attention** | Ability to follow gaze/point | Lancet systematic review confirms detectability |
| **Stimming** | Repetitive movements | Pose estimation models detect reliably |
| **Facial expression** | Emotional expression range | SenseToKnow, multiple CV studies |
| **Social engagement** | Reciprocal turn-taking, imitation | Ball-playing and imitation tasks |

### Why Twelve Labs Specifically

Twelve Labs is a video-native AI platform with three APIs purpose-built for this:

| API | Purpose | Cost |
|---|---|---|
| **Analyze API** (Pegasus model) | Generate structured observations from video via prompting | $0.021/min input + $0.0075/1K output tokens |
| **Search API** | Find exact moments matching behavioral descriptions | $4/1,000 queries |
| **Embed API** (Marengo model) | Generate behavioral embeddings for classification | $0.0083/min |
| Indexing | Process video for all APIs | $0.042/min |

**Total cost per screening (~15 min video): under $1.00 in API costs.**

Marengo 3.0 outperforms Google VideoPrism-G by +10%. Pegasus processes videos up to 1 hour with temporal grounding and accurate timestamps. Node.js SDK available.

### Proposed Parent-to-SLP Workflow

```
Step 1: Parent Records (Mobile/Webcam)
  → 3-4 structured tasks, guided by the app:
    - Name-response task (call child's name, 2 min)
    - Imitation task (clap, wave, copy actions, 2 min)
    - Free play observation (child playing, 3-5 min)
    - Social interaction (ball-rolling or peek-a-boo, 2-3 min)

Step 2: Twelve Labs Indexes + Analyzes
  → Upload via API ($0.042/min indexing)
  → Analyze API prompts:
    "Describe the child's eye contact and social engagement"
    "Identify repetitive movements or unusual motor patterns"
    "Note instances of joint attention or lack thereof"
    "Describe response latency when name is called"
  → Search API finds timestamped moments:
    "child making eye contact with parent"
    "child not responding to name"
    "repetitive hand movements"

Step 3: AI Generates Structured Report
  → Color-coded summary: green (typical) / yellow (monitor) / red (refer)
  → Timestamped video clips for each flagged marker
  → Developmental milestone comparison

Step 4: SLP Reviews in Dashboard
  → Jump directly to flagged moments (not watching 15 min raw footage)
  → Confirm or override AI flags with clinical judgment
  → Generate formal screening recommendation
  → Parent-friendly summary auto-generated

Step 5: Longitudinal Tracking
  → Repeated assessments stored in Convex
  → Progress visualization over months
  → Referral documentation auto-generated if concerns warrant
```

### Regulatory Note
Framing as "clinical decision support" for SLPs reviewing parent-submitted videos (not a diagnostic device) keeps this in a lower regulatory category. Any claims about detecting or diagnosing autism would require FDA clearance.

### Effort: High — new API integration (Twelve Labs), video upload pipeline, structured analysis, SLP dashboard

---

## 9. AI Bedtime Story Generator

### What It Is
Parents describe their child's interests, current therapy goals, and tonight's challenge → AI generates a personalized bedtime story with custom illustrations and warm narration — weaving therapy targets into the narrative.

### Why Bedtime Specifically Matters for Autism
- **80%+ of autistic children** have clinically significant sleep problems (2-3x the typical rate)
- Sleep-onset insomnia is the most common issue
- Bedtime resistance often stems from anxiety, not defiance
- Poor sleep directly impacts cognition, memory formation, and verbal skills
- Consistent bedtime routines are a frontline behavioral intervention
- **Stories reduce anxiety through predictability** — knowing what comes next in the story mirrors knowing what comes next in the routine

### Evidence
- **AutiHero** (arXiv 2509.17608) — 16 autistic child-parent pairs over two weeks. Parents created **218 AI-generated stories**, reading an average of **4.25 stories/day**. Results showed effective behavioral guidance and high engagement
- **Social Stories (Carol Gray)** — gold-standard evidence-based intervention since 1990, validated across hundreds of studies
- **Digital social stories** confirmed effective for helping autistic children adapt to real-world changes (PMC, 2021)
- **Frontiers in Psychiatry scoping review (2025)** — GenAI can autonomously create personalized therapeutic content matched to developmental level

### Competition

| Product | Differentiator | Limitation |
|---|---|---|
| **Oscar Stories** | Life lessons, Midjourney illustrations | Not therapy-aware |
| **Gemini Storybook** (Google) | 45+ art styles, free, unlimited | Not therapy-aware |
| **Scarlett Panda** | 70+ languages, autism/ADHD content, custom meditations | Generic audience, not interactive |
| **Story Spark** | Autism/dyslexia-friendly fonts | Static output |
| **StoryBee** | Parent voice cloning for narration | Not therapy-aware |
| **Sleepytales** | Ambient soundscapes, physical book printing | Not therapy-aware |

**The gap:** No product combines (1) AI story generation + (2) therapy-goal personalization for autism + (3) bedtime-specific calming design + (4) interactive format.

### How Bridges Does It Differently

**Basic personalization (all competitors do this):** Child's name, age, interests, favorite animals.

**Therapy-aware personalization (only Bridges):**
- **Therapy goal weaving:** "/s/ sound practice" → "Sofia the snake said ssssseven ssssstars shining in the sssssky"
- **Behavioral guidance modeling:** "When Ace felt the room was too loud, he put on his headphones and took three deep breaths"
- **Routine reinforcement:** Story mirrors the child's actual bedtime routine step by step
- **Emotional regulation scripts:** Characters model coping strategies the child is learning in therapy
- **Progressive exposure:** Gradually introducing challenging scenarios (new places, transitions) in the safe context of a story
- **Calming language patterns:** Repetitive, rhythmic phrasing. Short sentences. Concrete descriptions. No idioms or sarcasm

### Technical Approach
```
Input: child profile + therapy goals + tonight's theme + parent preferences
  → Claude generates story (5-10 pages, social story structure)
    - Descriptive, perspective, coaching sentences (Carol Gray format)
    - First/third person only, never second person
    - Therapy targets woven naturally into dialogue and narrative
  → Gemini generates per-page illustrations
    - Warm, muted color palettes (sensory-friendly)
    - Child's appearance reflected in protagonist
    - Visual supports embedded (emotion faces, routine icons)
  → ElevenLabs narrates
    - Warm, slow child-friendly voice (or parent's cloned voice)
    - Optional ambient background (rain, white noise, gentle music)
  → Interactive reader in generated app
    - Page-turn animation (gentle, motion-safe)
    - Read-along text highlighting
    - Tap-to-hear individual words
    - Save favorites for repetition (autistic children often want the same story)
```

### Effort: Low-Medium — new template type using existing Claude + Gemini + ElevenLabs

---

## 10. AI Kids Video Section (Daily Living Skills + Music)

### What It Is
A "Bridges TV" section where parents access AI-generated, personalized video content teaching daily living skills — brushing teeth, getting dressed, being nice, sharing, taking turns — set to custom children's music. Think CoComelon, but personalized to each child.

### Why Video Modeling Is Powerful

Video modeling is classified as an **"Established" evidence-based practice** by the National Autism Center:

| Study | Finding |
|---|---|
| Bellini & Akullian meta-analysis | TauU effect size **0.74** (strong positive) |
| Job skills meta-analysis | Effect size **0.91** (very strong) |
| Nonverbal children | **Highest efficacy scores** compared to verbal groups |
| Maintenance | Skills **maintained over time and transferred across settings** |
| Acquisition speed | Faster than in-vivo (live) modeling |

**Why it works for autism:** visual learning strength, repeatability, consistent presentation, reduced social anxiety (watching a screen vs. a person), pause/replay capability.

### Why Music Matters Too

Music therapy is **separately evidence-based** for autism:
- 2025 meta-analysis (18 studies): significantly improved social skills, behavioral abilities, and sensory/emotional regulation
- AI-assisted music therapy adapts to individual children's emotional states
- Combining video modeling + music = **dual evidence-based intervention**

### Competition

| Product | What It Does | Limitation |
|---|---|---|
| **Gemiini** | Video modeling platform for autism, Down syndrome, apraxia | Pre-recorded human clips, not AI-generated, not personalized |
| **CoComelon** | 3D animated educational videos for ages 2-5 | Generic, not therapy-aware, not personalized |
| **Nookly** | AI social stories with personalization | Text + images only, no video |

**The gap:** No existing product does AI-generated, personalized video modeling. Gemiini uses fixed, pre-recorded clips. CoComelon is mass-market. Nobody generates custom video content tailored to a specific child's therapy goals.

### Technical Architecture

**Recommended approach: Remotion + AI services (not raw text-to-video)**

Why Remotion over Sora/Veo/Kling:
- Consistent character appearance (text-to-video still struggles with this)
- Precise timing control (narration syncs exactly with visuals)
- Template-based: one composition generates thousands of personalized variants
- React-native: fits Bridges' existing stack perfectly
- Cost: **~$0.001/render on Lambda** vs. $0.10-1.00+ per text-to-video generation

```
Parent/SLP describes skill: "brushing teeth"
  → Claude generates:
    - Video script with scene descriptions
    - Step-by-step visual schedule
    - Custom song lyrics about the skill
  → Suno API generates children's song
    - "Upbeat children's song about brushing teeth, simple repetitive lyrics, age 3-5"
    - 50 free credits/day (~5 songs)
  → Gemini generates illustration frames per scene
    - Character with child's appearance
    - Warm, consistent art style
    - Visual supports (numbered steps, emotion cues)
  → ElevenLabs generates spoken narration
    - Warm, slow child-friendly voice
    - Or parent's cloned voice
  → Remotion composition assembles:
    - Visual scenes (AI-generated images with gentle animation)
    - Background music (Suno)
    - Narration overlay (ElevenLabs)
    - Text labels / visual supports
    - Child's name personalization
  → Remotion Lambda renders to MP4
  → Stored in Convex, playable in app
```

### Video Content Categories

| Category | Examples | Therapy Domain |
|---|---|---|
| **Daily Living Skills** | Brushing teeth, getting dressed, washing hands, potty training | OT / Life Skills |
| **Social Skills** | Being nice, sharing, taking turns, saying sorry, personal space | Social Pragmatics |
| **Emotional Regulation** | Deep breathing, using a calm-down corner, asking for help | Behavioral |
| **Transitions** | Going to school, leaving the playground, bedtime routine | Behavioral |
| **Safety** | Crossing the street, stranger danger, calling for help | Life Skills |
| **Communication** | Asking for things, greeting people, answering questions | SLP |

### Effort: High — new Remotion pipeline + Suno integration + video storage, but massive differentiation

---

## 11. Game-Based ABA Section (Like Otsimo)

### What It Is
A "Bridges Games" section with AI-generated, adaptive ABA therapy games — matching, sorting, sequencing, requesting, labeling, social stories — that auto-adjust difficulty and collect trial-by-trial data.

### Why This Matters

Applied Behavior Analysis (ABA) is the most widely used and researched therapy for autism. Digital ABA games address a critical gap: **therapy happens 2-5 hours/week in clinic, but learning needs to happen every day at home.**

### Competitive Landscape

| Product | Users | Key Strength | Key Weakness |
|---|---|---|---|
| **Otsimo** | 130K active | 100+ games, 16 categories, ML difficulty | Fixed hand-authored content, no data export |
| **MITA** | 2M+ children | FDA breakthrough device designation, **2.2x language gains** (n=6,454, 3 years) | Narrow focus (mental imagery only) |
| **AutiSpark** | 1M+ downloads | Social stories, tracing, memory | No visual rewards, poor personalization |
| **Samsung Look At Me** | Unknown | Eye contact + emotion recognition via camera | Narrow scope, old (2014) |
| **Neuromnia (Nia)** | Therapist-facing | AI co-pilot for ABA (Llama 3.1), auto treatment plans | Not child-facing games |
| **Cognitivebotics** | Research | 12-month study, significant developmental gains | Research stage |

### The MITA Evidence (Strongest in Category)
- **6,454 children** over **3 years**
- Children using MITA showed **2.2x greater language improvement** vs. control (p<0.0001)
- Published in peer-reviewed journal *Healthcare*
- **FDA breakthrough device designation** (Q210093)
- Free app, 2M+ users

### ABA Game Types That Work Digitally

| Game Type | ABA Principle | Example |
|---|---|---|
| **Matching (identical)** | Discrimination training | Match identical objects/pictures |
| **Matching (related)** | Categorization | Match animal to habitat |
| **Sorting** | Classification | Sort by color, shape, size |
| **Sequencing** | Temporal ordering | Arrange morning routine steps |
| **Requesting (manding)** | Functional communication | Tap picture to request item |
| **Labeling (tacting)** | Expressive identification | Name the object shown |
| **Receptive ID** | Listener responding | "Touch the red one" |
| **Social stories** | Social skills / antecedent | Animated scenarios (waiting, sharing) |
| **DTT drills** | Discrete trial training | Stimulus → response → reinforcement |
| **Emotion recognition** | Social cognition | Identify facial expressions |
| **Memory/recall** | Working memory | Card matching, sequence recall |

### How AI Changes the Game (vs. Fixed Content)

Every existing app has **hand-authored, fixed content libraries**. Generative AI unlocks:

| Fixed Content (Otsimo, AutiSpark) | AI-Generated Content (Bridges) |
|---|---|
| Same 10-20 images per category | **Unlimited novel images** so child never memorizes specific pictures |
| Generic social stories | **Personalized stories** with child's name, family, school, triggers |
| Fixed difficulty levels | **Continuous adaptive difficulty** based on real-time performance |
| One language | **Any language** without manual translation |
| Generic themes | **Child's interests** theme everything (dinosaurs? trains? space?) |
| Same reinforcement | **Variable reinforcement schedules** (more extinction-resistant) |
| Manual data recording | **Automatic trial-by-trial data** (accuracy, prompt level, latency) |

### Technical Approach
```
SLP/parent sets up child profile:
  → Name, age, interests, current IEP goals, reinforcer preferences

AI generates game sessions:
  → Claude selects game types matching IEP goals
  → Gemini generates themed images (child's interests)
  → Games run in Bridges app framework (React + shadcn)

During gameplay:
  → Auto-collect: trial accuracy, response latency, prompt level, error type
  → Adaptive engine adjusts difficulty in real-time
  → Token economy: stars/stickers earned per correct response
  → Variable ratio reinforcement (backed by ABA research)

After session:
  → Data stored in Convex
  → Parent dashboard: "Ace got 85% on matching colors today!"
  → SLP dashboard: skill acquisition graphs, prompt dependency curves
  → Auto-generated progress reports
  → SOAP note data feeds into Opportunity #3
```

### Game Engine Architecture
The generated games use the same WAB scaffold Bridges already has (React + Tailwind + shadcn). Key additions:
- **Game state machine** — tracks trials, scores, levels
- **Reinforcement engine** — token economies, animations, sound effects
- **Data collection layer** — logs every interaction to Convex
- **Adaptive difficulty** — Claude adjusts parameters based on accumulated data

### Effort: Medium-High — game templates + data collection + adaptive engine, but uses existing app generation pipeline

---

## Implementation Priority Recommendation

### Phase 1: Quick Wins (1-2 weeks each)
These use existing APIs and fit the current builder template model:

1. **AI Social Story Generator** (#5) — Low-Med effort, high impact, perfect stack fit
2. **Generative Music for Regulation** (#7) — Low effort, ElevenLabs music API ready
3. **Parent Voice Cloning** (#2) — Low effort, ElevenLabs API, emotionally powerful

### Phase 2: High-Value Features (2-4 weeks each)
New capabilities that differentiate Bridges:

4. **AI Social Skills Coach** (#1) — Clinically validated, no new APIs needed
5. **AI Bedtime Story Generator** (#9) — Therapy-aware bedtime stories, existing stack
6. **Auto SOAP Notes** (#3) — Solves massive SLP pain point, data logging + Claude
7. **Language Sample Analyzer** (#6) — Gold standard assessment, STT + Claude

### Phase 3: Platform Expansions (4-8 weeks each)
New sections/infrastructure that make Bridges a comprehensive platform:

8. **Game-Based ABA Section** (#11) — New game templates + data collection + adaptive engine
9. **Articulation Feedback** (#4) — Phoneme analysis layer, ASR accuracy limitations
10. **AI Kids Video Section** (#10) — New Remotion pipeline, highest differentiation
11. **Video Analysis for Screening** (#8) — New Twelve Labs integration, highest impact but regulatory considerations

---

## The Strategic Moat

Every existing product in this space is a **standalone silo**:
- Sara Speech → only articulation
- Ambiki → only documentation
- EZducate → only social stories
- Otsimo → only fixed ABA games
- Gemiini → only pre-recorded video modeling
- Noora → only social skills role-play

**Bridges is the only platform where a therapist or parent describes what they need in plain language and gets a working, interactive, personalized tool built by AI.** Each of these 11 opportunities becomes a template type or feature inside the same builder — one platform that can produce any of them.

The SLP doesn't learn 11 different apps. They describe what they need, and Bridges builds it.

---

## Sources

Over 80 sources were consulted across clinical trials, shipped products, FDA databases, and academic papers. Key sources by opportunity:

**Social Skills Coach:** Stanford Noora RCT (JADD 2025), Stanford HAI coverage
**Voice Cloning:** ElevenLabs Impact Program, Smartbox partnership, The Voice Keeper
**SOAP Notes:** Ambiki, SPRY, JMIR 2025 AI documentation study
**Articulation:** Sara Speech, SpeechLP (ASHA 2025), Stanford ASR evaluation
**Social Stories:** EMooly (ACM IMWUT 2025), AutiHero (arXiv 2509.17608), Carol Gray framework
**Language Analysis:** ASHA Forum 2024, Speech Accessibility Project, SALT Software
**Music:** EmoMusik-Net (Nature 2025), music therapy meta-analysis (Frontiers 2025)
**Video Screening:** Cognoa (FDA 2021), EarliPoint (FDA 2022), SenseToKnow (Duke/NIH), NODA, Twelve Labs API docs, Korean Home Video AI (npj Digital Medicine 2025)
**Bedtime Stories:** AutiHero study, Scarlett Panda, Oscar Stories, sleep/autism research (Frontiers Neuroscience)
**Kids Video:** Bellini & Akullian video modeling meta-analysis, Gemiini, Remotion docs, Suno API
**Game-Based ABA:** MITA 3-year trial (Healthcare), Otsimo, Cognitivebotics (JMIR 2025), Neuromnia (Meta AI/Llama 3.1)
