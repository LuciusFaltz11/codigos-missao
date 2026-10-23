export type VerifiedPattern = {
  patternId: string;
  kind: "code_repeated" | "house_concentration" | "node_axis";
  activationIds: string[];
  codeIds: string[];
};

type PatternSource = {
  id: string;
  missionCodeId: string;
  houseNumber: number;
  natalPointId: string;
};

export function derivePatterns(activations: PatternSource[]): VerifiedPattern[] {
  const patterns: VerifiedPattern[] = [];

  const byCode = new Map<string, PatternSource[]>();
  const byHouse = new Map<number, PatternSource[]>();
  for (const activation of activations) {
    const codes = byCode.get(activation.missionCodeId) ?? [];
    codes.push(activation);
    byCode.set(activation.missionCodeId, codes);
    const houses = byHouse.get(activation.houseNumber) ?? [];
    houses.push(activation);
    byHouse.set(activation.houseNumber, houses);
  }

  for (const [codeId, group] of byCode) {
    if (group.length < 2) continue;
    patterns.push({
      patternId: `code:${codeId}`,
      kind: "code_repeated",
      activationIds: group.map((item) => item.id),
      codeIds: [codeId],
    });
  }

  for (const [house, group] of byHouse) {
    if (group.length < 2) continue;
    patterns.push({
      patternId: `house:${house}`,
      kind: "house_concentration",
      activationIds: group.map((item) => item.id),
      codeIds: [...new Set(group.map((item) => item.missionCodeId))],
    });
  }

  const south = activations.find((item) => item.natalPointId === "south_node");
  const north = activations.find((item) => item.natalPointId === "north_node");
  if (south && north) {
    patterns.push({
      patternId: "nodes:axis",
      kind: "node_axis",
      activationIds: [south.id, north.id],
      codeIds: [south.missionCodeId, north.missionCodeId],
    });
  }

  return patterns;
}
