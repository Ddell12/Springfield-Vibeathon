// Speech coach must use a speaking model path. The previous "separate-tts"
// configuration disabled Gemini audio output without wiring a TTS provider into
// AgentSession, which left the coach able to hear the user but unable to reply.
export const SPEECH_COACH_REALTIME_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
export const SPEECH_COACH_VOICE_MODE = "native-audio" as const;

const ADVENTURE_CHARACTERS: Record<string, { character: string; world: string }> = {
  dinosaurs: { character: "Rex the Raptor", world: "Dino Valley" },
  ocean: { character: "Pearl the Dolphin", world: "Ocean Reef" },
  space: { character: "Cosmo the Astronaut", world: "Star Station" },
  safari: { character: "Leo the Lion", world: "Safari Land" },
  fairy: { character: "Fern the Fairy", world: "Fairy Forest" },
  farm: { character: "Farmer Lou", world: "Farm Friends" },
  pirates: { character: "Captain Coral", world: "Pirate Cove" },
  superheroes: { character: "Captain Spark", world: "Super City" },
  arctic: { character: "Penny the Penguin", world: "Arctic Expedition" },
  trains: { character: "Chugger the Train", world: "Train Town" },
};

export function buildAdventureSystemPromptAddendum(themeSlug: string): string {
  const { character, world } = ADVENTURE_CHARACTERS[themeSlug] ?? {
    character: "your guide",
    world: "this adventure world",
  };

  return [
    `You are ${character} in ${world}.`,
    "Keep all speech targets natural and embedded in the story — never say 'now practice' or 'say this word'.",
    "Call get_next_word at the start of each round to get the target word.",
    "Embed the target word in a short narrative prompt: e.g. 'The raptor is sleeping! Say his name to wake him up!'",
    "After the child responds, call report_word_result with the word and whether the target sound was produced correctly.",
    "Call signal_state to update the visual display (listen → your_turn → nice_job or try_again).",
    "If the child is quiet for ~8 seconds, offer a fun choice: 'Should we find the rainbow or the river next?'",
    "When a tier unlocks (you'll receive a confirmation), announce it with excitement and a brief narrative celebration.",
  ].join(" ");
}
