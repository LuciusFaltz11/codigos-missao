import { after } from "next/server";
import { cookies } from "next/headers";
import { PageShell } from "@/components/site/chrome";
import { PaymentReturn } from "@/components/checkout/payment-return";
import { CHECKOUT_REF_COOKIE, pickLocalOrderReference } from "@/features/checkout/return-status";
import { runDueJobs } from "@/server/jobs/runner";
import { loadOrderReturnView } from "@/server/services/checkout";
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
    capture_method?: string;
    receipt_url?: string;
  }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const localRef = pickLocalOrderReference(params.ref, params.order_nsu, cookieStore.get(CHECKOUT_REF_COOKIE)?.value);
  const orderNsu = params.order_nsu ?? null;
  const slug = params.slug ?? null;
  const transactionNsu = params.transaction_nsu ?? null;
  if (transactionNsu && (orderNsu || slug || localRef)) {
    try {
      const result = await recordAndProcessPayment({
        orderNsu,
        transactionNsu,
        slug,
        localRef,
        event: "paid",
      });
      if (result.ok && result.approved) {
        after(async () => {
          await runDueJobs(3);
        });
      }
    } catch {
      // A volta do navegador continua visível mesmo se a consulta ao provedor falhar.
    }
  }
  const view = await loadOrderReturnView({ ref: orderNsu, slug, localRef });
  return (
    <PageShell>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <PaymentReturn
          orderNsu={orderNsu}
          localRef={localRef}
          slug={slug}
          transactionNsu={transactionNsu}
          captureMethod={params.capture_method ?? null}
          receiptUrl={params.receipt_url ?? null}
          initialStatus={view.status}
          initialAmountCents={view.amountCents}
          initialEmail={view.email}
        />
      </div>
    </PageShell>
  );
}
