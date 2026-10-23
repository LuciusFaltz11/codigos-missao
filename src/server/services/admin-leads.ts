import "server-only";
import { type AdminLead, type AdminLeadChart } from "@/features/admin/leads";
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

export async function loadAdminLeads(): Promise<AdminLead[]> {
  const service = tryServiceClient();
  if (!service) return [];
  const leads = await service
    .from("leads")
    .select("id,name,email,marketing_opt_in,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = leads.data ?? [];
  if (rows.length === 0) return [];
  const leadIds = rows.map((row) => String(row.id));
  const [consents, births] = await Promise.all([
    service.from("consent_records").select("lead_id,kind,accepted,policy_version,created_at").in("lead_id", leadIds),
    service.from("birth_records").select("id,lead_id,birth_date,birth_time,city_label,country,iana_timezone,created_at").in("lead_id", leadIds),
  ]);
  const birthRows = births.data ?? [];
  const birthIds = birthRows.map((row) => String(row.id));
  const charts = birthIds.length
    ? await service
        .from("natal_charts")
        .select("id,birth_record_id,status,engine,engine_status,error_code,positions,cusps,ascendant,midheaven,methodology_snapshot,created_at")
        .in("birth_record_id", birthIds)
    : { data: [] as Array<Record<string, unknown>> };
  const chartRows = charts.data ?? [];
  const chartIds = chartRows.map((row) => String(row.id));
  const activations = chartIds.length
    ? await service.from("mission_activations").select("chart_id,point_id,house_number").in("chart_id", chartIds)
    : { data: [] as Array<Record<string, unknown>> };

  const housesByChart = new Map<string, Record<string, number>>();
  for (const row of activations.data ?? []) {
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
  for (const consent of latestByCreatedAt(consents.data ?? [])) {
    if (String(consent.kind) !== "privacy") continue;
    const leadId = String(consent.lead_id);
    if (!privacyByLead.has(leadId)) {
      privacyByLead.set(leadId, { accepted: Boolean(consent.accepted), policyVersion: String(consent.policy_version) });
    }
  }

  return rows.map((lead) => {
    const id = String(lead.id);
    const birth = birthByLead.get(id) ?? null;
    const privacy = privacyByLead.get(id) ?? null;
    const chartsForLead = birth ? latestByCreatedAt(chartsByBirth.get(String(birth.id)) ?? []) : [];
    return {
      id,
      name: String(lead.name),
      email: String(lead.email),
      marketingOptIn: Boolean(lead.marketing_opt_in),
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
  });
}
