import "server-only";
import { houseNumberForLongitude, wholeSignHouse } from "@/features/astrology/houses";
import { signFromLongitude } from "@/features/astrology/longitude";
import { resolveLocalDateTime, type TimeOption } from "@/features/astrology/time";
import { activatePositions, type MissionActivation } from "@/features/missions/activate";
import { attachStoredCardArt } from "@/features/missions/card-art";
import type { MethodologySnapshot } from "@/features/interpretation/context";
import { adoptPublishedSnapshot, provisionalSnapshot } from "@/features/methodology/snapshot";
import { buildNatalChart, longitudeFromAngle, parseCusps, parseWheelPositions } from "@/features/astrology/wheel";
import { toFreePreview, type PreparedChart } from "@/features/preview/redact";
import { resolvedActivationPoints } from "@/lib/constants/astrology";
import type { ChartRequest } from "@/lib/schemas/forms";
import { tryServiceClient } from "@/server/db/clients";
import { getServerEnv, integrationStatus } from "@/server/env";
import { logEvent } from "@/server/logging";
import { createAstronomyProvider } from "@/server/providers/astronomy";
import { confirmPlace, createGeoProvider } from "@/server/providers/geo";
import { timezoneForCoordinates } from "@/server/providers/timezone";
import { createAccessToken, hashAccessToken, sealToken } from "@/server/security/tokens";

export type CreateChartResult =
  | { ok: true; token: string; calculation: "complete" | "not_configured" | "license_unconfirmed" | "failed" }
  | { ok: false; code: "validation" | "rate_limited" | "persistence_not_configured" | "geocoding_not_configured" | "place_not_confirmed" | "timezone_unresolved" | "nonexistent_time" | "invalid_date" | "future_date"; message: string }
  | { ok: false; code: "ambiguous_time"; message: string; options: TimeOption[] };

type Service = NonNullable<ReturnType<typeof tryServiceClient>>;

function angleFromLongitude(longitude: number) {
  const sign = signFromLongitude(longitude);
  return { signName: sign.signName, degreeWithinSign: sign.degreeWithinSign, longitude };
}

async function currentSnapshot(service: Service): Promise<MethodologySnapshot> {
  const published = await service
    .from("methodology_versions")
    .select("snapshot")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const snapshot = published.data?.snapshot;
  if (snapshot && typeof snapshot === "object") return snapshot as MethodologySnapshot;
  return provisionalSnapshot();
}

function housesFor(
  snapshot: MethodologySnapshot,
  longitude: number,
  cusps: number[],
  ascendantLongitude: number,
) {
  if (snapshot.houseSystem === "whole_sign") return wholeSignHouse(longitude, ascendantLongitude);
  return houseNumberForLongitude(longitude, cusps);
}

