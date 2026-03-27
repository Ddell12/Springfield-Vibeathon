interface ActivityEvent {
  event: string;
  type?: string;
  message?: string;
  status?: string;
  label?: string;
  text?: string;
}

export function mapActivityToUserMessage(evt: ActivityEvent): string | null {
  if (evt.event === "activity") {
    switch (evt.type) {
      case "thinking":
        if (evt.message?.includes("Almost ready")) return "Almost there...";
        if (evt.message?.includes("Understanding")) return "Reading your description...";
        return "Working on your app...";
      case "writing_file":
      case "file_written":
        return null;
      case "complete":
        if (evt.message?.startsWith("Build failed")) return null;
        return "Your app is ready!";
      default:
        return null;
    }
  }
  if (evt.event === "status") {
    if (evt.status === "bundling") return "Putting everything together...";
    return null;
  }
  if (evt.event === "image_generated") return "Creating pictures for your app...";
  if (evt.event === "speech_generated") return "Recording friendly voices...";
  if (evt.event === "stt_enabled") return "Voice input is ready!";
  return null;
}
