import { AdminPanel, Empty, Kpi } from "@/components/admin/shell";
import { tryServiceClient } from "@/server/db/clients";
import { formatBrl } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const service = tryServiceClient();
  let leads: number | null = null;
  let orders: number | null = null;
  let revenue: number | null = null;
  let failures: number | null = null;
  if (service) {
    const [leadCount, orderRows, failedJobs] = await Promise.all([
      service.from("leads").select("id", { count: "exact", head: true }),
      service.from("orders").select("status,amount_cents"),
      service.from("jobs").select("id", { count: "exact", head: true }).eq("status", "permanent_failed"),
    ]);
    leads = leadCount.count ?? 0;
    const approved = (orderRows.data ?? []).filter((order) => order.status === "approved");
    orders = approved.length;
    revenue = approved.reduce((sum, order) => sum + Number(order.amount_cents), 0);
    failures = failedJobs.count ?? 0;
  }
  return (
    <AdminPanel>
      <h1 className="font-display text-4xl">Operação</h1>
      <p className="mt-2 text-sm text-muted">Os números vêm do banco. Sem conexão, nada é estimado.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Kpi label="Leads" value={leads === null ? "—" : String(leads)} />
        <Kpi label="Compras aprovadas" value={orders === null ? "—" : String(orders)} />
        <Kpi label="Faturamento" value={revenue === null ? "—" : formatBrl(revenue)} />
        <Kpi label="Jobs com falha permanente" value={failures === null ? "—" : String(failures)} />
      </div>
      {service ? null : <div className="mt-6"><Empty>Configure o Supabase para ver a operação real.</Empty></div>}
    </AdminPanel>
  );
}
