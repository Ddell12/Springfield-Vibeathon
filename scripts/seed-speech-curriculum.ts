/**
 * One-time script to upload speech curriculum to ElevenLabs knowledge base.
 *
 * Usage: npx tsx scripts/seed-speech-curriculum.ts
 *
 * Requires: ELEVENLABS_API_KEY in .env.local
 *           ELEVENLABS_AGENT_ID in .env.local (or pass as CLI arg)
 */

import {
  ENGAGEMENT_RECOVERY,
  SESSION_OPENERS,
  SOUND_EXERCISES,
  TRANSITION_PHRASES,
  WIND_DOWN_SCRIPTS,
} from "../src/features/speech-coach/lib/curriculum-data";

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID ?? process.argv[2];

  if (!apiKey) {
    console.error("Missing ELEVENLABS_API_KEY in .env.local");
    process.exit(1);
  }
  if (!agentId) {
    console.error(
      "Missing ELEVENLABS_AGENT_ID — set in .env.local or pass as CLI arg",
    );
    process.exit(1);
  }

  // Compile curriculum into a structured text document
  let doc = "# Speech Therapy Exercise Curriculum\n\n";
  doc +=
    "Use these exercises when coaching children on speech sounds.\n\n";

  for (const exercise of SOUND_EXERCISES) {
    doc += `## ${exercise.sound}\n\n`;
    doc += `**Articulation Cue:** ${exercise.articulationCue}\n\n`;
    doc += `### Ages 2-4\n`;
    doc += `- Beginner words: ${exercise.ages24.beginnerWords.join(", ")}\n`;
    doc += `- Modeling script: ${exercise.ages24.modelingScript}\n`;
    doc += `- Praise: ${exercise.ages24.praiseVariants.join(" | ")}\n\n`;
    doc += `### Ages 5-7\n`;
    doc += `- Beginner words: ${exercise.ages57.beginnerWords.join(", ")}\n`;
    doc += `- Intermediate words: ${exercise.ages57.intermediateWords.join(", ")}\n`;
    doc += `- Advanced phrases: ${exercise.ages57.advancedPhrases.join(" | ")}\n`;
    doc += `- Modeling script: ${exercise.ages57.modelingScript}\n\n`;
  }

  doc += "## Session Management\n\n";
  doc += `### Openers\n${SESSION_OPENERS.join("\n")}\n\n`;
  doc += `### Transitions\n${TRANSITION_PHRASES.join("\n")}\n\n`;
  doc += `### Wind-down\n${WIND_DOWN_SCRIPTS.join("\n")}\n\n`;
  doc += `### Engagement Recovery\n${ENGAGEMENT_RECOVERY.join("\n")}\n`;

  console.log(`Compiled curriculum: ${doc.length} characters`);

  // Upload as knowledge base document
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([doc], { type: "text/plain" }),
    "speech-curriculum.txt",
  );

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agentId}/add-to-knowledge-base`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: formData,
    },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(`Upload failed (${response.status}):`, body);
    process.exit(1);
  }

  console.log("Curriculum uploaded successfully!");
}

main().catch(console.error);
