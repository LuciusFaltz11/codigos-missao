export function normalizeCep(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return /^\d{8}$/.test(digits) ? digits : null;
}

export function formatCep(digits: string) {
  const normalized = normalizeCep(digits);
  if (!normalized) return digits;
  return `${normalized.slice(0, 5)}-${normalized.slice(5)}`;
}

export function viaCepCityQuery(localidade: string, uf: string) {
  return `${localidade.trim()}, ${uf.trim().toUpperCase()}, Brasil`;
}

export function toPublicCepResult(place: { label: string; country: string | null } | null) {
  if (!place) return { status: "empty" as const, label: null, country: null };
  return { status: "ok" as const, label: place.label, country: place.country };
}

export function parseViaCep(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { erro?: unknown; localidade?: unknown; uf?: unknown };
  if (record.erro === true || record.erro === "true") return null;
  const localidade = typeof record.localidade === "string" ? record.localidade.trim() : "";
  const uf = typeof record.uf === "string" ? record.uf.trim().toUpperCase() : "";
  if (!localidade || !/^[A-Z]{2}$/.test(uf)) return null;
  return { localidade, uf };
}
