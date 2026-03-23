# API Specification — Bridges

## Chat Architecture (Convex Agent)

Chat is powered by `@convex-dev/agent`, NOT a Next.js API route. The agent manages threads, messages, streaming, and tool calling internally via Convex mutations and actions.

**Agent definition:** `convex/agents/bridges.ts`
**AI tools available:** `createTool`, `updateTool`, `searchKnowledge`, `generateSpeech`, `generateImage`
**React hooks:** `useUIMessages`, `useSmoothText`, `optimisticallySendMessage`

See `docs/ai/prompt-library.md` for system prompt and tool schemas.
See `docs/architecture/dependencies.md` § Convex Agent for hook details.

---

## Convex Queries (read-only, reactive)

### tools.get
```typescript
args: { toolId: v.id("tools") }
returns: tool object or null
```

### tools.getBySlug
```typescript
args: { slug: v.string() }
returns: tool object or null
// Used for shared tool links (/tool/[slug])
```

### tools.list
```typescript
args: {}
returns: array of tool objects, sorted by createdAt desc
```

### templates.list
```typescript
args: { category: v.optional(v.string()) }
returns: array of template tool objects
```

### ttsCache.get
```typescript
args: { text: v.string(), voiceId: v.string() }
returns: { audioUrl: string } or null
```

---

## Convex Mutations (transactional writes)

### tools.create
```typescript
args: { title, description, toolType, config, threadId?, isTemplate }
returns: v.id("tools")
// Generates shareSlug via nanoid(10)
```

### tools.update
```typescript
args: { toolId, config, title? }
returns: null
```

### tools.remove
```typescript
args: { toolId }
returns: null
```

---

## Convex Actions (external API calls)

### ai.searchKnowledge
```typescript
args: { query: string, category?: string }
returns: array of { content, title, category, score }
// Embeds query via Google API → vector search on knowledgeBase
```

### ai.seedKnowledge
```typescript
args: { entries: array of { content, category, title } }
returns: null
// Embeds each entry → inserts into knowledgeBase. Idempotent.
```

### ai.generateSpeech
```typescript
args: { text: string, voiceId?: string }
returns: { audioUrl: string }
// Checks ttsCache → if miss, calls ElevenLabs → stores in file storage → caches
```

### ai.generateImage
```typescript
args: { subject: string, style?: "flat-icon" | "realistic-simple" | "cartoon" }
returns: { imageUrl: string }
// Checks cache by prompt hash → if miss, calls Nano Banana Pro via @google/genai
// Stores in Convex file storage, caches prompt hash → storage ID
// Fallback: @fal-ai/client if Google API fails
```

### ai.embed
```typescript
// Internal action
args: { text: string }
returns: number[] (768-dim float64 array)
// Calls Google gemini-embedding-001
```
