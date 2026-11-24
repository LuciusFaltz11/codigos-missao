import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCep, normalizeCep, parseViaCep, toPublicCepResult, viaCepCityQuery } from "@/features/geo/cep";
import { chartRequestSchema } from "@/lib/schemas/forms";
import { confirmCepPlace, lookupCepPlace } from "@/server/providers/cep";
import { GeoapifyGeoProvider } from "@/server/providers/geo";

const santaRosaGeo = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        formatted: "Santa Rosa, RS, Brasil",
        country: "Brasil",
        lat: -27.8708,
        lon: -54.4814,
      },
      geometry: { type: "Point", coordinates: [-54.4814, -27.8708] },
    },
  ],
};

function jsonResponse(body: unknown, ok = true) {
  return new Response(JSON.stringify(body), { status: ok ? 200 : 502, headers: { "content-type": "application/json" } });
}

describe("CEP", () => {
  it("normaliza 8 dígitos e recusa tamanho errado", () => {
    expect(normalizeCep("98900-000")).toBe("98900000");
    expect(normalizeCep("98900000")).toBe("98900000");
    expect(normalizeCep("123")).toBeNull();
    expect(formatCep("98900000")).toBe("98900-000");
    expect(viaCepCityQuery("Santa Rosa", "rs")).toBe("Santa Rosa, RS, Brasil");
  });

  it("recusa CEP inexistente no ViaCEP", () => {
    expect(parseViaCep({ erro: true })).toBeNull();
    expect(parseViaCep({ erro: "true" })).toBeNull();
    expect(parseViaCep({ localidade: "Santa Rosa", uf: "RS" })).toEqual({ localidade: "Santa Rosa", uf: "RS" });
  });

  it("não envia latitude nem longitude ao navegador", () => {
    const publicResult = toPublicCepResult({
      label: "Santa Rosa, RS, Brasil",
      country: "Brasil",
      latitude: -27.8708,
      longitude: -54.4814,
    } as { label: string; country: string | null });
    expect(publicResult).toEqual({ status: "ok", label: "Santa Rosa, RS, Brasil", country: "Brasil" });
    expect(JSON.stringify(publicResult)).not.toMatch(/latitude|longitude|-27\.8708|-54\.4814/);
  });

  it("consulta ViaCEP e geocodifica a cidade na Geoapify sem type=city", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = new URL(String(input));
      if (url.hostname === "viacep.com.br") {
        expect(url.pathname).toBe("/ws/98900000/json/");
        return jsonResponse({ localidade: "Santa Rosa", uf: "RS", cep: "98900-000" });
      }
      expect(`${url.origin}${url.pathname}`).toBe("https://api.geoapify.com/v1/geocode/search");
      expect(url.searchParams.get("text")).toBe("Santa Rosa, RS, Brasil");
      expect(url.searchParams.has("type")).toBe(false);
      return jsonResponse(santaRosaGeo);
    };
    const place = await lookupCepPlace({
      cep: "98900-000",
      provider: new GeoapifyGeoProvider("test-key", fetchImpl),
      fetchImpl,
    });
    expect(place).toEqual({
      label: "Santa Rosa, RS, Brasil",
      latitude: -27.8708,
      longitude: -54.4814,
      country: "Brasil",
    });
  });

  it("usa o CEP na Geoapify se o nome da cidade não geocodificar", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = new URL(String(input));
      if (url.hostname === "viacep.com.br") {
        return jsonResponse({ localidade: "Santa Rosa", uf: "RS" });
      }
      if (url.searchParams.get("text") === "Santa Rosa, RS, Brasil") return jsonResponse({ type: "FeatureCollection", features: [] });
      expect(url.searchParams.get("text")).toBe("98900-000");
      return jsonResponse(santaRosaGeo);
    };
    const place = await lookupCepPlace({
      cep: "98900000",
      provider: new GeoapifyGeoProvider("test-key", fetchImpl),
      fetchImpl,
    });
    expect(place?.label).toBe("Santa Rosa, RS, Brasil");
  });

  it("não confirma lugar quando o ViaCEP aponta erro", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = new URL(String(input));
      if (url.hostname === "viacep.com.br") return jsonResponse({ erro: true });
      throw new Error(`geoapify não deveria ser chamada: ${url.href}`);
    };
    expect(
      await lookupCepPlace({
        cep: "00000000",
        provider: new GeoapifyGeoProvider("test-key", fetchImpl),
        fetchImpl,
      }),
    ).toBeNull();
  });

  it("não confirma lugar quando a Geoapify não geocodifica o município", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = new URL(String(input));
      if (url.hostname === "viacep.com.br") return jsonResponse({ localidade: "Santa Rosa", uf: "RS" });
      return jsonResponse({ type: "FeatureCollection", features: [] });
    };
    expect(
      await lookupCepPlace({
        cep: "00000000",
        provider: new GeoapifyGeoProvider("test-key", fetchImpl),
        fetchImpl,
      }),
    ).toBeNull();
  });

  it("aceita CEP opcional no pedido e recusa CEP incompleto", () => {
    const base = {
      name: "Ana Silva",
      email: "ana@example.com",
      birthDate: "1991-04-12",
      birthTime: "09:30",
      cityQuery: "Santa Rosa, RS, Brasil",
      cityLabel: "Santa Rosa, RS, Brasil",
      acceptPrivacy: true as const,
      marketingOptIn: false,
    };
    expect(chartRequestSchema.safeParse(base).success).toBe(true);
    expect(chartRequestSchema.safeParse({ ...base, cep: "98900-000" }).data?.cep).toBe("98900000");
    expect(chartRequestSchema.safeParse({ ...base, cep: "123" }).success).toBe(false);
  });

  it("no submit reconsulta o CEP e recusa rótulo adulterado", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = new URL(String(input));
      if (url.hostname === "viacep.com.br") {
        expect(url.pathname).toBe("/ws/98783110/json/");
        return jsonResponse({ localidade: "Santa Rosa", uf: "RS" });
      }
      return jsonResponse(santaRosaGeo);
    };
    const provider = new GeoapifyGeoProvider("test-key", fetchImpl);
    const confirmed = await confirmCepPlace({
      cep: "98783110",
      cityLabel: "Santa Rosa, RS, Brasil",
      provider,
      fetchImpl,
    });
    expect(confirmed).toEqual({
      label: "Santa Rosa, RS, Brasil",
      latitude: -27.8708,
      longitude: -54.4814,
      country: "Brasil",
    });
    expect(
      await confirmCepPlace({
        cep: "98783110",
        cityLabel: "Porto Alegre, RS, Brasil",
        provider,
        fetchImpl,
      }),
    ).toBeNull();
  });

  it("o wizard e o formulário Wix oferecem o fallback de CEP", async () => {
    const root = process.cwd();
    const [field, wizard, wix] = await Promise.all([
      readFile(path.join(root, "src/components/birth-form/city-place-field.tsx"), "utf8"),
      readFile(path.join(root, "src/components/birth-form/wizard.tsx"), "utf8"),
      readFile(path.join(root, "src/components/integrations/wix-chart-form.tsx"), "utf8"),
    ]);
    expect(field).toContain("Não encontrou sua cidade?");
    expect(field).toContain("/api/geo/cep");
    expect(wizard).toContain("CityPlaceField");
    expect(wizard).toContain("cep: form.cep");
    expect(wix).toContain("CityPlaceField");
    expect(wix).toContain("cep: form.cep");
  });
});
