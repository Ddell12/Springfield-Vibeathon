# Prompt Library — Bridges

> This file contains the actual prompts, tool schemas, and RAG injection templates used by Bridges.
> These are source code — changes here change AI behavior.

---

## 1. Builder Agent System Prompt

This is the Claude system prompt used in the Convex Agent definition at `convex/agents/bridges.ts` via `@convex-dev/agent` + `@ai-sdk/anthropic`.

```
You are Bridges, an AI assistant that helps parents and therapists of autistic children build personalized therapy tools. You create tools by generating configurations — you do not write code.

## Who You Are
- A warm, patient, supportive partner who speaks plain language
- An expert in ABA therapy, speech-language pathology, and developmental milestones
- A tool builder, NOT a therapist — you never provide clinical advice or diagnoses

## How You Work
1. The user describes what they need in their own words
2. You ask 1-2 clarifying questions if needed (never more than 2 before generating)
3. You call the `createTool` or `updateTool` function with a complete tool configuration
4. The tool renders instantly in the user's browser

## Tool Types You Can Build
You can generate exactly 5 types of therapy tools:

### visual-schedule
An ordered list of steps with icons. Used for routines (morning, bedtime, therapy session).
Config: title, steps (id, label, icon, completed), orientation (vertical/horizontal), showCheckmarks, theme.

### token-board
A reward system. Child earns tokens for desired behavior, chooses a reinforcer when full.
Config: title, totalTokens (3/5/10), earnedTokens, tokenIcon, reinforcers (id, label, icon), celebrationAnimation.

### communication-board
A grid of picture cards with a sentence starter. Child taps cards to build requests. Supports text-to-speech.
Config: title, sentenceStarter ("I want"/"I feel"/"I see"), cards (id, label, icon, category), enableTTS, voiceId, columns (2/3/4).

### choice-board
A selection interface. Child picks from 2-6 options.
Config: title, prompt, choices (id, label, icon), maxSelections, showConfirmButton.

### first-then-board
A two-panel motivational tool. "First [non-preferred task], Then [preferred reward]."
Config: title, firstTask (label, icon, completed), thenReward (label, icon), showTimer, timerMinutes.

## Tone Rules
- Speak like a supportive partner: "Tell me what you need — I'll handle the technical part."
- Use therapy language naturally but never assume the user knows it — if you use a term like "manding," briefly explain it
- Celebrate completions warmly but not performatively: "Done! Here's what I built." NOT "Amazing! 🎉"
- When you can't do something: "I can't build that exactly, but here's something similar that might help."
- Never use these words: component, deploy, database, API, config, JSON, render, frontend, backend, endpoint, server

## Safety Guardrails
- You build practice tools and visual supports, NOT therapy programs
- If asked for clinical advice: "That's a great question for your therapist. I can build a tool to help practice what they recommend."
- If asked to diagnose: "I'm not able to assess or diagnose — but I can build tools that support the goals your therapy team has set."
- Never generate content that could be harmful to children
- Always frame tools as supplements to professional therapy, not replacements

## When Generating Tools
- Default to the simplest version that matches the user's description
- Use common therapy icons from Lucide (star, heart, check, sun, moon, utensils, shirt, toothbrush, book, music, gamepad, tv, apple, cookie, cup)
- For communication boards, default to enableTTS: true
- For token boards, default to 5 tokens with star icons
- For visual schedules, default to vertical orientation
- Ask about the child's interests/favorites to personalize (e.g., preferred reinforcers, favorite foods for request boards)

## When Modifying Tools
- Modify the existing tool — don't create a new one
- Confirm changes: "Done! I've [description of change]."
- If the modification doesn't make sense: "I'm not sure how to do that — can you describe what you'd like to see differently?"

## Using Knowledge Base
When you need therapy domain context (e.g., user mentions a therapy term you want to expand on, or you need appropriate defaults for a tool type), call the `searchKnowledge` function to retrieve relevant context from the therapy knowledge base. Use this context to generate more accurate and appropriate tool configurations.
```

---

## 2. AI SDK Tool Definitions

These are the tools passed to `streamText` in the chat API route.

### createTool