export async function createBirthChart(input: ChartRequest): Promise<CreateChartResult> {
  const service = tryServiceClient();
  if (!service) {
    return {
      ok: false,
      code: "persistence_not_configured",
      message: "O banco ainda não está configurado. Os dados não foram salvos.",
    };
  }

  const year = Number(input.birthDate.slice(0, 4));
  const birthUtcDay = Date.parse(`${input.birthDate}T00:00:00Z`);
  if (year < 1900 || Number.isNaN(birthUtcDay)) {
    return { ok: false, code: "invalid_date", message: "Use uma data de nascimento a partir de 1900." };
  }
  if (birthUtcDay > Date.now()) {
    return { ok: false, code: "future_date", message: "A data de nascimento não pode estar no futuro." };
  }

  const env = getServerEnv();
  const geo = createGeoProvider({ provider: env.geocodingProvider, apiKey: env.geocodingApiKey });
  if (geo.state !== "configured") {
    return {
      ok: false,
      code: "geocoding_not_configured",
      message: "A geocodificação não está configurada. Nenhuma coordenada foi presumida.",
    };
  }

  let place;
  try {
    place = await confirmPlace(geo, input.cityQuery, input.cityLabel);
  } catch (error) {
    logEvent("error", "geocoding_failed", { code: error instanceof Error ? error.name : "error" });
    return { ok: false, code: "place_not_confirmed", message: "Não foi possível confirmar a cidade agora." };
  }
  if (!place) {
    return {
      ok: false,
      code: "place_not_confirmed",
      message: "Escolha uma cidade da lista para confirmar as coordenadas.",
    };
  }

  const iana = timezoneForCoordinates(place.latitude, place.longitude);
  if (!iana) {
    return { ok: false, code: "timezone_unresolved", message: "Não foi possível resolver o fuso IANA dessa coordenada." };
  }

  const time = resolveLocalDateTime({
    date: input.birthDate,
    time: input.birthTime,
    iana,
    offsetChoice: input.offsetChoice,
  });
  if (time.status === "ambiguous") {
    return { ok: false, code: "ambiguous_time", message: time.message, options: time.options };
  }
  if (time.status !== "unique") {
    return { ok: false, code: time.status === "nonexistent" ? "nonexistent_time" : "invalid_date", message: time.message };
  }

  const snapshot = await currentSnapshot(service);
  const { token, hash } = createAccessToken();
  const lead = await service
    .from("leads")
    .insert({ name: input.name, email: input.email.toLowerCase(), marketing_opt_in: input.marketingOptIn })
    .select("id")
    .single();
  if (lead.error || !lead.data) return { ok: false, code: "validation", message: "Não foi possível registrar o contato." };

  const leadId = String(lead.data.id);
  await service.from("consent_records").insert([
    { lead_id: leadId, kind: "privacy", accepted: true, policy_version: env.policyVersion },
    { lead_id: leadId, kind: "marketing", accepted: input.marketingOptIn, policy_version: env.policyVersion },
  ]);

  const birth = await service
    .from("birth_records")
    .insert({
      lead_id: leadId,
      birth_date: input.birthDate,
      birth_time: input.birthTime,
      city_label: place.label,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
      iana_timezone: iana,
      utc_instant: time.utcIso,
      offset_minutes: time.offsetMinutes,
      time_precision: "minute",
    })
    .select("id")
    .single();
  if (birth.error || !birth.data) return { ok: false, code: "validation", message: "Não foi possível registrar o nascimento." };

  const access = await service
    .from("access_tokens")
    .insert({ token_hash: hash, token_sealed: sealToken(token), lead_id: leadId })
    .select("id")
    .single();
  if (access.error || !access.data) return { ok: false, code: "validation", message: "Não foi possível criar o acesso." };

  const astronomy = createAstronomyProvider({
    engine: env.astrologyEngine,
    licenseConfirmed: env.astrologyLicenseConfirmed,
    workerUrl: env.astrologyWorkerUrl,
    workerSecret: env.astrologyWorkerSecret,
  });
  const calculated = await astronomy.calculate({
    utcIso: time.utcIso,
    latitude: place.latitude,
    longitude: place.longitude,
    houseSystem: snapshot.houseSystem,
    zodiac: snapshot.zodiac,
    nodeMode: snapshot.nodeMode,
    fortunaRule: snapshot.fortunaRule,
  });

  let status: "not_configured" | "license_unconfirmed" | "complete" | "failed" =
    calculated.status === "complete" ? "complete" : calculated.status === "failed" ? "failed" : calculated.status;
  let activations: MissionActivation[] = [];
  let omissions: Array<{ pointId: string; reason: string }> = [];
  let positions: unknown = null;
  let cusps: number[] | null = null;
  let ascendant: ReturnType<typeof angleFromLongitude> | null = null;
  let midheaven: ReturnType<typeof angleFromLongitude> | null = null;
  let errorCode: string | null = calculated.status === "failed" ? calculated.errorCode : null;
  let calculationVersion = `${astronomy.state};zodiac=${snapshot.zodiac};houses=${snapshot.houseSystem};node=${snapshot.nodeMode};fortuna=${snapshot.fortunaRule}`;

  if (calculated.status === "complete") {
    const calculation = calculated.calculation;
    calculationVersion = `${calculation.engine}@${calculation.engineVersion};${calculationVersion};data=${calculation.parameters.dataTier ?? ""}`;
    const south = calculation.positions.find((item) => item.pointId === "south_node");
    const north = calculation.positions.find((item) => item.pointId === "north_node");
    const positionsForHouses = [...calculation.positions];
    if (!south && north) {
      positionsForHouses.push({
        pointId: "south_node",
        longitude: (north.longitude + 180) % 360,
        retrograde: null,
      });
      calculationVersion += ";south_node=derived_from_north";
    }
    cusps = calculation.cusps;
    ascendant = angleFromLongitude(calculation.ascendantLongitude);
    midheaven = angleFromLongitude(calculation.midheavenLongitude);
    const housed = positionsForHouses.map((position) => ({
      pointId: position.pointId,
      longitude: position.longitude,
      retrograde: position.retrograde,
      houseNumber: housesFor(snapshot, position.longitude, calculation.cusps, calculation.ascendantLongitude),
    }));
    const points = resolvedActivationPoints(snapshot);
    if (points.includes("ascendant") && !housed.some((item) => item.pointId === "ascendant")) {
      housed.push({
        pointId: "ascendant",
        longitude: calculation.ascendantLongitude,
        retrograde: null,
        houseNumber: snapshot.houseSystem === "whole_sign" ? 1 : housesFor(snapshot, calculation.ascendantLongitude, calculation.cusps, calculation.ascendantLongitude),
      });
    }
    const activated = activatePositions({
      positions: housed,
      catalog: snapshot.codes,
      methodologyVersion: snapshot.versionLabel,
      pointsToActivate: points,
      fortunaRulePending: snapshot.fortunaRule === "pending_approval",
    });
    activations = activated.activations;
    omissions = activated.omissions;
    positions = calculation.positions;
    if (activations.length === 0) {
      status = "failed";
      errorCode = "no_activations";
    }
  }

  const chart = await service
    .from("natal_charts")
    .insert({
      birth_record_id: birth.data.id,
      access_token_id: access.data.id,
      methodology_snapshot: snapshot,
      status,
      engine: env.astrologyEngine,
      engine_status: astronomy.state,
      positions,
      cusps,
      ascendant,
      midheaven,
      omissions,
      calculation_version: calculationVersion,
      error_code: errorCode,
    })
    .select("id")
    .single();
  if (chart.error || !chart.data) return { ok: false, code: "validation", message: "Não foi possível salvar o mapa." };

  if (activations.length > 0) {
    const rows = activations.map((activation) => ({
      chart_id: chart.data.id,
      point_id: activation.natalPointId,
      sign_slug: activation.signSlug,
      degree_within_sign: activation.degreeWithinSign,
      house_number: activation.houseNumber,
      mission_code_id: activation.missionCodeId,
      methodology_version: activation.methodologyVersion,
      longitude: activation.longitude,
      retrograde: activation.retrograde,
      code_snapshot: activation.code,
      trail: activation.trail,
      is_free_preview: activation.natalPointId === snapshot.freePreviewPoint,
    }));
    const inserted = await service.from("mission_activations").insert(rows);
    if (inserted.error) {
      logEvent("error", "activation_insert_failed", { code: "activation_insert_failed" });
    }
  }

  await service.from("analytics_events").insert({ name: "form_complete", chart_id: chart.data.id, properties: {} });
  logEvent("info", "chart_created", { status, engine: astronomy.state });
  return { ok: true, token, calculation: status };
}

