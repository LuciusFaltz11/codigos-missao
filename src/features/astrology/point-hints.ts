import { NATAL_POINTS, type NatalPointId } from "@/lib/constants/astrology";

/** Legenda curta dos glifos. Não substitui o texto editorial das ativações. */
export const POINT_HINTS: Record<NatalPointId, string> = {
  sun: "Identidade consciente e o que se busca expressar.",
  moon: "Emoção, necessidade, cuidado e hábitos.",
  mercury: "Pensamento, interpretação e comunicação.",
  venus: "Valor, afeto e a capacidade de criar vínculo.",
  mars: "Ação, vontade e a força de conquistar.",
  jupiter: "Expansão, confiança e busca de sentido.",
  saturn: "Limite, responsabilidade e o que se constrói com tempo.",
  uranus: "Liberdade, ruptura e individuação.",
  neptune: "Imaginação, sensibilidade e discernimento.",
  pluto: "Poder, sombra e regeneração simbólica.",
  chiron: "Vulnerabilidade que pode virar compreensão.",
  part_of_fortune: "Satisfação simbólica. Não é garantia de sorte.",
  south_node: "Hábitos e a zona de conforto já conhecida.",
  north_node: "Direção de uma aprendizagem ainda por desenvolver.",
  ascendant: "A primeira lente com que o mapa encontra o mundo.",
  midheaven: "A contribuição visível e a direção pública.",
};

export function pointHint(pointId: string) {
  return POINT_HINTS[pointId as NatalPointId] ?? "";
}

export function everyPointHasHint() {
  return NATAL_POINTS.every((point) => POINT_HINTS[point.id].trim().length > 0);
}
