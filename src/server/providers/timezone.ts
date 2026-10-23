import { find as findTimeZone } from "geo-tz";

export function timezoneForCoordinates(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  const zones = findTimeZone(latitude, longitude);
  return zones[0] ?? null;
}
