export const SIGNS = [
  { slug: "aries", name: "Áries", element: "fogo" },
  { slug: "touro", name: "Touro", element: "terra" },
  { slug: "gemeos", name: "Gêmeos", element: "ar" },
  { slug: "cancer", name: "Câncer", element: "agua" },
  { slug: "leao", name: "Leão", element: "fogo" },
  { slug: "virgem", name: "Virgem", element: "terra" },
  { slug: "libra", name: "Libra", element: "ar" },
  { slug: "escorpiao", name: "Escorpião", element: "agua" },
  { slug: "sagitario", name: "Sagitário", element: "fogo" },
  { slug: "capricornio", name: "Capricórnio", element: "terra" },
  { slug: "aquario", name: "Aquário", element: "ar" },
  { slug: "peixes", name: "Peixes", element: "agua" },
] as const;

export type SignSlug = (typeof SIGNS)[number]["slug"];
export type ElementId = (typeof SIGNS)[number]["element"];

export const NATAL_POINTS = [
  { id: "sun", label: "Sol" },
  { id: "moon", label: "Lua" },
  { id: "mercury", label: "Mercúrio" },
  { id: "venus", label: "Vênus" },
  { id: "mars", label: "Marte" },
  { id: "jupiter", label: "Júpiter" },
  { id: "saturn", label: "Saturno" },
  { id: "uranus", label: "Urano" },
  { id: "neptune", label: "Netuno" },
  { id: "pluto", label: "Plutão" },
  { id: "chiron", label: "Quíron" },
  { id: "part_of_fortune", label: "Roda da Fortuna" },
  { id: "south_node", label: "Nodo Sul" },
  { id: "north_node", label: "Nodo Norte" },
  { id: "ascendant", label: "Ascendente" },
  { id: "midheaven", label: "Meio do Céu" },
] as const;

export type NatalPointId = (typeof NATAL_POINTS)[number]["id"];

/** Posições que geram ativação. O Ascendente entra nas novas versões; a Fortuna só se a fórmula estiver homologada. */
export const DEFAULT_ACTIVATION_POINTS: NatalPointId[] = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "part_of_fortune",
  "south_node",
  "north_node",
  "ascendant",
];

export function resolvedActivationPoints(input: {
  activationPoints: readonly string[];
  activateAscendant: boolean;
}) {
  const points = input.activationPoints.filter((id) => id !== "ascendant");
  if (input.activateAscendant) points.push("ascendant");
  return points;
}

export const FIRE_SIGN_SLUGS = ["aries", "leao", "sagitario"] as const;

export const DISCLAIMER =
  "Esta experiência é um convite simbólico ao autoconhecimento. Luz e sombra descrevem modos possíveis de expressão, não julgamentos nem diagnósticos. Nenhum código determina destino, saúde, relacionamento ou resultado financeiro.";

export const PROVISIONAL_ASTROLOGY_NOTICE =
  "Zodíaco tropical e casas Placidus são propostas provisórias de implementação. Ainda não são uma decisão homologada pela especialista.";

export function signBySlug(slug: string) {
  return SIGNS.find((sign) => sign.slug === slug) ?? null;
}

export function pointLabel(pointId: string) {
  return NATAL_POINTS.find((point) => point.id === pointId)?.label ?? pointId;
}

export function elementLabel(element: string) {
  const labels: Record<string, string> = {
    fogo: "Fogo",
    terra: "Terra",
    ar: "Ar",
    agua: "Água",
    água: "Água",
  };
  return labels[element] ?? element;
}
