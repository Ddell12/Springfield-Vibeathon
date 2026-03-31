export interface PlaceOfService {
  code: string;
  description: string;
}

export const PLACES_OF_SERVICE: readonly PlaceOfService[] = [
  { code: "11", description: "Office" },
  { code: "02", description: "Telehealth — Provided to Patient" },
  { code: "10", description: "Telehealth — Patient's Home" },
  { code: "12", description: "Home (in-person visit)" },
] as const;

export function getPosByCode(code: string): PlaceOfService | undefined {
  return PLACES_OF_SERVICE.find((p) => p.code === code);
}

export function getDefaultPos(sessionType: "in-person" | "teletherapy" | "parent-consultation"): string {
  return sessionType === "teletherapy" ? "02" : "11";
}
