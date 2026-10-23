import { AdminPanel, Empty } from "@/components/admin/shell";
import { LeadsPanel } from "@/components/admin/leads-panel";
import { maskEmail } from "@/lib/formatters";
import { roleHas } from "@/server/auth/rbac";
import { getAdminSession } from "@/server/auth/session";
import { loadAdminLeads } from "@/server/services/admin-leads";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
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
      {rows.length === 0 ? (
        <div className="mt-6">
          <Empty>Nenhum lead registrado.</Empty>
        </div>
      ) : (
        <LeadsPanel rows={rows} initialId={notice.ver} />
      )}
    </AdminPanel>
  );
}
