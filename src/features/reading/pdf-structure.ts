import { pointLabel, sortByNatalPoint } from "@/lib/constants/astrology";
import type { MissionActivation } from "@/features/missions/activate";
import { officialCatalog } from "@/features/missions/catalog";

const FEMININE_POINTS = new Set(["moon", "venus", "part_of_fortune"]);

export const PDF_POINT_GROUPS = [
  { id: "luminaries", label: "Luminares e Ascendente", pointIds: ["sun", "moon", "ascendant"] },
  {
    id: "planets",
    label: "Planetas e Quíron",
    pointIds: ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"],
  },
  { id: "mathematical", label: "Pontos matemáticos", pointIds: ["south_node", "north_node", "part_of_fortune"] },
] as const;

export type UniquePdfCode = {
  missionCodeId: string;
  number: number;
  archetype: string;
  keyword: string;
  activations: MissionActivation[];
};

export function orderedActivations(activations: readonly MissionActivation[]) {
  return sortByNatalPoint(activations, (item) => item.natalPointId);
}

export function codeNumber(activation: MissionActivation) {
  return officialCatalog.find((item) => item.id === activation.missionCodeId)?.number ?? activation.code.number;
}

export function formatCodeNumber(number: number) {
  return String(number).padStart(2, "0");
}

export function activationLead(activation: MissionActivation) {
  const feminine = FEMININE_POINTS.has(activation.natalPointId);
  const determiner = feminine ? "Sua" : "Seu";
  const verb = feminine ? "é ativada" : "é ativado";
  return `${determiner} ${pointLabel(activation.natalPointId)} ${verb} pelo código número ${formatCodeNumber(codeNumber(activation))} ${activation.code.archetype}.`;
}

export function uniqueCodes(activations: readonly MissionActivation[]): UniquePdfCode[] {
  const ordered = orderedActivations(activations);
  const groups = new Map<string, UniquePdfCode>();
  for (const activation of ordered) {
    const existing = groups.get(activation.missionCodeId);
    if (existing) {
      existing.activations.push(activation);
      continue;
    }
    groups.set(activation.missionCodeId, {
      missionCodeId: activation.missionCodeId,
      number: codeNumber(activation),
      archetype: activation.code.archetype,
      keyword: activation.code.keyword,
      activations: [activation],
    });
  }
  return [...groups.values()];
}

export function groupedActivations(activations: readonly MissionActivation[]) {
  const ordered = orderedActivations(activations);
  return PDF_POINT_GROUPS.map((group) => ({
    ...group,
    activations: ordered.filter((item) => (group.pointIds as readonly string[]).includes(item.natalPointId)),
  })).filter((group) => group.activations.length > 0);
}

export function joinPt(items: readonly string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}
