// AdventureSessionEngine — runs inside the LiveKit worker process (Node.js).
// Tracks rolling accuracy, adapts difficulty, and accumulates the session word log.

import { ConvexHttpClient } from "convex/browser";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type Tier = "word" | "phrase" | "sentence";
const TIER_ORDER: Tier[] = ["word", "phrase", "sentence"];

type AdventureWord = {
  _id: string;
  themeSlug: string;
  targetSound: string;
  tier: Tier;
  content: string;
  imagePrompt: string;
  difficulty: number;
};

type WordLogEntry = {
  content: string;
  tier: Tier;
  correct: boolean;
  timestamp: number;
};

export type AdaptationEvent =
  | { type: "advance_difficulty"; newDifficulty: number }
  | { type: "retreat_difficulty"; newDifficulty: number }
  | { type: "tier_unlock"; newTier: Tier; previousTier: Tier };

type EngineConfig = {
  patientId: string;
  themeSlug: string;
  targetSounds: string[];
  convexUrl: string;
  runtimeSecret: string;
};

export class AdventureSessionEngine {
  private readonly config: EngineConfig;
  private readonly convex: ConvexHttpClient;

  private currentTier: Tier = "word";
  private currentDifficulty = 1;
  private startTier: Tier = "word";

  private wordBatch: AdventureWord[] = [];
  private wordIndex = 0;

  // Rolling window: last N outcomes (true=correct, false=incorrect)
  private rollingWindow: boolean[] = [];

  private wordLog: WordLogEntry[] = [];

  constructor(config: EngineConfig) {
    this.config = config;
    this.convex = new ConvexHttpClient(config.convexUrl);
  }

  async initialize(): Promise<void> {
    // Query existing progress for the first targetSound to determine starting tier/difficulty
    const targetSound = this.config.targetSounds[0];
    if (!targetSound) return;

    try {
      const progress = await this.convex.query(api.adventure_progress.getProgress, {
        patientId: this.config.patientId as Id<"patients">,
        themeSlug: this.config.themeSlug,
      });

      // Find most advanced unlocked tier for this sound
      const soundProgress = progress.filter((p) => p.targetSound === targetSound);
      const unlockedTiers = soundProgress.filter((p) => p.unlockedAt != null);

      if (unlockedTiers.length > 0) {
        // Resume from next tier after highest unlocked
        const highestUnlocked = unlockedTiers.reduce((a, b) => {
          return TIER_ORDER.indexOf(a.tier) >= TIER_ORDER.indexOf(b.tier) ? a : b;
        });
        const nextIdx = TIER_ORDER.indexOf(highestUnlocked.tier) + 1;
        this.currentTier = TIER_ORDER[nextIdx] ?? "sentence";
      } else {
        // Start fresh or resume in-progress tier
        const inProgress = soundProgress
          .filter((p) => p.masteryPct > 0)
          .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
        if (inProgress.length > 0) {
          this.currentTier = inProgress[inProgress.length - 1].tier;
        }
      }
    } catch {
      // First-time player or network issue — start at word/1
    }

    this.startTier = this.currentTier;
    await this.loadBatch();
  }

  async getNextWord(): Promise<AdventureWord | null> {
    if (this.wordIndex >= this.wordBatch.length) {
      await this.loadBatch();
      if (this.wordBatch.length === 0) return null;
    }
    const word = this.wordBatch[this.wordIndex];
    this.wordIndex++;
    return word ?? null;
  }

  async recordAttempt(content: string, correct: boolean): Promise<AdaptationEvent | null> {
    this.wordLog.push({ content, tier: this.currentTier, correct, timestamp: Date.now() });

    this.rollingWindow.push(correct);
    if (this.rollingWindow.length > 5) {
      this.rollingWindow.shift();
    }

    const accuracy = this.rollingWindow.filter(Boolean).length / this.rollingWindow.length;

    if (this.rollingWindow.length >= 5 && accuracy >= 0.8) {
      return await this.advanceDifficulty();
    }

    if (this.rollingWindow.length >= 3 && accuracy < 0.4) {
      return await this.retreatDifficulty();
    }

    return null;
  }

  getCurrentTier(): Tier {
    return this.currentTier;
  }

  getCurrentDifficulty(): number {
    return this.currentDifficulty;
  }

  /**
   * Force a difficulty retreat — called when the caregiver taps Boost.
   * Behaves identically to the automatic retreat triggered by low rolling accuracy.
   */
  async requestBoost(): Promise<AdaptationEvent> {
    return this.retreatDifficulty();
  }

  buildSessionPayload() {
    const correct = this.wordLog.filter((e) => e.correct).length;
    return {
      themeSlug: this.config.themeSlug,
      targetSounds: this.config.targetSounds,
      startTier: this.startTier,
      endTier: this.currentTier,
      totalAttempts: this.wordLog.length,
      correctAttempts: correct,
      wordLog: this.wordLog,
    };
  }

  private async advanceDifficulty(): Promise<AdaptationEvent> {
    this.rollingWindow = [];
    if (this.currentDifficulty < 5) {
      this.currentDifficulty++;
      await this.loadBatch();
      return { type: "advance_difficulty", newDifficulty: this.currentDifficulty };
    }

    // Tier boundary
    const currentIdx = TIER_ORDER.indexOf(this.currentTier);
    const previousTier = this.currentTier;

    if (currentIdx < TIER_ORDER.length - 1) {
      this.currentTier = TIER_ORDER[currentIdx + 1]!;
      this.currentDifficulty = 1;
      await this.loadBatch();
      return { type: "tier_unlock", newTier: this.currentTier, previousTier };
    }

    // Already at sentence/5 — stay
    return { type: "advance_difficulty", newDifficulty: this.currentDifficulty };
  }

  private async retreatDifficulty(): Promise<AdaptationEvent> {
    this.rollingWindow = [];
    if (this.currentDifficulty > 1) {
      this.currentDifficulty--;
    }
    await this.loadBatch();
    return { type: "retreat_difficulty", newDifficulty: this.currentDifficulty };
  }

  private async loadBatch(): Promise<void> {
    const targetSound = this.config.targetSounds[0];
    if (!targetSound) {
      this.wordBatch = [];
      return;
    }

    try {
      const batch = await this.convex.query(api.adventure_words.getWordBatch, {
        themeSlug: this.config.themeSlug,
        targetSound,
        tier: this.currentTier,
        difficulty: this.currentDifficulty,
      });
      this.wordBatch = batch as AdventureWord[];
      this.wordIndex = 0;
    } catch (err) {
      console.warn("[adventure-engine] loadBatch failed:", err);
      this.wordBatch = [];
    }
  }
}
