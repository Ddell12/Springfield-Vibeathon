const TEMPLATE_NAMES: Record<string, string> = {
  aac_board: "AAC Communication Board",
  first_then_board: "First / Then Board",
  token_board: "Token Board",
  visual_schedule: "Visual Schedule",
  matching_game: "Matching Game",
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} min ${secs} sec`;
}

export interface SessionNoteEvent {
  type: string;
  payloadJson?: string;
  timestamp: number;
}

export function formatSessionNote(args: {
  toolTitle: string;
  templateType: string;
  durationSeconds: number;
  events: SessionNoteEvent[];
  goalTags?: string[];
}): string {
  const { toolTitle, templateType, durationSeconds, events, goalTags } = args;
  const templateName = TEMPLATE_NAMES[templateType] ?? templateType;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const completions = events.filter((e) => e.type === "activity_completed").length;
  const totalInteractions = events.length;

  const lines = [
    `Session date: ${today}`,
    `Tool: ${toolTitle} (${templateName})`,
    `Duration: ${formatDuration(durationSeconds)}`,
    `Data: ${totalInteractions} total interactions · ${completions} completion${completions !== 1 ? "s" : ""}`,
  ];

  if (goalTags && goalTags.length > 0) {
    lines.push(`Goal tags: ${goalTags.join(", ")}`);
  }

  lines.push("Notes: ");

  return lines.join("\n");
}
