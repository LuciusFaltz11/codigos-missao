import { describe, expect, it } from "vitest";
import { toAutocompleteFeatures } from "@/features/geo/suggestions";
import { confirmPlace, createGeoProvider, GeoapifyGeoProvider, geoapifyPlaces } from "@/server/providers/geo";

const payload = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        formatted: "São Paulo, São Paulo, Brasil",
        country: "Brasil",
        lat: -23.5505,
        lon: -46.6333,
        place_id: "id-interno",
      },
      geometry: { type: "Point", coordinates: [-46.6333, -23.5505] },
    },
    {
      type: "Feature",
      properties: { formatted: "Lisboa, Portugal", country: "Portugal" },
      geometry: { type: "Point", coordinates: [-9.1393, 38.7223] },
    },
    {
      type: "Feature",
      properties: { formatted: "Sem coordenada", country: "Brasil" },
    },
  ],
};

describe("Geoapify", () => {
  it("lê o rótulo e a coordenada leste-positiva", () => {
    expect(geoapifyPlaces(payload)).toEqual([
      {
        label: "São Paulo, São Paulo, Brasil",
        latitude: -23.5505,
        longitude: -46.6333,
        country: "Brasil",
      },
      {
        label: "Lisboa, Portugal",
        latitude: 38.7223,
        longitude: -9.1393,
        country: "Portugal",
      },
    ]);
  });

  it("confirma somente o rótulo exato devolvido pela mesma busca", async () => {
    const provider = new GeoapifyGeoProvider("test-key", async (input) => {
      const url = new URL(String(input));
      expect(`${url.origin}${url.pathname}`).toBe("https://api.geoapify.com/v1/geocode/autocomplete");
      expect(url.searchParams.get("text")).toBe("São Paulo, São Paulo, Brasil");
      expect(url.searchParams.get("type")).toBe("city");
      expect(url.searchParams.get("lang")).toBe("pt");
      expect(url.searchParams.get("format")).toBe("geojson");
      expect(url.searchParams.get("apiKey")).toBe("test-key");
      return Response.json(payload);
    });

    const confirmed = await confirmPlace(provider, "São Paulo, São Paulo, Brasil", "São Paulo, São Paulo, Brasil");
    expect(confirmed?.latitude).toBe(-23.5505);
    expect(confirmed?.longitude).toBe(-46.6333);
    expect(await confirmPlace(provider, "São Paulo, São Paulo, Brasil", "São Paulo")).toBeNull();
  });

  it("envia ao navegador só o nome da cidade", () => {
    const features = toAutocompleteFeatures(geoapifyPlaces(payload));
    expect(JSON.stringify(features)).not.toMatch(/latitude|longitude|-23\.5505|-46\.6333|place_id/);
    expect(features.features[0]?.properties.formatted).toBe("São Paulo, São Paulo, Brasil");
    expect(features.features[0]?.geometry).toBeNull();
  });

  it("exige o nome do provedor e a chave", () => {
    expect(createGeoProvider({ provider: "geoapify", apiKey: "test-key" })).toBeInstanceOf(GeoapifyGeoProvider);
    expect(createGeoProvider({ provider: "geoapify" }).state).toBe("not_configured");
    expect(createGeoProvider({ provider: "outro", apiKey: "test-key" }).state).toBe("not_configured");
  });
});
