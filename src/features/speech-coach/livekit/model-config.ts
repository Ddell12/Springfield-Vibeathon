// Speech coach must use a speaking model path. The previous "separate-tts"
// configuration disabled Gemini audio output without wiring a TTS provider into
// AgentSession, which left the coach able to hear the user but unable to reply.
export const SPEECH_COACH_REALTIME_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
export const SPEECH_COACH_VOICE_MODE = "native-audio" as const;
