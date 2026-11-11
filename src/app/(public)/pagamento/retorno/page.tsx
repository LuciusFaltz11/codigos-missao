import { after } from "next/server";
import { PageShell } from "@/components/site/chrome";
import { PaymentReturn } from "@/components/checkout/payment-return";
import { runDueJobs } from "@/server/jobs/runner";
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
  const orderNsu = params.order_nsu ?? params.ref ?? null;
  const slug = params.slug ?? null;
  const transactionNsu = params.transaction_nsu ?? null;
  if (transactionNsu && (orderNsu || slug)) {
    try {
      const result = await recordAndProcessPayment({
        orderNsu,
        transactionNsu,
        slug,
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
  return (
    <PageShell>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <PaymentReturn
          orderNsu={orderNsu}
          slug={slug}
          transactionNsu={transactionNsu}
          captureMethod={params.capture_method ?? null}
          receiptUrl={params.receipt_url ?? null}
          outcome={params.outcome ?? (transactionNsu ? "success" : null)}
        />
      </div>
    </PageShell>
  );
}
