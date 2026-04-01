// Plain-text schema descriptions sent to Claude for structured output.
// Keep these in sync with the Zod schemas in src/features/tools/lib/templates/*/schema.ts.

export const TEMPLATE_SCHEMA_DESCRIPTIONS: Record<string, string> = {
  aac_board: `
Return a JSON object matching this structure exactly. No markdown, no code block, just raw JSON.
{
  "title": string (1-100 chars),
  "gridCols": integer 2-6,
  "gridRows": integer 1-4,
  "buttons": [
    {
      "id": string (unique short ID, e.g. "1", "2", "3"...),
      "label": string (1-50 chars, what appears on the button),
      "speakText": string (1-200 chars, the phrase spoken aloud when tapped)
    }
  ],
  "showTextLabels": true,
  "autoSpeak": true,
  "voice": "child-friendly",
  "highContrast": false
}
Buttons array: 1-24 items. Keep labels short and child-friendly.
`,
};
