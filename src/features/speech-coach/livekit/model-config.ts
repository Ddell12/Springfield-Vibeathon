// Separate-TTS architecture (ElevenLabs selectable voices) requires a
// non-native-audio Gemini model. The native-audio preview model cannot be
// combined with a separate TTS provider — docs confirm this is an open
// Google SDK limitation. If we later switch to native audio output, flip
// SPEECH_COACH_VOICE_MODE to "native-audio" AND change the model to
// "gemini-2.5-flash-native-audio-preview-12-2025".
export const SPEECH_COACH_REALTIME_MODEL = "gemini-2.5-flash";
export const SPEECH_COACH_VOICE_MODE: "native-audio" | "separate-tts" = "separate-tts";
