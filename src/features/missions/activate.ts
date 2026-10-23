import { pointLabel } from "@/lib/constants/astrology";
import { formatDegree, signFromLongitude } from "@/features/astrology/longitude";
import { codeForSignDecan, type MissionCode } from "@/features/missions/catalog";

export type ActivationPosition = {
  pointId: string;
  longitude: number;
  houseNumber: number | null;
  retrograde?: boolean | null;
};

export type MissionActivation = {
  id: string;
  natalPointId: string;
  signSlug: string;
  signName: string;
  degreeWithinSign: number;
  houseNumber: number;
  missionCodeId: string;
  methodologyVersion: string;
  longitude: number;
  retrograde: boolean | null;
  code: MissionCode;
  trail: string[];
};

export type ActivationOmission = {
  pointId: string;
  reason: string;
};

export function decanFromDegree(degreeWithinSign: number): 1 | 2 | 3 {
  if (!Number.isFinite(degreeWithinSign) || degreeWithinSign < 0 || degreeWithinSign >= 30) {
    throw new Error("O grau dentro do signo precisa estar no intervalo [0, 30).");
  }
  if (degreeWithinSign < 10) return 1;
  if (degreeWithinSign < 20) return 2;
  return 3;
}

export function activatePositions(input: {
  positions: ActivationPosition[];
  catalog: MissionCode[];
  methodologyVersion: string;
  pointsToActivate: string[];
  fortunaRulePending: boolean;
}): { activations: MissionActivation[]; omissions: ActivationOmission[] } {
  const activations: MissionActivation[] = [];
  const omissions: ActivationOmission[] = [];

  for (const pointId of input.pointsToActivate) {
    if (pointId === "part_of_fortune" && input.fortunaRulePending) {
      omissions.push({
        pointId,
        reason: "A fórmula da Roda da Fortuna ainda não foi homologada. Nenhuma posição foi atribuída.",
      });
      continue;
    }

    const position = input.positions.find((item) => item.pointId === pointId);
    if (!position) {
      omissions.push({ pointId, reason: "O motor não devolveu essa posição." });
      continue;
    }
    if (position.houseNumber === null || position.houseNumber < 1 || position.houseNumber > 12) {
      omissions.push({ pointId, reason: "A casa não está disponível. Nenhuma casa foi presumida." });
      continue;
    }

    const sign = signFromLongitude(position.longitude);
    const decan = decanFromDegree(sign.degreeWithinSign);
    const code = codeForSignDecan(sign.signSlug, decan, input.catalog);
    if (!code) {
      omissions.push({ pointId, reason: `Não há código publicado para ${sign.signSlug} decanato ${decan}.` });
      continue;
    }

    const degreeLabel = formatDegree(sign.degreeWithinSign);
    activations.push({
      id: `ac-${pointId}`,
      natalPointId: pointId,
      signSlug: sign.signSlug,
      signName: sign.signName,
      degreeWithinSign: sign.degreeWithinSign,
      houseNumber: position.houseNumber,
      missionCodeId: code.id,
      methodologyVersion: input.methodologyVersion,
      longitude: position.longitude,
      retrograde: position.retrograde ?? null,
      code,
      trail: [
        pointLabel(pointId),
        `longitude ${position.longitude}`,
        sign.signName,
        `${degreeLabel} no signo`,
        `decanato ${decan}`,
        code.id,
        `casa ${position.houseNumber}`,
      ],
    });
  }

  return { activations, omissions };
}
