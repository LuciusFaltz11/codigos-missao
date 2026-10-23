import { getServerEnv } from "@/server/env";
import { createGeoProvider } from "@/server/providers/geo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return Response.json({ status: "empty", places: [] });
  const env = getServerEnv();
  const provider = createGeoProvider({ provider: env.geocodingProvider, apiKey: env.geocodingApiKey });
  if (provider.state !== "configured") return Response.json({ status: "not_configured", places: [] });
  try {
    const places = await provider.search(query);
    return Response.json({
      status: "ok",
      places: places.map((place) => ({ label: place.label, country: place.country })),
    });
  } catch {
    return Response.json({ status: "error", places: [] }, { status: 502 });
  }
}
