export interface GenerationProfile {
  targetSetting?: "clinic" | "home" | "both";
  interactionRichness?: "standard" | "high";
  voicePreference?: "elevenlabs-first";
  sensoryMode?: "calm" | "energetic";
}

export const DEFAULT_GENERATION_PROFILE: Required<GenerationProfile> = {
  targetSetting: "both",
  interactionRichness: "high",
  voicePreference: "elevenlabs-first",
  sensoryMode: "calm",
};
