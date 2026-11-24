import { normalizeCep, toPublicCepResult } from "@/features/geo/cep";
import { lookupCepPlace } from "@/server/providers/cep";
import { createGeoProvider } from "@/server/providers/geo";
import { getServerEnv } from "@/server/env";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cep = normalizeCep(new URL(request.url).searchParams.get("cep") ?? "");
  if (!cep) return Response.json({ status: "invalid", label: null, country: null });
  const env = getServerEnv();
  const provider = createGeoProvider({ provider: env.geocodingProvider, apiKey: env.geocodingApiKey });
  if (provider.state !== "configured") return Response.json({ status: "not_configured", label: null, country: null });
  try {
    const place = await lookupCepPlace({ cep, provider });
    return Response.json(toPublicCepResult(place));
  } catch {
    return Response.json({ status: "error", label: null, country: null }, { status: 502 });
  }
}
