import { DISCLAIMER, PROVISIONAL_ASTROLOGY_NOTICE, pointLabel } from "@/lib/constants/astrology";
import { formatDegree } from "@/features/astrology/longitude";
import type { NatalChartView } from "@/features/astrology/wheel";
import type { MissionActivation } from "@/features/missions/activate";
import { cardArtDisplayUrl } from "@/features/missions/card-art";

export type ChartAngle = {
  signName: string;
  degreeWithinSign: number;
} | null;

export type PreparedChart = {
  status: "not_configured" | "license_unconfirmed" | "pending" | "calculating" | "complete" | "failed";
  errorCode: string | null;
  cityLabel: string;
  localDate: string;
  localTime: string;
  timezone: string;
  rulesValidated: boolean;
  freePointId: string;
  ascendant: ChartAngle;
  midheaven: ChartAngle;
  activations: MissionActivation[];
  chart: NatalChartView | null;
  entitlement: "none" | "active" | "refund_pending_policy";
  priceCents: number | null;
  currency: string;
  productName: string | null;
};

export type FreePreview = {
  status: PreparedChart["status"];
  errorCode: string | null;
  birth: { cityLabel: string; localDate: string; localTime: string; timezone: string };
  notice: string;
  disclaimer: string;
  freeActivation: null | {
    pointId: string;
    pointLabel: string;
    signName: string;
    degreeLabel: string;
    houseNumber: number;
    archetype: string;
    keyword: string;
    decan: 1 | 2 | 3;
    decanRuler: string;
    light: string;
    shadow: string;
    imageUrl: string | null;
    element: string | null;
  };
  ascendant: null | { signName: string; degreeLabel: string };
  midheaven: null | { signName: string; degreeLabel: string };
  otherActivationCount: number | null;
  chart: NatalChartView | null;
  entitlement: PreparedChart["entitlement"];
  price: null | { cents: number; currency: string; productName: string };
};

const ELEMENTS: Record<string, string> = {
  aries: "fogo",
  leao: "fogo",
  sagitario: "fogo",
  touro: "terra",
  virgem: "terra",
  capricornio: "terra",
  gemeos: "ar",
  libra: "ar",
  aquario: "ar",
  cancer: "agua",
  escorpiao: "agua",
  peixes: "agua",
};

export function toFreePreview(chart: PreparedChart): FreePreview {
  const free = chart.activations.find((item) => item.natalPointId === chart.freePointId) ?? null;
  const others = chart.activations.filter((item) => item.natalPointId !== chart.freePointId);
  return {
    status: chart.status,
    errorCode: chart.errorCode,
    birth: {
      cityLabel: chart.cityLabel,
      localDate: chart.localDate,
      localTime: chart.localTime,
      timezone: chart.timezone,
    },
    notice: chart.rulesValidated ? "" : PROVISIONAL_ASTROLOGY_NOTICE,
    disclaimer: DISCLAIMER,
    freeActivation: free
      ? {
          pointId: free.natalPointId,
          pointLabel: pointLabel(free.natalPointId),
          signName: free.signName,
          degreeLabel: formatDegree(free.degreeWithinSign),
          houseNumber: free.houseNumber,
          archetype: free.code.archetype,
          keyword: free.code.keyword,
          decan: free.code.decan,
          decanRuler: free.code.decanRuler,
          light: free.code.light,
          shadow: free.code.shadow,
          imageUrl: cardArtDisplayUrl(free.code.id, free.code.imageUrl),
          element: ELEMENTS[free.signSlug] ?? null,
        }
      : null,
    ascendant: chart.ascendant
      ? { signName: chart.ascendant.signName, degreeLabel: formatDegree(chart.ascendant.degreeWithinSign) }
      : null,
    midheaven: chart.midheaven
      ? { signName: chart.midheaven.signName, degreeLabel: formatDegree(chart.midheaven.degreeWithinSign) }
      : null,
    otherActivationCount: chart.status === "complete" ? others.length : null,
    chart: chart.chart,
    entitlement: chart.entitlement,
    price:
      chart.priceCents !== null && chart.productName
        ? { cents: chart.priceCents, currency: chart.currency, productName: chart.productName }
        : null,
  };
}
