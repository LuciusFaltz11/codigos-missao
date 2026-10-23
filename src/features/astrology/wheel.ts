import { houseNumberForLongitude } from "@/features/astrology/houses";
import { formatDegree, normalizeLongitude, signFromLongitude } from "@/features/astrology/longitude";
import { NATAL_POINTS, SIGNS, pointLabel } from "@/lib/constants/astrology";

export type WheelPosition = {
  pointId: string;
  longitude: number;
  retrograde: boolean | null;
};

export type NatalChartBody = {
  pointId: string;
  label: string;
  glyph: string;
  longitude: number;
  signName: string;
  degreeLabel: string;
  houseNumber: number | null;
  retrograde: boolean | null;
};

export type NatalChartView = {
  ascendantLongitude: number;
  cusps: number[];
  bodies: NatalChartBody[];
};

const GLYPHS: Record<string, string> = {
  sun: "☉",
  moon: "☽",
  mercury: "☿",
  venus: "♀",
  mars: "♂",
  jupiter: "♃",
  saturn: "♄",
  uranus: "♅",
  neptune: "♆",
  pluto: "♇",
  chiron: "⚷",
  north_node: "☊",
  south_node: "☋",
  part_of_fortune: "⊕",
  ascendant: "As",
  midheaven: "Mc",
};

export const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"] as const;

export function chartAngle(longitude: number, ascendantLongitude: number) {
  const delta = normalizeLongitude(longitude - ascendantLongitude);
  return Math.PI + (delta * Math.PI) / 180;
}

export function chartPoint(longitude: number, ascendantLongitude: number, radius: number) {
  const angle = chartAngle(longitude, ascendantLongitude);
  // No SVG o eixo Y cresce para baixo. O sinal negativo leva a longitude
  // no sentido anti-horário: o ascendente fica à esquerda e o Meio do Céu, acima.
  return { x: Math.cos(angle) * radius, y: -Math.sin(angle) * radius };
}

export function forwardMidpoint(start: number, end: number) {
  const span = normalizeLongitude(end - start);
  return normalizeLongitude(start + span / 2);
}

function finiteLongitude(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseWheelPositions(value: unknown): WheelPosition[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as { pointId?: unknown; longitude?: unknown; retrograde?: unknown };
    const longitude = finiteLongitude(record.longitude);
    if (typeof record.pointId !== "string" || longitude === null) return [];
    return [{
      pointId: record.pointId,
      longitude,
      retrograde: typeof record.retrograde === "boolean" ? record.retrograde : null,
    }];
  });
}

export function parseCusps(value: unknown) {
  if (!Array.isArray(value) || value.length !== 12) return null;
  const cusps = value.map(finiteLongitude);
  if (cusps.some((cusp) => cusp === null)) return null;
  return cusps as number[];
}

export function longitudeFromAngle(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return finiteLongitude((value as { longitude?: unknown }).longitude);
}

function houseFor(pointId: string, longitude: number, houses: Record<string, number>, cusps: number[] | null) {
  const recorded = houses[pointId];
  if (typeof recorded === "number") return recorded;
  if (!cusps) return null;
  try {
    return houseNumberForLongitude(longitude, cusps);
  } catch {
    return null;
  }
}

export function buildNatalChart(input: {
  ascendantLongitude: number | null;
  midheavenLongitude: number | null;
  cusps: number[] | null;
  positions: WheelPosition[];
  houses: Record<string, number>;
  omitFortune?: boolean;
}): NatalChartView | null {
  if (input.ascendantLongitude === null) return null;
  const positions = input.positions.filter((item) => !(input.omitFortune && item.pointId === "part_of_fortune"));
  if (!positions.some((item) => item.pointId === "south_node")) {
    const north = positions.find((item) => item.pointId === "north_node");
    if (north) {
      positions.push({
        pointId: "south_node",
        longitude: normalizeLongitude(north.longitude + 180),
        retrograde: north.retrograde,
      });
    }
  }
  if (!positions.some((item) => item.pointId === "ascendant")) {
    positions.push({ pointId: "ascendant", longitude: input.ascendantLongitude, retrograde: null });
  }
  if (input.midheavenLongitude !== null && !positions.some((item) => item.pointId === "midheaven")) {
    positions.push({ pointId: "midheaven", longitude: input.midheavenLongitude, retrograde: null });
  }

  const order = new Map(NATAL_POINTS.map((point, index) => [point.id, index]));
  const bodies = positions
    .filter((item) => order.has(item.pointId as (typeof NATAL_POINTS)[number]["id"]))
    .sort((a, b) => (order.get(a.pointId as (typeof NATAL_POINTS)[number]["id"]) ?? 99) - (order.get(b.pointId as (typeof NATAL_POINTS)[number]["id"]) ?? 99))
    .map((item) => {
      const sign = signFromLongitude(item.longitude);
      return {
        pointId: item.pointId,
        label: pointLabel(item.pointId),
        glyph: GLYPHS[item.pointId] ?? item.pointId.slice(0, 2),
        longitude: normalizeLongitude(item.longitude),
        signName: sign.signName,
        degreeLabel: formatDegree(sign.degreeWithinSign),
        houseNumber: houseFor(item.pointId, item.longitude, input.houses, input.cusps),
        retrograde: item.retrograde,
      };
    });

  if (bodies.length === 0) return null;
  return {
    ascendantLongitude: normalizeLongitude(input.ascendantLongitude),
    cusps: input.cusps?.map((cusp) => normalizeLongitude(cusp)) ?? [],
    bodies,
  };
}

export function signElement(signIndex: number) {
  return SIGNS[signIndex]?.element ?? "fogo";
}
