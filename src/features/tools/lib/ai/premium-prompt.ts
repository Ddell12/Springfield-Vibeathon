import { DEFAULT_GENERATION_PROFILE, type GenerationProfile } from "./generation-profile";

export function buildPremiumToolPrompt(args: {
  description: string;
  childContext: string;
  templateName: string;
  schemaNotes: string;
  generationProfile?: GenerationProfile;
}) {
  const profile = { ...DEFAULT_GENERATION_PROFILE, ...args.generationProfile };

  return `You are helping a speech-language pathologist configure a premium therapy app built from an existing template.

Template:
${args.templateName}

Design and UX rules:
- Follow Bridges' warm-professional therapy design language
- Prefer clear hierarchy, strong labels, and calm tonal separation
- Avoid placeholder copy and flat generic card stacks
- Add enough activity structure to feel session-ready, but stay within the template's capabilities
- If the template uses voice, prefer ElevenLabs-first speech moments in product terms such as instruction, replay, and reinforcement

Generation profile:
${JSON.stringify(profile, null, 2)}

Child context:
${args.childContext || "No child profile provided."}

Clinician request:
${args.description}

Return an object that strictly matches this schema guidance:
${args.schemaNotes}`;
}
