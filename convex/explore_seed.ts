import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

/** One-time seed mutation to mark generated demo apps as featured.
 *  Run via Convex dashboard after generating the 6 demo tools. */
export const markFeatured = internalMutation({
  args: {
    items: v.array(
      v.object({
        sessionId: v.id("sessions"),
        category: v.string(),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      const app = await ctx.db
        .query("apps")
        .withIndex("by_session", (q) => q.eq("sessionId", item.sessionId))
        .first();
      if (app) {
        await ctx.db.patch(app._id, {
          featured: true,
          featuredOrder: item.order,
          featuredCategory: item.category,
        });
      }
    }
  },
});

const DEMO_TOOLS = [
  {
    id: "communication-board",
    title: "Communication Board",
    description: "A picture-based AAC board with tap-to-speak cards and a sentence builder strip.",
    category: "communication",
    prompt: "Build a communication board for a nonverbal child. Include a 3x3 grid with core words (I want, help, more, stop, yes, no, eat, drink, play). Each card has a picture and label. Tapping a card speaks the word aloud and adds it to a sentence strip at the top. The sentence strip has a play button to speak the full sentence and a clear button.",
  },
  {
    id: "morning-routine",
    title: "Morning Routine",
    description: "A step-by-step morning routine with pictures, progress tracking, and celebration.",
    category: "schedule",
    prompt: "Build a morning routine visual schedule for a 5-year-old.",
  },
  {
    id: "token-board",
    title: "5-Star Reward Board",
    description: "A reward system where children earn stars toward a chosen prize.",
    category: "reward",
    prompt: "Build a 5-star token board.",
  },
  {
    id: "social-story",
    title: "Going to the Dentist",
    description: "A page-by-page social story with illustrations and read-aloud narration.",
    category: "social-story",
    prompt: "Build a social story about going to the dentist for a young child with autism.",
  },
  {
    id: "emotion-checkin",
    title: "Emotion Check-In",
    description: "A feelings picker with body mapping and coping strategy suggestions.",
    category: "emotional",
    prompt: "Build an emotion check-in tool for a child in therapy.",
  },
  {
    id: "articulation-practice",
    title: "Articulation Practice",
    description: "Speech sound practice cards with recording, playback, and therapist scoring.",
    category: "speech",
    prompt: "Build an articulation practice tool for the 'S' sound.",
  },
] as const;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildPlaceholderHtml(title: string, description: string, prompt: string): string {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} — Bridges</title>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,700&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Instrument Sans', sans-serif;
      background: #F6F3EE;
      color: #1C1B1F;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
      text-align: center;
    }
    h1 {
      font-family: 'Fraunces', serif;
      font-size: 2rem;
      font-weight: 700;
      color: #00595c;
      margin-bottom: 0.75rem;
    }
    p {
      font-size: 1.1rem;
      color: #49454F;
      max-width: 480px;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .badge {
      display: inline-block;
      background: linear-gradient(135deg, #00595c, #0d7377);
      color: white;
      font-weight: 600;
      font-size: 0.875rem;
      padding: 0.5rem 1.25rem;
      border-radius: 999px;
      text-decoration: none;
      transition: opacity 0.3s ease;
    }
    .badge:hover { opacity: 0.9; }
    .tagline {
      margin-top: 2rem;
      font-size: 0.8rem;
      color: #79747E;
    }
  </style>
</head>
<body>
  <h1>${safeTitle}</h1>
  <p>${safeDescription}</p>
  <a class="badge" href="/builder?prompt=${encodeURIComponent(prompt)}" target="_top">
    Customize This App
  </a>
  <p class="tagline">Built with Bridges</p>
</body>
</html>`;
}

/** Self-contained seed that creates demo apps with placeholder bundles.
 *  Run once via: npx convex run explore_seed:seedDemoApps */
export const seedDemoApps = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Idempotent guard
    const existing = await ctx.db
      .query("apps")
      .withIndex("by_featured_order", (q) => q.eq("featured", true))
      .first();
    if (existing) {
      return { status: "skipped", reason: "Featured apps already exist" };
    }

    const now = Date.now();
    const created: string[] = [];

    for (let i = 0; i < DEMO_TOOLS.length; i++) {
      const tool = DEMO_TOOLS[i];

      // 1. Create session
      const sessionId = await ctx.db.insert("sessions", {
        title: tool.title,
        query: tool.prompt,
        state: "live",
      });

      // 2. Create placeholder bundle file
      const html = buildPlaceholderHtml(tool.title, tool.description, tool.prompt);
      await ctx.db.insert("files", {
        sessionId,
        path: "_bundle.html",
        contents: html,
      });

      // 3. Create featured app
      const shareSlug = `demo-${tool.id}`;
      await ctx.db.insert("apps", {
        title: tool.title,
        description: tool.description,
        sessionId,
        shareSlug,
        createdAt: now,
        updatedAt: now,
        featured: true,
        featuredOrder: i + 1,
        featuredCategory: tool.category,
      });

      created.push(shareSlug);
    }

    return { status: "seeded", apps: created };
  },
});
