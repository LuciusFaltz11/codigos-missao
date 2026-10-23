import { AdminPanel, Empty } from "@/components/admin/shell";
import { tryServiceClient } from "@/server/db/clients";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const service = tryServiceClient();
  const logs = service
    ? await service.from("audit_logs").select("id,action,entity,entity_id,created_at").order("created_at", { ascending: false }).limit(100)
    : null;
  return (
    <AdminPanel>
      <h1 className="font-display text-4xl">Auditoria</h1>
      {!logs?.data?.length ? <div className="mt-6"><Empty>Nenhum evento de auditoria.</Empty></div> : null}
      <ol className="mt-6 grid gap-2 text-sm">
        {(logs?.data ?? []).map((log) => (
          <li key={String(log.id)}>
            {String(log.action)} · {String(log.entity)} · {String(log.entity_id ?? "")}
          </li>
        ))}
      </ol>
    </AdminPanel>
  );
}
