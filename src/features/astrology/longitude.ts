import { SIGNS, signBySlug, type SignSlug } from "@/lib/constants/astrology";

export function normalizeLongitude(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Longitude inválida.");
  }
  const mod = value % 360;
  const normalized = mod < 0 ? mod + 360 : mod;
  return normalized === 360 ? 0 : normalized;
}

export function signFromLongitude(longitude: number): {
  signSlug: SignSlug;
  signName: string;
  signIndex: number;
  degreeWithinSign: number;
} {
  const normalized = normalizeLongitude(longitude);
  let signIndex = Math.floor(normalized / 30);
  if (signIndex >= 12) signIndex = 0;
  const degreeWithinSign = normalized - signIndex * 30;
  const sign = SIGNS[signIndex];
  if (!sign || degreeWithinSign < 0 || degreeWithinSign >= 30) {
    throw new Error("Não foi possível derivar o signo sem arredondar a longitude.");
  }
  return {
    signSlug: sign.slug,
    signName: sign.name,
    signIndex,
    degreeWithinSign,
  };
}

export function formatDegree(degreeWithinSign: number): string {
  if (!Number.isFinite(degreeWithinSign) || degreeWithinSign < 0 || degreeWithinSign >= 30) {
    throw new Error("Grau fora do signo.");
  }
  const degrees = Math.floor(degreeWithinSign);
  const minuteFloat = (degreeWithinSign - degrees) * 60;
  const minutes = Math.floor(minuteFloat);
  const seconds = Math.floor((minuteFloat - minutes) * 60);
  return `${degrees}°${String(minutes).padStart(2, "0")}′${String(seconds).padStart(2, "0")}″`;
}

export function assertKnownSign(slug: string): SignSlug {
  const sign = signBySlug(slug);
  if (!sign) throw new Error(`Signo desconhecido: ${slug}`);
  return sign.slug;
}