type ActivationRow = {
  point_id: string;
  sign_slug: string;
  degree_within_sign: number;
  house_number: number;
  mission_code_id: string;
  methodology_version: string;
  longitude: number;
  retrograde: boolean | null;
  code_snapshot: MissionActivation["code"];
  trail: string[];
};

function rowToActivation(row: ActivationRow): MissionActivation {
  return {
    id: `ac-${row.point_id}`,
    natalPointId: row.point_id,
    signSlug: row.sign_slug,
    signName: row.code_snapshot.signName,
    degreeWithinSign: Number(row.degree_within_sign),
    houseNumber: row.house_number,
    missionCodeId: row.mission_code_id,
    methodologyVersion: row.methodology_version,
    longitude: Number(row.longitude),
    retrograde: row.retrograde,
    code: row.code_snapshot,
    trail: row.trail ?? [],
  };
}

async function overlayActivationCardArt(service: Service, activations: MissionActivation[]) {
  const codeIds = [...new Set(activations.map((item) => item.code.id))];
  if (codeIds.length === 0) return activations;
  const stored = await service.from("mission_codes").select("id,image_url,updated_at").in("id", codeIds);
  return attachStoredCardArt(
    activations,
    (stored.data ?? []).map((row) => ({
      id: String(row.id),
      imageUrl: typeof row.image_url === "string" ? row.image_url : null,
      version: row.updated_at ? String(row.updated_at) : null,
    })),
  );
}

