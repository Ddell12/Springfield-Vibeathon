export interface ICD10Code {
  code: string;
  description: string;
  category: string;
}

export const ICD10_CODES: ICD10Code[] = [
  // Articulation / Phonological
  { code: "F80.0", description: "Phonological disorder", category: "articulation" },
  { code: "F80.89", description: "Other developmental disorders of speech and language", category: "articulation" },
  { code: "R47.1", description: "Dysarthria and anarthria", category: "articulation" },
  { code: "Q38.1", description: "Ankyloglossia (tongue-tie)", category: "articulation" },
  { code: "R47.89", description: "Other speech disturbances", category: "articulation" },

  // Language — Receptive
  { code: "F80.2", description: "Mixed receptive-expressive language disorder", category: "language-receptive" },
  { code: "R47.02", description: "Dysphasia", category: "language-receptive" },
  { code: "R48.2", description: "Apraxia, unspecified", category: "language-receptive" },
  { code: "F80.4", description: "Speech and language development delay due to hearing loss", category: "language-receptive" },

  // Language — Expressive
  { code: "F80.1", description: "Expressive language disorder", category: "language-expressive" },
  { code: "F80.9", description: "Developmental disorder of speech and language, unspecified", category: "language-expressive" },
  { code: "R47.01", description: "Aphasia", category: "language-expressive" },

  // Fluency
  { code: "F80.81", description: "Childhood onset fluency disorder (stuttering)", category: "fluency" },
  { code: "F98.5", description: "Adult onset fluency disorder", category: "fluency" },
  { code: "R47.82", description: "Fluency disorder in conditions classified elsewhere", category: "fluency" },

  // Voice
  { code: "J38.3", description: "Other diseases of vocal cords", category: "voice" },
  { code: "R49.0", description: "Dysphonia", category: "voice" },
  { code: "R49.1", description: "Aphonia", category: "voice" },
  { code: "R49.8", description: "Other voice and resonance disorders", category: "voice" },
  { code: "J38.00", description: "Paralysis of vocal cords and larynx, unspecified", category: "voice" },
  { code: "J38.01", description: "Paralysis of vocal cords and larynx, unilateral", category: "voice" },
  { code: "J38.02", description: "Paralysis of vocal cords and larynx, bilateral", category: "voice" },

  // Pragmatic / Social
  { code: "R48.8", description: "Other symbolic dysfunctions (pragmatic language)", category: "pragmatic-social" },
  { code: "F84.0", description: "Autistic disorder", category: "pragmatic-social" },
  { code: "F84.5", description: "Asperger syndrome", category: "pragmatic-social" },
  { code: "F84.9", description: "Pervasive developmental disorder, unspecified", category: "pragmatic-social" },
  { code: "F80.82", description: "Social pragmatic communication disorder", category: "pragmatic-social" },

  // AAC
  { code: "R47.8", description: "Other speech disturbances (AAC candidacy)", category: "aac" },
  { code: "R41.840", description: "Attention and concentration deficit", category: "aac" },

  // Feeding / Swallowing
  { code: "R13.10", description: "Dysphagia, unspecified", category: "feeding" },
  { code: "R13.11", description: "Dysphagia, oral phase", category: "feeding" },
  { code: "R13.12", description: "Dysphagia, oropharyngeal phase", category: "feeding" },
  { code: "R13.13", description: "Dysphagia, pharyngeal phase", category: "feeding" },
  { code: "R13.14", description: "Dysphagia, pharyngoesophageal phase", category: "feeding" },
  { code: "R13.19", description: "Other dysphagia", category: "feeding" },
  { code: "R63.3", description: "Feeding difficulties", category: "feeding" },
  { code: "F98.29", description: "Other feeding disorders of infancy and early childhood", category: "feeding" },
  { code: "P92.9", description: "Feeding problem of newborn, unspecified", category: "feeding" },

  // General / Cross-domain
  { code: "R41.0", description: "Disorientation, unspecified", category: "language-receptive" },
  { code: "R48.0", description: "Dyslexia and alexia", category: "language-receptive" },
  { code: "Z13.4", description: "Encounter for screening for developmental delays", category: "language-expressive" },
  { code: "Z87.890", description: "Personal history of other speech and language disorders", category: "language-expressive" },
  { code: "G31.01", description: "Pick disease (language variant dementia)", category: "language-expressive" },
  { code: "I69.320", description: "Aphasia following cerebral infarction", category: "language-expressive" },
  { code: "I69.321", description: "Dysphasia following cerebral infarction", category: "language-expressive" },
  { code: "I69.328", description: "Other speech and language deficits following cerebral infarction", category: "language-expressive" },
  { code: "R13.0", description: "Aphagia", category: "feeding" },
  { code: "R48.1", description: "Agnosia", category: "language-receptive" },
];

/** Search ICD-10 codes by query string (matches code or description). */
export function searchICD10(query: string): ICD10Code[] {
  const q = query.toLowerCase().trim();
  if (q.length === 0) return ICD10_CODES;
  return ICD10_CODES.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
  );
}

/** Filter ICD-10 codes by therapy domain category. */
export function filterICD10ByCategory(category: string): ICD10Code[] {
  return ICD10_CODES.filter((c) => c.category === category);
}
