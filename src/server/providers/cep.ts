import { formatCep, normalizeCep, parseViaCep, viaCepCityQuery } from "@/features/geo/cep";
import { GeoapifyGeoProvider, type GeoPlace, type GeoProvider } from "@/server/providers/geo";

type FetchLike = typeof fetch;

async function firstPlace(search: Promise<GeoPlace[]>) {
  const places = await search;
  return places[0] ?? null;
}

export async function lookupCepPlace(input: {
  cep: string;
  provider: GeoProvider;
  fetchImpl?: FetchLike;
}): Promise<GeoPlace | null> {
  const cep = normalizeCep(input.cep);
  if (!cep) return null;
  const fetchImpl = input.fetchImpl ?? fetch;

  const viaCep = await fetchImpl(`https://viacep.com.br/ws/${cep}/json/`);
  if (!viaCep.ok) throw new Error("geocoding_failed");
  const city = parseViaCep(await viaCep.json());
  if (!city) return null;

  const cityQuery = viaCepCityQuery(city.localidade, city.uf);
  const geoapify = input.provider instanceof GeoapifyGeoProvider ? input.provider : null;
  const byCity = geoapify ? await firstPlace(geoapify.geocode(cityQuery)) : await firstPlace(input.provider.search(cityQuery));
  if (byCity) return byCity;

  const cepQuery = formatCep(cep);
  if (geoapify) return firstPlace(geoapify.geocode(cepQuery));
  return firstPlace(input.provider.search(cepQuery));
}

export async function confirmCepPlace(input: {
  cep: string;
  cityLabel: string;
  provider: GeoProvider;
  fetchImpl?: FetchLike;
}): Promise<GeoPlace | null> {
  const place = await lookupCepPlace(input);
  if (!place || place.label !== input.cityLabel) return null;
  return place;
}