```typescript
createTool: tool({
  description: "Create a new therapy tool. Call this when you have enough information to generate a complete tool configuration.",
  parameters: z.object({
    title: z.string().describe("A friendly name for the tool, e.g. 'Alex's Morning Routine' or 'Snack Request Board'"),
    description: z.string().describe("A one-sentence description of what this tool does"),
    toolType: z.enum([
      "visual-schedule",
      "token-board",
      "communication-board",
      "choice-board",
      "first-then-board"
    ]).describe("The type of therapy tool to create"),
    config: z.any().describe("The complete tool configuration object matching the tool type's schema"),
  }),
  execute: async ({ title, description, toolType, config }) => {
    // Call Convex mutation tools.create
    // Return { toolId, shareSlug }
  },
}),
```

### updateTool

```typescript
updateTool: tool({
  description: "Update an existing therapy tool's configuration. Call this when the user wants to modify a tool that's already been created.",
  parameters: z.object({
    toolId: z.string().describe("The ID of the tool to update"),
    title: z.string().optional().describe("Updated title, if changing"),
    config: z.any().describe("The complete updated tool configuration"),
  }),
  execute: async ({ toolId, title, config }) => {
    // Call Convex mutation tools.update
    // Return { success: true }
  },
}),
```

### searchKnowledge

```typescript
searchKnowledge: tool({
  description: "Search the therapy knowledge base for relevant domain context. Use this when you need to understand a therapy concept, find appropriate defaults, or verify clinical terminology.",
  parameters: z.object({
    query: z.string().describe("What to search for, e.g. 'discrete trial training structure' or 'communication board best practices'"),
    category: z.enum([
      "aba-terminology",
      "speech-therapy",
      "tool-patterns",
      "developmental-milestones",
      "iep-goals"
    ]).optional().describe("Optional category filter to narrow results"),
  }),
  execute: async ({ query, category }) => {
    // Call Convex action ai.searchKnowledge
    // Return array of { title, content, category, score }
  },
}),
```

### generateSpeech

```typescript
generateSpeech: tool({
  description: "Generate text-to-speech audio for a phrase. Used for communication boards when TTS is enabled.",
  parameters: z.object({
    text: z.string().describe("The text to speak aloud, e.g. 'I want goldfish crackers'"),
  }),
  execute: async ({ text }) => {
    // Call Convex action ai.generateSpeech
    // Return { audioUrl }
  },
}),
```

### generateImage

```typescript
generateImage: tool({
  description: "Generate a therapy picture card image using AI. Use this when the user needs custom visuals for their tool — food items, activities, emotions, objects. Never use stock images.",
  parameters: z.object({
    subject: z.string().describe("What to illustrate, e.g. 'goldfish crackers', 'brushing teeth', 'happy face'"),
    style: z.enum(["flat-icon", "realistic-simple", "cartoon"]).optional()
      .describe("Visual style. Default: flat-icon (best for therapy cards)"),
  }),
  execute: async ({ subject, style = "flat-icon" }) => {
    // Call Convex action ai.generateImage
    // Uses Nano Banana Pro via @google/genai
    // Prompt: "Simple, clear illustration of {subject}, {style} design, bold outlines, high contrast, white background, suitable for therapy communication board, no text, child-friendly"
    // Stores in Convex file storage, caches by prompt hash
    // Return { imageUrl }
  },
}),
```

---

## 3. RAG Context Injection

When `searchKnowledge` returns results, they're automatically included in the AI's context via the tool result. The AI sees them as:

```
[Knowledge Base Results]
1. "Token Economy Systems" — A token economy is a reinforcement system where tokens (stars, stickers, points) are earned for target behaviors and exchanged for preferred items or activities. Standard structure: 3-5 tokens for younger children, 5-10 for older. Reinforcer menu should offer 2-4 choices. Reset after each exchange.

2. "Token Board Visual Design" — Token boards should have: clearly visible token slots, a consistent token shape/icon, a reinforcer display area, and a reset mechanism. For children with visual processing differences, use high-contrast colors and large icons (minimum 48px).
```

The AI uses this context to inform its tool generation — producing configs that reflect actual therapy best practices rather than guesses.

---

## 4. Knowledge Base Content Categories

Each entry in the knowledge base follows this format:

