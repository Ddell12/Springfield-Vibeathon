const E2E_MIC_BYPASS_ENABLED = "1";

export function shouldBypassSpeechCoachMicrophoneCheck() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_E2E_BYPASS_MIC_CHECK === E2E_MIC_BYPASS_ENABLED
  );
}
