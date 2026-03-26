/**
 * Shared SSE chunk parser used by all streaming hooks.
 * Splits raw SSE text into typed event objects.
 */
export function parseSSEChunks(text: string): Array<{ event: string; data: unknown }> {
  const events: Array<{ event: string; data: unknown }> = [];
  const chunks = text.split("\n\n");
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const lines = chunk.split("\n");
    let eventType = "";
    let dataLine = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice("event: ".length).trim();
      } else if (line.startsWith("data: ")) {
        dataLine = line.slice("data: ".length).trim();
      }
    }
    if (eventType && dataLine) {
      try {
        events.push({ event: eventType, data: JSON.parse(dataLine) });
      } catch {
        // Ignore malformed JSON
      }
    }
  }
  return events;
}
