export interface CptCode {
  code: string;
  description: string;
  defaultPos: string;
}

export const CPT_CODES: readonly CptCode[] = [
  { code: "92507", description: "individual speech/language/voice treatment", defaultPos: "11" },
  { code: "92508", description: "Group speech/language treatment (2+ patients)", defaultPos: "11" },
  { code: "92521", description: "Evaluation — speech fluency only", defaultPos: "11" },
  { code: "92522", description: "Evaluation — speech sound production only", defaultPos: "11" },
  { code: "92523", description: "Evaluation — speech sound + language", defaultPos: "11" },
  { code: "92524", description: "Voice/resonance behavioral analysis", defaultPos: "11" },
  { code: "92526", description: "Treatment of swallowing dysfunction", defaultPos: "11" },
  { code: "92597", description: "AAC device evaluation", defaultPos: "11" },
  { code: "92609", description: "AAC device service/programming", defaultPos: "11" },
] as const;

export function getCptByCode(code: string): CptCode | undefined {
  return CPT_CODES.find((c) => c.code === code);
}

export function getDefaultCptCode(): string {
  return "92507";
}
