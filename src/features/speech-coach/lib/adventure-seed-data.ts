// Types for Adventure Mode seed data.
// Actual seed data lives in convex/seeds/adventure_seed.ts (server-side only).

export type ThemeSeed = {
  name: string;
  slug: string;
  description: string;
  imagePrompt: string;
  ageRanges: ("2-4" | "5-7")[];
};

export type WordSeed = {
  themeSlug: string;
  targetSound: string;
  tier: "word" | "phrase" | "sentence";
  content: string;
  imagePrompt: string;
  difficulty: number; // 1–5
};
