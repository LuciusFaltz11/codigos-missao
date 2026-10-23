import { NATAL_POINTS, type NatalPointId } from "@/lib/constants/astrology";

/** Legenda curta dos glifos. Não substitui o texto editorial das ativações. */
export const POINT_HINTS: Record<NatalPointId, string> = {
  sun: "Identidade e o que se busca expressar.",
  moon: "Emoção, necessidade e cuidado.",
  mercury: "Pensamento, linguagem e troca.",
  venus: "Afeto, valor e prazer.",
  mars: "Ação, vontade e iniciativa.",
  jupiter: "Expansão, confiança e sentido.",
  saturn: "Limite, responsabilidade e estrutura.",
  uranus: "Liberdade e mudança de padrão.",
  neptune: "Imaginação, sensibilidade e ideal.",
  pluto: "Transformação e regeneração.",
  chiron: "Vulnerabilidade que pode virar compreensão.",
  part_of_fortune: "Satisfação simbólica. Não é garantia de sorte.",
  south_node: "Hábitos e caminhos já conhecidos.",
  north_node: "Direção de uma aprendizagem nova.",
  ascendant: "A primeira lente com que o mapa encontra o mundo.",
  midheaven: "A contribuição visível e a direção pública.",
};

export function pointHint(pointId: string) {
  return POINT_HINTS[pointId as NatalPointId] ?? "";
}

export function everyPointHasHint() {
  return NATAL_POINTS.every((point) => POINT_HINTS[point.id].trim().length > 0);
}
