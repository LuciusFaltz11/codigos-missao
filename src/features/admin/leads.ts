import type { NatalChartView } from "@/features/astrology/wheel";

export type AdminLeadChart = {
  id: string;
  status: string;
  engine: string;
  engineStatus: string;
  errorCode: string | null;
  createdAt: string;
  highlightPointId: string | null;
  chart: NatalChartView | null;
};

export type AdminLead = {
  id: string;
  name: string;
  email: string;
  marketingOptIn: boolean;
  converted: boolean;
  createdAt: string;
  privacyAccepted: boolean | null;
  policyVersion: string | null;
  birth: null | {
    date: string;
    time: string;
    city: string;
    country: string | null;
    timezone: string;
  };
  charts: AdminLeadChart[];
};

export const LEAD_FILTERS = ["all", "unconverted", "unique"] as const;
export type LeadFilter = (typeof LEAD_FILTERS)[number];

export const LEAD_EMAIL_SCOPES = ["all", "unconverted", "unique"] as const;
export type LeadEmailScope = (typeof LEAD_EMAIL_SCOPES)[number];

export function isLeadFilter(value: string | null | undefined): value is LeadFilter {
  return LEAD_FILTERS.includes(value as LeadFilter);
}

export function parseLeadFilter(value: string | null | undefined): LeadFilter {
  if (value === "unconverted" || value === "sem-conversao") return "unconverted";
  if (value === "unique" || value === "sem-repeticao") return "unique";
  return "all";
}

export function leadFilterParam(filter: LeadFilter) {
  if (filter === "unconverted") return "sem-conversao";
  if (filter === "unique") return "sem-repeticao";
  return null;
}

export function normalizeLeadEmail(email: string) {
  return email.trim().toLowerCase();
}

export function uniqueLeadsByEmail(rows: AdminLead[]) {
  const seen = new Set<string>();
  const unique: AdminLead[] = [];
  for (const row of rows) {
    const key = normalizeLeadEmail(row.email);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

export function filterAdminLeads(rows: AdminLead[], filter: LeadFilter) {
  if (filter === "unconverted") return rows.filter((row) => !row.converted);
  if (filter === "unique") return uniqueLeadsByEmail(rows);
  return rows;
}

export function emailsForExport(rows: AdminLead[], scope: LeadEmailScope) {
  const source =
    scope === "unconverted" ? rows.filter((row) => !row.converted) : scope === "unique" ? uniqueLeadsByEmail(rows) : rows;
  if (scope === "unique") return source.map((row) => normalizeLeadEmail(row.email)).filter(Boolean);
  return source.map((row) => row.email.trim()).filter(Boolean);
}

export function csvCell(value: string | number | boolean | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) {
  const lines = [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function leadsSpreadsheetCsv(rows: AdminLead[]) {
  return toCsv(
    ["Nome", "E-mail", "Cadastro", "Comprou", "Cidade", "Nascimento", "Horário", "Fuso", "Mapa", "Comunicações", "Privacidade"],
    rows.map((row) => [
      row.name,
      row.email,
      row.createdAt,
      row.converted ? "sim" : "não",
      row.birth?.city ?? "",
      row.birth?.date ?? "",
      row.birth?.time ?? "",
      row.birth?.timezone ?? "",
      row.charts[0]?.status ?? "",
      row.marketingOptIn ? "aceita" : "não aceita",
      row.privacyAccepted == null ? "" : row.privacyAccepted ? "aceita" : "não aceita",
    ]),
  );
}

export function leadsEmailsCsv(emails: string[]) {
  return toCsv(["E-mail"], emails.map((email) => [email]));
}

export function leadsExportFilename(kind: "full" | "emails", scope?: LeadEmailScope) {
  const day = new Date().toISOString().slice(0, 10);
  if (kind === "full") return `leads-completos-${day}.csv`;
  const suffix = scope === "unconverted" ? "sem-conversao" : scope === "unique" ? "sem-repeticao" : "todos";
  return `leads-emails-${suffix}-${day}.csv`;
}
