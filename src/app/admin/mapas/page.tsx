import { AdminPanel, Empty } from "@/components/admin/shell";
import { tryServiceClient } from "@/server/db/clients";

export const dynamic = "force-dynamic";

export default async function ChartsAdminPage() {
  const service = tryServiceClient();
  const charts = service
    ? await service.from("natal_charts").select("id,status,engine_status,error_code,created_at").order("created_at", { ascending: false }).limit(100)
    : null;
  return (
    <AdminPanel>
      <h1 className="font-display text-4xl">Mapas</h1>
      {!charts?.data?.length ? <div className="mt-6"><Empty>Nenhum mapa salvo.</Empty></div> : null}
      <ul className="mt-6 grid gap-2 text-sm">
        {(charts?.data ?? []).map((chart) => (
          <li key={String(chart.id)} className="rounded-xl bg-surface px-4 py-3">
            {String(chart.status)} · motor {String(chart.engine_status)}
            {chart.error_code ? ` · ${String(chart.error_code)}` : ""}
          </li>
        ))}
      </ul>
    </AdminPanel>
  );
}
