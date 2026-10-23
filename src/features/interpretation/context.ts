import type { MissionCode } from "@/features/missions/catalog";
import type { MissionActivation } from "@/features/missions/activate";
import type { VerifiedPattern } from "@/features/missions/patterns";

export type GlossaryEntry = {
  id: string;
  title: string;
  summary: string;
  published: boolean;
};

export type MethodologySnapshot = {
  versionLabel: string;
  status: "provisional" | "published";
  rulesValidated: boolean;
  zodiac: "tropical" | "sidereal";
  houseSystem: "placidus" | "whole_sign";
  nodeMode: "true" | "mean";
  fortunaRule: "pending_approval" | "day_night_traditional";
  activateAscendant: boolean;
  freePreviewPoint: string;
  activationPoints: string[];
  codes: MissionCode[];
  houses: GlossaryEntry[];
  points: GlossaryEntry[];
  notice: string;
};

export type InterpretationActivation = {
  activation_id: string;
  point: string;
  point_label: string;
  sign: string;
  degree_within_sign: number;
  house: number;
  code: {
    id: string;
    archetype: string;
    keyword: string;
    light: string;
    shadow: string;
    decan_ruler: string;
  };
  point_meaning: string;
  house_meaning: string;
};

export type InterpretationContext = {
  language: "pt-BR";
  methodology_version: string;
  chart_calculation_version: string;
  audience: string;
  activations: InterpretationActivation[];
  verified_patterns: Array<{
    pattern_id: string;
    kind: VerifiedPattern["kind"];
    activation_ids: string[];
  }>;
};

export function buildInterpretationContext(input: {
  snapshot: MethodologySnapshot;
  activations: MissionActivation[];
  patterns: VerifiedPattern[];
  calculationVersion: string;
}): { ok: true; context: InterpretationContext } | { ok: false; reason: string } {
  if (input.snapshot.status !== "published") {
    return { ok: false, reason: "methodology_not_published" };
  }
  const activations: InterpretationActivation[] = [];
  for (const activation of input.activations) {
    const point = input.snapshot.points.find((item) => item.id === activation.natalPointId);
    const house = input.snapshot.houses.find((item) => item.id === String(activation.houseNumber));
    if (!point?.published || !point.summary.trim() || !house?.published || !house.summary.trim()) {
      return { ok: false, reason: "editorial_not_published" };
    }
    activations.push({
      activation_id: activation.id,
      point: activation.natalPointId,
      point_label: point.title,
      sign: activation.signSlug,
      degree_within_sign: activation.degreeWithinSign,
      house: activation.houseNumber,
      code: {
        id: activation.code.id,
        archetype: activation.code.archetype,
        keyword: activation.code.keyword,
        light: activation.code.light,
        shadow: activation.code.shadow,
        decan_ruler: activation.code.decanRuler,
      },
      point_meaning: point.summary,
      house_meaning: house.summary,
    });
  }
  return {
    ok: true,
    context: {
      language: "pt-BR",
      methodology_version: input.snapshot.versionLabel,
      chart_calculation_version: input.calculationVersion,
      audience: "mulheres adultas",
      activations,
      verified_patterns: input.patterns.map((pattern) => ({
        pattern_id: pattern.patternId,
        kind: pattern.kind,
        activation_ids: pattern.activationIds,
      })),
    },
  };
}
