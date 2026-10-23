import { PageShell } from "@/components/site/chrome";
import { PaymentReturn } from "@/components/checkout/payment-return";
import { recordAndProcessPayment } from "@/server/services/webhook";

export const dynamic = "force-dynamic";

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{
    ref?: string;
    outcome?: string;
    order_nsu?: string;
    slug?: string;
    transaction_nsu?: string;
  }>;
}) {
  const params = await searchParams;
  const orderNsu = params.order_nsu ?? params.ref ?? null;
  if (orderNsu && params.transaction_nsu) {
    try {
      await recordAndProcessPayment({
        orderNsu,
        transactionNsu: params.transaction_nsu,
        slug: params.slug ?? null,
        event: "paid",
      });
    } catch {
      // A volta do navegador continua visível mesmo se a consulta ao provedor falhar.
    }
  }
  return (
    <PageShell>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <PaymentReturn reference={orderNsu} outcome={params.outcome ?? (params.transaction_nsu ? "success" : null)} />
      </div>
    </PageShell>
  );
}
