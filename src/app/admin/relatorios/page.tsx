import { AdminPanel, Empty } from "@/components/admin/shell";
import { reprocessReading } from "@/server/actions/admin";
import { tryServiceClient } from "@/server/db/clients";

export const dynamic = "force-dynamic";

export default async function ReportsAdminPage() {
  const service = tryServiceClient();
  const readings = service
    ? await service.from("readings").select("id,status,last_error,entitlement_id,chart_id").order("created_at", { ascending: false }).limit(50)
    : null;
  return (
    <AdminPanel>
      <h1 className="font-display text-4xl">Relatórios</h1>
      {!readings?.data?.length ? <div className="mt-6"><Empty>Nenhuma leitura gerada.</Empty></div> : null}
      <ul className="mt-6 grid gap-3">
        {(readings?.data ?? []).map((reading) => (
          <li key={String(reading.id)} className="rounded-2xl bg-surface p-4 text-sm">
            <p>{String(reading.status)}{reading.last_error ? ` · ${String(reading.last_error)}` : ""}</p>
            <form action={reprocessReading} className="mt-2">
              <input type="hidden" name="entitlementId" value={String(reading.entitlement_id)} />
              <input type="hidden" name="chartId" value={String(reading.chart_id)} />
              <button className="text-wine" type="submit">Reprocessar</button>
            </form>
          </li>
        ))}
      </ul>
    </AdminPanel>
  );
}
