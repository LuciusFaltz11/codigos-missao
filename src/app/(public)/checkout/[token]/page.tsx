import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site/chrome";
import { formatBrl } from "@/lib/formatters";
import { checkoutBlockers } from "@/features/methodology/snapshot";
import { deliveryStatus, loadChartByToken } from "@/server/services/charts";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const loaded = await loadChartByToken(token);
  if (!loaded) notFound();
  const blockers = checkoutBlockers({
    chartStatus: loaded.status,
    snapshot: loaded.snapshot,
    priceCents: loaded.priceCents,
    integrations: deliveryStatus(),
    alreadyEntitled: loaded.entitlement === "active",
  });
  return (
    <PageShell>
      <div className="mx-auto grid max-w-2xl gap-6 px-4 py-12">
        <h1 className="font-display text-4xl">Leitura completa</h1>
        <p>O pagamento acontece no checkout hospedado da InfinitePay, com Pix e cartão. Nenhum dado de cartão é digitado aqui.</p>
        <p className="text-2xl">{loaded.priceCents !== null ? formatBrl(loaded.priceCents) : "Preço não configurado"}</p>
        {loaded.entitlement === "active" ? (
          <Link href={`/mapa/completo/${token}`} className="font-semibold text-wine">
            Sua leitura já está liberada.
          </Link>
        ) : null}
        {blockers.length > 0 ? (
          <ul className="grid gap-2 rounded-2xl bg-gold-soft p-4 text-sm">
            {blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <form action={`/api/checkout/${token}`} method="post">
            <button className="min-h-11 rounded-xl bg-wine px-5 font-semibold text-white" type="submit">
              Pagar com InfinitePay
            </button>
          </form>
        )}
      </div>
    </PageShell>
  );
}
