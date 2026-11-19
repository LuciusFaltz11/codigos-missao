import { AdminPanel, Empty } from "@/components/admin/shell";
import { LeadsPanel } from "@/components/admin/leads-panel";
import { parseLeadFilter } from "@/features/admin/leads";
import { maskEmail } from "@/lib/formatters";
import { roleHas } from "@/server/auth/rbac";
import { getAdminSession } from "@/server/auth/session";
import { loadAdminLeads } from "@/server/services/admin-leads";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string; filtro?: string }>;
}) {
  const notice = await searchParams;
  const session = await getAdminSession();
  if (session && !roleHas(session.role, "leads.read")) {
    return (
      <AdminPanel>
        <Empty>Seu papel não acessa leads.</Empty>
      </AdminPanel>
    );
  }
  const loaded = await loadAdminLeads();
  const rows =
    session?.role === "support"
      ? loaded.map((lead) => ({
          ...lead,
          name: "Nome oculto para suporte",
          email: maskEmail(lead.email),
        }))
      : loaded;
  return (
    <AdminPanel>
      <h1 className="font-display text-4xl">Leads</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Filtre cadastros, marque quem comprou e exporte a planilha ou só os e-mails.
      </p>
      {rows.length === 0 ? (
        <div className="mt-6">
          <Empty>Nenhum lead registrado.</Empty>
        </div>
      ) : (
        <LeadsPanel
          rows={rows}
          initialId={notice.ver}
          initialFilter={parseLeadFilter(notice.filtro)}
          canExport={!session || session.role !== "support"}
        />
      )}
    </AdminPanel>
  );
}
