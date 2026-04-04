import { TEMPLATE_DESIGN_RULES } from "../component-registry";
import { DEFAULT_GENERATION_PROFILE, type GenerationProfile } from "./generation-profile";

export function buildPremiumToolPrompt(args: {
  description: string;
  childContext: string;
  templateName: string;
  schemaNotes: string;
  generationProfile?: GenerationProfile;
}) {
  const profile = { ...DEFAULT_GENERATION_PROFILE, ...args.generationProfile };

  const rulesSection = TEMPLATE_DESIGN_RULES.map(
    (r) => `- ${r.rule} (${r.rationale})`
  ).join("\n");

  return `You are helping a speech-language pathologist configure a therapy app for a child.
The child may be autistic or have a communication disorder. Apply the design rules
below unconditionally — they are not suggestions.

## Child & Autism-Friendly Design Rules
${rulesSection}

Template:
${args.templateName}

Generation profile:
${JSON.stringify(profile, null, 2)}

Child context:
${args.childContext || "No child profile provided."}

Clinician request:
${args.description}

Return an object that strictly matches this schema guidance:
${args.schemaNotes}`;
}
