import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site/chrome";
import { CheckoutCouponForm } from "@/components/checkout/coupon-form";
import { couponDiscountLabel, normalizeCouponCode } from "@/features/checkout/coupons";
import { formatBrl } from "@/lib/formatters";
import { checkoutBlockers } from "@/features/methodology/snapshot";
import { quoteCoupon } from "@/server/services/coupons";
import { deliveryStatus, loadChartByToken } from "@/server/services/charts";

export const dynamic = "force-dynamic";

const ERROR_MESSAGE: Record<string, string> = {
  "1": "Não foi possível abrir o pagamento.",
  cupom: "Este código de desconto não é válido.",
  minimo: "Este cupom deixa o valor abaixo do mínimo de cobrança.",
  link: "A InfinitePay não confirmou o link de pagamento.",
};

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ erro?: string; cupom?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const loaded = await loadChartByToken(token);
  if (!loaded) notFound();
  const blockers = checkoutBlockers({
    chartStatus: loaded.status,
    snapshot: loaded.snapshot,
    priceCents: loaded.priceCents,
    integrations: deliveryStatus(),
    alreadyEntitled: loaded.entitlement === "active",
  });
  const typed = normalizeCouponCode(query.cupom ?? "");
  const quoted =
    typed && loaded.priceCents != null ? await quoteCoupon(loaded.priceCents, typed) : null;
  const couponError = typed && quoted && !quoted.ok ? (quoted.reason === "below_minimum" ? "minimo" : "cupom") : null;
  const applied = quoted?.ok ? quoted : null;
  const chargeCents = applied?.amountCents ?? loaded.priceCents;
  const message = ERROR_MESSAGE[query.erro ?? ""] ?? (couponError ? ERROR_MESSAGE[couponError] : null);
  return (
    <PageShell>
      <div className="mx-auto grid max-w-2xl gap-6 px-4 py-12">
        <h1 className="font-display text-4xl">Leitura completa</h1>
        <p>O pagamento acontece no checkout hospedado da InfinitePay, com Pix e cartão. Nenhum dado de cartão é digitado aqui.</p>
        <p className="text-2xl">
          {chargeCents !== null ? formatBrl(chargeCents) : "Preço não configurado"}
        </p>
        {applied ? (
          <p className="text-sm text-muted">
            De {formatBrl(loaded.priceCents ?? 0)} com o cupom {applied.coupon.name} ({couponDiscountLabel(applied.coupon)}).
          </p>
        ) : null}
        {loaded.entitlement === "active" ? (
          <Link href={`/mapa/completo/${token}`} className="font-semibold text-wine">
            Sua leitura já está liberada.
          </Link>
        ) : null}
        {message ? (
          <p className="text-sm text-danger" role="alert">
            {message}
          </p>
        ) : null}
        {blockers.length > 0 ? (
          <ul className="grid gap-2 rounded-2xl bg-gold-soft p-4 text-sm">
            {blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        {loaded.entitlement !== "active" && loaded.priceCents != null ? (
          <CheckoutCouponForm
            token={token}
            defaultCode={applied?.coupon.code ?? query.cupom ?? ""}
            canPay={blockers.length === 0}
          />
        ) : null}
      </div>
    </PageShell>
  );
}
