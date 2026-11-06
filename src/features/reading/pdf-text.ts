const SIGN_SLUGS = [
  "aries",
  "touro",
  "gemeos",
  "gêmeos",
  "cancer",
  "câncer",
  "leao",
  "leão",
  "virgem",
  "libra",
  "escorpiao",
  "escorpião",
  "sagitario",
  "sagitário",
  "capricornio",
  "capricórnio",
  "aquario",
  "aquário",
  "peixes",
].join("|");

const CODE_ID = new RegExp(`\\b(?:código\\s+)?(?:${SIGN_SLUGS})-\\d+\\b`, "gi");
const ACTIVATION_ID = /\bac-[a-z_]+\b/gi;

export function withoutEmDash(text: string) {
  return text
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*,+/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function stripTechnicalIds(text: string) {
  return text
    .replace(/\bem(?:\s+ac-[a-z_]+)+(?:\s+e\s+ac-[a-z_]+)*\b/gi, "")
    .replace(CODE_ID, "")
    .replace(ACTIVATION_ID, "")
    .replace(/\bem\s+e\b/gi, "")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ",")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

export function sanitizePdfText(text: string) {
  return withoutEmDash(stripTechnicalIds(text));
}