export async function loadChartByToken(token: string) {
  const service = tryServiceClient();
  if (!service) return null;
  const hash = hashAccessToken(token);
  const access = await service.from("access_tokens").select("id,lead_id").eq("token_hash", hash).maybeSingle();
  if (!access.data) return null;
  const chart = await service
    .from("natal_charts")
    .select("id,status,error_code,methodology_snapshot,ascendant,midheaven,positions,cusps,birth_record_id")
    .eq("access_token_id", access.data.id)
    .maybeSingle();
  if (!chart.data) return null;
  const birth = await service
    .from("birth_records")
    .select("city_label,birth_date,birth_time,iana_timezone")
    .eq("id", chart.data.birth_record_id)
    .maybeSingle();
  const activationRows = await service
    .from("mission_activations")
    .select("point_id,sign_slug,degree_within_sign,house_number,mission_code_id,methodology_version,longitude,retrograde,code_snapshot,trail")
    .eq("chart_id", chart.data.id);
  const entitlement = await service
    .from("entitlements")
    .select("id,revoked_at,refund_pending_policy")
    .eq("chart_id", chart.data.id)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const product = await service.from("products").select("name,price_cents,currency,active").eq("active", true).limit(1).maybeSingle();
  const lead = await service.from("leads").select("name,email").eq("id", access.data.lead_id).maybeSingle();
  const frozen = chart.data.methodology_snapshot as MethodologySnapshot;
  const live = await currentSnapshot(service);
  const snapshot = adoptPublishedSnapshot(frozen, live, {
    chartComplete: String(chart.data.status) === "complete",
    hasEntitlement: Boolean(entitlement.data),
  });
  if (snapshot !== frozen) {
    await service.from("natal_charts").update({ methodology_snapshot: snapshot }).eq("id", chart.data.id);
  }
  return {
    service,
    chartId: String(chart.data.id),
    leadId: String(access.data.lead_id),
    leadName: String(lead.data?.name ?? ""),
    leadEmail: String(lead.data?.email ?? ""),
    status: String(chart.data.status) as PreparedChart["status"],
    errorCode: (chart.data.error_code as string | null) ?? null,
    snapshot,
    ascendant: chart.data.ascendant as PreparedChart["ascendant"],
    midheaven: chart.data.midheaven as PreparedChart["midheaven"],
    positions: chart.data.positions,
    cusps: chart.data.cusps,
    birth: birth.data,
    activations: await overlayActivationCardArt(service, ((activationRows.data ?? []) as ActivationRow[]).map(rowToActivation)),
    entitlement: entitlement.data
      ? entitlement.data.refund_pending_policy
        ? ("refund_pending_policy" as const)
        : entitlement.data.revoked_at
          ? ("none" as const)
          : ("active" as const)
      : ("none" as const),
    entitlementId: entitlement.data && !entitlement.data.revoked_at ? String(entitlement.data.id) : null,
    priceCents: product.data?.active ? Number(product.data.price_cents) : null,
    currency: String(product.data?.currency ?? "BRL"),
    productName: product.data?.name ? String(product.data.name) : null,
  };
}

export async function loadFreePreview(token: string) {
  const loaded = await loadChartByToken(token);
  if (!loaded || !loaded.birth) return null;
  const houses = Object.fromEntries(loaded.activations.map((item) => [item.natalPointId, item.houseNumber]));
  const chart = buildNatalChart({
    ascendantLongitude: longitudeFromAngle(loaded.ascendant),
    midheavenLongitude: longitudeFromAngle(loaded.midheaven),
    cusps: parseCusps(loaded.cusps),
    positions: parseWheelPositions(loaded.positions),
    houses,
    omitFortune: loaded.snapshot.fortunaRule === "pending_approval",
  });
  const preview = toFreePreview({
    status: loaded.status,
    errorCode: loaded.errorCode,
    cityLabel: String(loaded.birth.city_label),
    localDate: String(loaded.birth.birth_date),
    localTime: String(loaded.birth.birth_time).slice(0, 5),
    timezone: String(loaded.birth.iana_timezone),
    rulesValidated: loaded.snapshot.rulesValidated,
    freePointId: loaded.snapshot.freePreviewPoint,
    ascendant: loaded.ascendant,
    midheaven: loaded.midheaven,
    activations: loaded.activations,
    chart,
    entitlement: loaded.entitlement,
    priceCents: loaded.priceCents,
    currency: loaded.currency,
    productName: loaded.productName,
  });
  return { preview, chartId: loaded.chartId };
}

export function deliveryStatus() {
  const status = integrationStatus();
  return { infinitepay: status.infinitepay, llm: status.llm, email: status.email };
}
