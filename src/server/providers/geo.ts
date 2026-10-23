export type GeoPlace = {
  label: string;
  latitude: number;
  longitude: number;
  country: string | null;
};

export interface GeoProvider {
  state: "configured" | "not_configured";
  search(query: string): Promise<GeoPlace[]>;
}

export class NotConfiguredGeoProvider implements GeoProvider {
  state = "not_configured" as const;
  async search(): Promise<GeoPlace[]> {
    return [];
  }
}

type FetchLike = typeof fetch;

export class OpenCageGeoProvider implements GeoProvider {
  state = "configured" as const;
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async search(query: string): Promise<GeoPlace[]> {
    const url = new URL("https://api.opencagedata.com/geocode/v1/json");
    url.searchParams.set("q", query);
    url.searchParams.set("key", this.apiKey);
    url.searchParams.set("language", "pt");
    url.searchParams.set("limit", "5");
    url.searchParams.set("no_annotations", "1");
    const response = await this.fetchImpl(url);
    if (!response.ok) throw new Error("geocoding_failed");
    const body = (await response.json()) as {
      results?: Array<{
        formatted?: string;
        geometry?: { lat?: number; lng?: number };
        components?: { country?: string };
      }>;
    };
    return (body.results ?? [])
      .filter((item) => item.formatted && Number.isFinite(item.geometry?.lat) && Number.isFinite(item.geometry?.lng))
      .map((item) => ({
        label: item.formatted!,
        latitude: item.geometry!.lat!,
        longitude: item.geometry!.lng!,
        country: item.components?.country ?? null,
      }));
  }
}

export class GeoapifyGeoProvider implements GeoProvider {
  state = "configured" as const;
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async search(query: string): Promise<GeoPlace[]> {
    const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
    url.searchParams.set("text", query);
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("type", "city");
    url.searchParams.set("lang", "pt");
    url.searchParams.set("limit", "5");
    url.searchParams.set("format", "geojson");
    const response = await this.fetchImpl(url);
    if (!response.ok) throw new Error("geocoding_failed");
    return geoapifyPlaces(await response.json());
  }
}

export function geoapifyPlaces(payload: unknown): GeoPlace[] {
  const features = (payload as { features?: unknown[] }).features;
  if (!Array.isArray(features)) return [];
  return features.flatMap((feature) => {
    const record = feature as {
      properties?: { formatted?: unknown; country?: unknown; lat?: unknown; lon?: unknown };
      geometry?: { coordinates?: unknown };
    };
    const formatted = record.properties?.formatted;
    const coordinates = record.geometry?.coordinates;
    const latitude = coordinate(record.properties?.lat) ?? coordinate(Array.isArray(coordinates) ? coordinates[1] : undefined);
    const longitude = coordinate(record.properties?.lon) ?? coordinate(Array.isArray(coordinates) ? coordinates[0] : undefined);
    if (typeof formatted !== "string" || !formatted.trim() || latitude === null || longitude === null) return [];
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return [];
    const country = record.properties?.country;
    return [{
      label: formatted,
      latitude,
      longitude,
      country: typeof country === "string" && country ? country : null,
    }];
  });
}

function coordinate(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export class MapboxGeoProvider implements GeoProvider {
  state = "configured" as const;
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async search(query: string): Promise<GeoPlace[]> {
    const url = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
    );
    url.searchParams.set("access_token", this.apiKey);
    url.searchParams.set("language", "pt");
    url.searchParams.set("limit", "5");
    url.searchParams.set("types", "place,locality,region");
    const response = await this.fetchImpl(url);
    if (!response.ok) throw new Error("geocoding_failed");
    const body = (await response.json()) as {
      features?: Array<{ place_name?: string; center?: number[]; context?: Array<{ id?: string; text?: string }> }>;
    };
    return (body.features ?? [])
      .filter((item) => item.place_name && item.center && item.center.length >= 2)
      .map((item) => {
        const country = item.context?.find((entry) => entry.id?.startsWith("country"))?.text ?? null;
        return {
          label: item.place_name!,
          longitude: item.center![0]!,
          latitude: item.center![1]!,
          country,
        };
      });
  }
}

export function createGeoProvider(input: {
  provider?: string;
  apiKey?: string;
}): GeoProvider {
  if (!input.provider || !input.apiKey) return new NotConfiguredGeoProvider();
  if (input.provider === "geoapify") return new GeoapifyGeoProvider(input.apiKey);
  if (input.provider === "opencage") return new OpenCageGeoProvider(input.apiKey);
  if (input.provider === "mapbox") return new MapboxGeoProvider(input.apiKey);
  return new NotConfiguredGeoProvider();
}

export async function confirmPlace(provider: GeoProvider, query: string, label: string) {
  const results = await provider.search(query);
  return results.find((place) => place.label === label) ?? null;
}
