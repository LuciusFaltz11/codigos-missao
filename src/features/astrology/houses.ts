import { normalizeLongitude } from "@/features/astrology/longitude";

/**
 * Determina a casa a partir de cúspides já calculadas pelo motor.
 * Não inventa cúspides. O intervalo é [cúspide, próxima cúspide).
 */
export function houseNumberForLongitude(longitude: number, cusps: number[]): number {
  if (cusps.length !== 12 || cusps.some((cusp) => !Number.isFinite(cusp))) {
    throw new Error("São necessárias 12 cúspides numéricas.");
  }
  const lon = normalizeLongitude(longitude);
  const starts = cusps.map((cusp) => normalizeLongitude(cusp));
  for (let index = 0; index < 12; index += 1) {
    const start = starts[index]!;
    const end = starts[(index + 1) % 12]!;
    const inside = start <= end ? lon >= start && lon < end : lon >= start || lon < end;
    if (inside) return index + 1;
  }
  throw new Error("A longitude não caiu em nenhuma casa. Confira as cúspides.");
}

/** Casa inteira a partir do signo do Ascendente. Só use quando o sistema configurado for esse. */
export function wholeSignHouse(longitude: number, ascendantLongitude: number): number {
  const point = normalizeLongitude(longitude);
  const ascendant = normalizeLongitude(ascendantLongitude);
  const ascendantSign = Math.floor(ascendant / 30);
  const pointSign = Math.floor(point / 30);
  return ((pointSign - ascendantSign + 12) % 12) + 1;
}
