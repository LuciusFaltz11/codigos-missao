import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site/chrome";
import { CheckoutCouponForm } from "@/components/checkout/coupon-form";
import { ImmediateFlash } from "@/components/ui/flash-toast";
import { couponOfferLabel, normalizeCouponCode } from "@/features/checkout/coupons";
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
  const couponFlash = !query.erro && couponError ? ERROR_MESSAGE[couponError] : null;
  return (
    <PageShell>
      <ImmediateFlash flash={couponFlash ? { kind: "error", message: couponFlash } : null} />
      <div className="mx-auto grid max-w-2xl gap-8 px-4 py-12">
        <header className="grid gap-3">
          <h1 className="font-display text-4xl">Leitura completa</h1>
          <p className="max-w-xl text-lg leading-8 text-muted">
            A prévia mostrou um código. Agora você libera todas as ativações do seu mapa, os padrões que se repetem e uma
            síntese para guardar — em PDF e no seu e-mail.
          </p>
        </header>

        <section className="grid gap-6 rounded-3xl border border-border bg-surface p-6">
          {chargeCents !== null && loaded.priceCents != null ? (
            <div>
              {applied ? (
                <>
                  <p className="text-muted">
                    <span className="sr-only">
                      De {formatBrl(loaded.priceCents)} por {formatBrl(chargeCents)}
                    </span>
                    <span aria-hidden="true" className="text-lg line-through">
                      {formatBrl(loaded.priceCents)}
                    </span>
                  </p>
                  <p className="mt-1 font-display text-5xl leading-none">{formatBrl(chargeCents)}</p>
                  <p className="mt-3">
                    <span className="inline-flex rounded-full bg-gold-soft px-3 py-1 text-sm font-semibold text-wine">
                      {couponOfferLabel(applied.coupon)}
                    </span>
                  </p>
                </>
              ) : (
                <p className="font-display text-5xl leading-none">{formatBrl(chargeCents)}</p>
              )}
            </div>
          ) : (
            <p className="text-lg text-muted">Preço não configurado</p>
          )}

          {loaded.entitlement === "active" ? (
            <Link href={`/mapa/completo/${token}`} className="font-semibold text-wine">
              Sua leitura já está liberada.
            </Link>
          ) : null}

          {blockers.length > 0 ? (
            <div className="grid gap-3 rounded-2xl bg-gold-soft p-4 text-sm">
              <ul className="grid gap-2">
                {blockers.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link href="/" className="font-semibold text-wine">
                Gerar um novo mapa
              </Link>
            </div>
          ) : null}

          {loaded.entitlement !== "active" && loaded.priceCents != null ? (
            <CheckoutCouponForm
              token={token}
              defaultCode={applied?.coupon.code ?? query.cupom ?? ""}
              applied={Boolean(applied)}
              canPay={blockers.length === 0}
            />
          ) : null}
        </section>
      </div>
    </PageShell>
  );
}
