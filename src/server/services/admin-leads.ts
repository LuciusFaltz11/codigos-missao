import "server-only";
import { applyPurchaseByEmail, type AdminLead, type AdminLeadChart } from "@/features/admin/leads";
import { buildNatalChart, longitudeFromAngle, parseCusps, parseWheelPositions } from "@/features/astrology/wheel";
import type { MethodologySnapshot } from "@/features/interpretation/context";
import { tryServiceClient } from "@/server/db/clients";

export type { AdminLead, AdminLeadChart };

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function latestByCreatedAt<T extends { created_at?: unknown; createdAt?: unknown }>(rows: T[]) {
  return [...rows].sort((left, right) => {
    const a = String(left.created_at ?? left.createdAt ?? "");
    const b = String(right.created_at ?? right.createdAt ?? "");
    return a < b ? 1 : a > b ? -1 : 0;
  });
}

function toChartView(row: Record<string, unknown>, houses: Record<string, number>): AdminLeadChart {
  const snapshot = asRecord(row.methodology_snapshot) as MethodologySnapshot | null;
  return {
    id: String(row.id),
    status: String(row.status),
    engine: String(row.engine ?? ""),
    engineStatus: String(row.engine_status ?? ""),
    errorCode: typeof row.error_code === "string" ? row.error_code : null,
    createdAt: String(row.created_at ?? ""),
    highlightPointId: snapshot?.freePreviewPoint ?? null,
    chart: buildNatalChart({
      ascendantLongitude: longitudeFromAngle(row.ascendant),
      midheavenLongitude: longitudeFromAngle(row.midheaven),
      cusps: parseCusps(row.cusps),
      positions: parseWheelPositions(row.positions),
      houses,
      omitFortune: snapshot?.fortunaRule === "pending_approval",
    }),
  };
}

const PAGE = 1000;
const IN_CHUNK = 200;

async function fetchAllLeads(service: NonNullable<ReturnType<typeof tryServiceClient>>) {
  const rows: Array<Record<string, unknown>> = [];
  for (let from = 0; ; from += PAGE) {
    const result = await service
      .from("leads")
      .select("id,name,email,marketing_opt_in,created_at")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    rows.push(...((result.data ?? []) as unknown as Array<Record<string, unknown>>));
    if ((result.data ?? []).length < PAGE) break;
  }
  return rows;
}

async function fetchIn(ids: string[], load: (chunk: string[]) => PromiseLike<{ data: unknown[] | null }>) {
  const rows: Array<Record<string, unknown>> = [];
  for (let index = 0; index < ids.length; index += IN_CHUNK) {
    const chunk = ids.slice(index, index + IN_CHUNK);
    if (chunk.length === 0) continue;
    const result = await load(chunk);
    rows.push(...((result.data ?? []) as Array<Record<string, unknown>>));
  }
  return rows;
}

export async function loadAdminLeads(): Promise<AdminLead[]> {
  const service = tryServiceClient();
  if (!service) return [];
  const rows = await fetchAllLeads(service);
  if (rows.length === 0) return [];
  const leadIds = rows.map((row) => String(row.id));
  const [consents, births, approvedOrders] = await Promise.all([
    fetchIn(leadIds, (chunk) =>
      service.from("consent_records").select("lead_id,kind,accepted,policy_version,created_at").in("lead_id", chunk),
    ),
    fetchIn(leadIds, (chunk) =>
      service
        .from("birth_records")
        .select("id,lead_id,birth_date,birth_time,city_label,country,iana_timezone,created_at")
        .in("lead_id", chunk),
    ),
    fetchIn(leadIds, (chunk) => service.from("orders").select("lead_id").eq("status", "approved").in("lead_id", chunk)),
  ]);
  const birthRows = births;
  const birthIds = birthRows.map((row) => String(row.id));
  const chartRows = birthIds.length
    ? await fetchIn(birthIds, (chunk) =>
        service
          .from("natal_charts")
          .select(
            "id,birth_record_id,status,engine,engine_status,error_code,positions,cusps,ascendant,midheaven,methodology_snapshot,created_at",
          )
          .in("birth_record_id", chunk),
      )
    : [];
  const chartIds = chartRows.map((row) => String(row.id));
  const activations = chartIds.length
    ? await fetchIn(chartIds, (chunk) =>
        service.from("mission_activations").select("chart_id,point_id,house_number").in("chart_id", chunk),
      )
    : [];

  const convertedLeadIds = new Set(approvedOrders.map((row) => String(row.lead_id)).filter(Boolean));
  const housesByChart = new Map<string, Record<string, number>>();
  for (const row of activations) {
    const chartId = String(row.chart_id);
    const current = housesByChart.get(chartId) ?? {};
    current[String(row.point_id)] = Number(row.house_number);
    housesByChart.set(chartId, current);
  }

  const chartsByBirth = new Map<string, AdminLeadChart[]>();
  for (const row of chartRows) {
    const record = asRecord(row);
    if (!record) continue;
    const birthId = String(record.birth_record_id);
    const list = chartsByBirth.get(birthId) ?? [];
    list.push(toChartView(record, housesByChart.get(String(record.id)) ?? {}));
    chartsByBirth.set(birthId, list);
  }

  const birthByLead = new Map<string, (typeof birthRows)[number]>();
  for (const birth of latestByCreatedAt(birthRows)) {
    const leadId = String(birth.lead_id);
    if (!birthByLead.has(leadId)) birthByLead.set(leadId, birth);
  }

  const privacyByLead = new Map<string, { accepted: boolean; policyVersion: string }>();
  for (const consent of latestByCreatedAt(consents)) {
    if (String(consent.kind) !== "privacy") continue;
    const leadId = String(consent.lead_id);
    if (!privacyByLead.has(leadId)) {
      privacyByLead.set(leadId, { accepted: Boolean(consent.accepted), policyVersion: String(consent.policy_version) });
    }
  }

  return applyPurchaseByEmail(
    rows.map((lead) => {
      const id = String(lead.id);
      const birth = birthByLead.get(id) ?? null;
      const privacy = privacyByLead.get(id) ?? null;
      const chartsForLead = birth ? latestByCreatedAt(chartsByBirth.get(String(birth.id)) ?? []) : [];
      return {
        id,
        name: String(lead.name),
        email: String(lead.email),
        marketingOptIn: Boolean(lead.marketing_opt_in),
        converted: convertedLeadIds.has(id),
        createdAt: String(lead.created_at),
        privacyAccepted: privacy?.accepted ?? null,
        policyVersion: privacy?.policyVersion ?? null,
        birth: birth
          ? {
              date: String(birth.birth_date),
              time: String(birth.birth_time).slice(0, 5),
              city: String(birth.city_label),
              country: birth.country ? String(birth.country) : null,
              timezone: String(birth.iana_timezone),
            }
          : null,
        charts: chartsForLead,
      };
    }),
  );
}
