import { NextResponse } from "next/server";
import {
  emailsForExport,
  leadsEmailsCsv,
  leadsExportFilename,
  leadsSpreadsheetCsv,
  type LeadEmailScope,
} from "@/features/admin/leads";
import { requirePermission } from "@/server/auth/session";
import { loadAdminLeads } from "@/server/services/admin-leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPES = new Set<LeadEmailScope>(["all", "unconverted", "unique"]);

function csvResponse(filename: string, body: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(request: Request) {
  const auth = await requirePermission("leads.read");
  if (!auth.ok) return new Response(null, { status: auth.status === 401 ? 401 : 403 });
  if (auth.admin.role === "support") return new Response(null, { status: 403 });

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") === "emails" ? "emails" : "full";
  const scopeRaw = url.searchParams.get("scope") ?? "all";
  const scope: LeadEmailScope = SCOPES.has(scopeRaw as LeadEmailScope) ? (scopeRaw as LeadEmailScope) : "all";
  const rows = await loadAdminLeads();

  if (kind === "emails") {
    return csvResponse(leadsExportFilename("emails", scope), leadsEmailsCsv(emailsForExport(rows, scope)));
  }
  return csvResponse(leadsExportFilename("full"), leadsSpreadsheetCsv(rows));
}
