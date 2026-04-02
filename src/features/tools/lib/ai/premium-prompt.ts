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
- Infer the primary audience for the generated app from the clinician request and child context before making visual decisions
- If the app is child-facing, shift the UI toward playful, simple, warm, and high-clarity interaction design with bigger tap targets and more obvious activity structure
- Do not make child-facing apps look like Vocali's therapist dashboard, admin software, or a generic SaaS control panel
- If the app is clinician-facing or caregiver-facing, keep the warmer professional style and operational clarity
- When the request is ambiguous, choose the style that best serves the end user of the generated app rather than the SLP authoring it

Generation profile:
${JSON.stringify(profile, null, 2)}

Child context:
${args.childContext || "No child profile provided."}

Clinician request:
${args.description}

Return an object that strictly matches this schema guidance:
${args.schemaNotes}`;
}
