import { AdminPanel, Empty } from "@/components/admin/shell";
import { formatBrl } from "@/lib/formatters";
import { tryServiceClient } from "@/server/db/clients";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const service = tryServiceClient();
  const orders = service
    ? await service.from("orders").select("id,status,amount_cents,currency,external_reference,coupon_code,discount_cents,created_at").order("created_at", { ascending: false }).limit(100)
    : null;
  return (
    <AdminPanel>
      <h1 className="font-display text-4xl">Pedidos</h1>
      {!orders?.data?.length ? <div className="mt-6"><Empty>Nenhum pedido.</Empty></div> : null}
      <ul className="mt-6 grid gap-2 text-sm">
        {(orders?.data ?? []).map((order) => (
          <li key={String(order.id)} className="rounded-xl bg-surface px-4 py-3">
            {String(order.status)} · {formatBrl(Number(order.amount_cents))}
            {order.coupon_code ? ` · cupom ${String(order.coupon_code)}` : ""}
            {Number(order.discount_cents) > 0 ? ` · −${formatBrl(Number(order.discount_cents))}` : ""}
            {" · "}
            {String(order.external_reference)}
          </li>
        ))}
      </ul>
    </AdminPanel>
  );
}