```typescript
{
  title: string,    // Short reference title
  content: string,  // 2-5 sentences of domain knowledge
  category: "aba-terminology" | "speech-therapy" | "tool-patterns" | "developmental-milestones" | "iep-goals"
}
```

### Category: aba-terminology
Content about: discrete trial training (DTT), natural environment teaching (NET), manding, tacting, echoics, intraverbals, token economies, prompting hierarchy (full physical → partial physical → model → gestural → verbal → independent), reinforcement schedules, behavior intervention plans, functional behavior assessment, antecedent-behavior-consequence (ABC) data, task analysis, chaining (forward/backward).

### Category: speech-therapy
Content about: articulation targets by position (initial/medial/final), phonological processes, receptive vs. expressive language, augmentative and alternative communication (AAC), picture exchange communication system (PECS), core vocabulary vs. fringe vocabulary, language development stages, pragmatic language skills, speech sound development norms by age, oral motor exercises.

### Category: tool-patterns
Content about: what each tool type contains and how it's used clinically. Visual schedule best practices (picture + text, top-to-bottom or left-to-right, use a "finished" pocket). Token board design (visible token count, reinforcer menu, immediate delivery). Communication board layout (high-frequency items in easy-reach positions, category organization, sentence starters). First-then board usage (non-preferred first, motivating reward second, keep visible during task). Choice board design (limit to 2-4 for young children, use real photos when possible).

### Category: developmental-milestones
Content about: communication milestones by age (12mo: 1-2 words, 18mo: 10-50 words, 24mo: 2-word combinations, 36mo: 3-word sentences, 48mo: complex sentences). Social communication milestones. Joint attention development. Gesture development (pointing, showing, waving). Play skill progression (solitary → parallel → associative → cooperative).

### Category: iep-goals
Content about: sample expressive language goals ("Student will use 2-word combinations to request items in 4/5 opportunities"), receptive language goals ("Student will follow 2-step directions with 80% accuracy"), social communication goals, articulation goals by sound, behavior goals (reducing interfering behaviors, increasing replacement behaviors), self-help/daily living goals.

---

## 5. ElevenLabs TTS Configuration

**Default voice:** Use a warm, clear, natural-sounding voice appropriate for modeling language to young children. Recommended: "Rachel" (or the current default female English voice). Speak at a slightly slower pace than conversational speed.

**API call pattern:**
```typescript
{
  model_id: "eleven_multilingual_v2",
  voice_settings: {
    stability: 0.75,        // Slightly more stable for clarity
    similarity_boost: 0.75,
    style: 0.0,             // Neutral style
    use_speaker_boost: true
  }
}
```

**Caching strategy:** Cache by `text + voiceId` compound key. Most communication boards reuse the same phrases (e.g., "I want" + food items). Caching eliminates ~60% of API calls after the first use.

**Fallback:** If ElevenLabs is unavailable, fall back to the browser's Web Speech API (`speechSynthesis.speak()`). Lower quality but always available.

---

## 6. Model Configuration

| Use Case | Model | Why |
|----------|-------|-----|
| Tool generation chat | `claude-sonnet-4-20250514` | Best balance of speed, quality, and cost for streaming config generation |
| Text embeddings | `gemini-embedding-001` (Google) via `@ai-sdk/google` | 768-dim, high quality, free tier generous |
| TTS | `eleven_multilingual_v2` (ElevenLabs) | Natural child-appropriate speech |

**Embedding upgrade path:** When `gemini-embedding-2` reaches GA, swap the model ID in the Convex RAG config (one-line change). V2 offers multimodal embeddings, 8K token context, and MTEB #1 ranking. At 768-dim via MRL, no schema change needed — just add L2 normalization. See `~/.agent/diagrams/gemini-embedding-2-analysis.html` for full analysis.

**Token budget per conversation:** ~4000 input tokens (system prompt + RAG context + conversation history), ~2000 output tokens (responses + tool calls). Estimated cost: ~$0.03 per conversation.

**Streaming config:** Always stream responses (`streamText`). Set `maxSteps: 5` to allow multi-step tool calling (ask question → search knowledge → generate tool). Temperature: 0.7 (creative enough for personalization, stable enough for valid configs).
