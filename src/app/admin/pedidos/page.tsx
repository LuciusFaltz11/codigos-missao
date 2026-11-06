import { OrdersPanel } from "@/components/admin/orders-panel";
import { AdminPanel, Empty } from "@/components/admin/shell";
import { ImmediateFlash } from "@/components/ui/flash-toast";
import { resolveFlash } from "@/lib/flash";
import { maskEmail } from "@/lib/formatters";
import { roleHas } from "@/server/auth/rbac";
import { getAdminSession } from "@/server/auth/session";
import { loadAdminOrders } from "@/server/services/admin-orders";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string; erro?: string; salvo?: string }>;
}) {
  const query = await searchParams;
  const flashParams = new URLSearchParams();
  if (query.erro) flashParams.set("erro", query.erro);
  if (query.salvo) flashParams.set("salvo", query.salvo);
  const flash = resolveFlash("/admin/pedidos", flashParams);
  const session = await getAdminSession();
  if (session && !roleHas(session.role, "orders.read")) {
    return (
      <AdminPanel>
        <Empty>Seu papel não acessa pedidos.</Empty>
      </AdminPanel>
    );
  }
  const loaded = await loadAdminOrders();
  const rows =
    session?.role === "support"
      ? loaded.map((order) => ({
          ...order,
          leadName: "Nome oculto para suporte",
          leadEmail: maskEmail(order.leadEmail),
        }))
      : loaded;
  return (
    <AdminPanel>
      <ImmediateFlash flash={flash} />
      <h1 className="font-display text-4xl">Pedidos</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Cada linha é um pedido registrado. Clique para ver valores, cupom, pagamento, acesso e o andamento do PDF e do
        e-mail.
      </p>
      {rows.length === 0 ? (
        <div className="mt-6">
          <Empty>Nenhum pedido.</Empty>
        </div>
      ) : (
        <OrdersPanel
          rows={rows}
          initialId={query.ver}
          canDownloadReport={!session || roleHas(session.role, "reports.read")}
          canReprocess={!session || roleHas(session.role, "orders.reprocess")}
        />
      )}
    </AdminPanel>
  );
}
