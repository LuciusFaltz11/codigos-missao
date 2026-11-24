import { beforeEach, describe, expect, it, vi } from "vitest";

const { lookupCepPlace, env, provider } = vi.hoisted(() => ({
  lookupCepPlace: vi.fn(),
  env: {
    geocodingProvider: "geoapify" as string | undefined,
    geocodingApiKey: "test-key" as string | undefined,
  },
  provider: { state: "configured" as "configured" | "not_configured" },
}));

vi.mock("@/server/env", () => ({
  getServerEnv: () => env,
}));

vi.mock("@/server/providers/cep", () => ({
  lookupCepPlace,
}));

vi.mock("@/server/providers/geo", () => ({
  createGeoProvider: () => provider,
}));

async function getCep(cep: string) {
  const { GET } = await import("@/app/api/geo/cep/route");
  return GET(new Request(`https://codigos.example/api/geo/cep?cep=${cep}`));
}

describe("GET /api/geo/cep", () => {
  beforeEach(() => {
    lookupCepPlace.mockReset();
    env.geocodingProvider = "geoapify";
    env.geocodingApiKey = "test-key";
    provider.state = "configured";
  });

  it("não envia latitude nem longitude no JSON", async () => {
    lookupCepPlace.mockResolvedValue({
      label: "Santa Rosa, RS, Brasil",
      country: "Brasil",
      latitude: -27.8708,
      longitude: -54.4814,
    });
    const response = await getCep("98783110");
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok", label: "Santa Rosa, RS, Brasil", country: "Brasil" });
    expect(JSON.stringify(body)).not.toMatch(/latitude|longitude|-27\.8708|-54\.4814/);
  });

  it("devolve vazio quando o CEP não confirma lugar", async () => {
    lookupCepPlace.mockResolvedValue(null);
    const response = await getCep("00000000");
    await expect(response.json()).resolves.toEqual({ status: "empty", label: null, country: null });
  });
});
