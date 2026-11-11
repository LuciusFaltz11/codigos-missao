"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { customerOrderFlag, isTerminalPaymentStatus } from "@/features/checkout/return-status";
import { Button } from "@/components/ui/button";
import { formatBrl } from "@/lib/formatters";

type View = {
  status: string;
  readingUrl: string | null;
  amountCents: number | null;
  email: string | null;
  note?: string | null;
};

function mergeView(current: View, next: Partial<View>): View {
  return {
    status: next.status ?? current.status,
    readingUrl: next.readingUrl ?? current.readingUrl,
    amountCents: next.amountCents ?? current.amountCents,
    email: next.email ?? current.email,
    note: next.note,
  };
}

export function PaymentReturn({
  orderNsu,
  localRef,
  slug,
  transactionNsu,
  captureMethod,
  receiptUrl,
  initialStatus,
  initialAmountCents,
  initialEmail,
}: {
  orderNsu: string | null;
  localRef: string | null;
  slug: string | null;
  transactionNsu: string | null;
  captureMethod: string | null;
  receiptUrl: string | null;
  initialStatus: string;
  initialAmountCents: number | null;
  initialEmail: string | null;
}) {
  const canQuery = Boolean(orderNsu || slug || localRef);
  const canRecheck = Boolean(transactionNsu && canQuery);
  const [view, setView] = useState<View>({
    status: initialStatus,
    readingUrl: null,
    amountCents: initialAmountCents,
    email: initialEmail,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!canQuery) return;
    const statusQuery = new URLSearchParams();
    if (orderNsu) statusQuery.set("ref", orderNsu);
    if (localRef) statusQuery.set("local_ref", localRef);
    if (slug) statusQuery.set("slug", slug);
    let stopped = false;
    let confirms = 0;

    async function readStatus() {
      const response = await fetch(`/api/orders/status?${statusQuery.toString()}`, { cache: "no-store" });
      const body = (await response.json()) as View;
      if (!stopped) setView((current) => mergeView(current, body));
      return body.status ?? "unknown";
    }

    async function confirm() {
      if (!transactionNsu) return null;
      const response = await fetch("/api/pagamento/confirmar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          order_nsu: orderNsu,
          transaction_nsu: transactionNsu,
          slug,
          local_ref: localRef,
        }),
      });
      const body = (await response.json().catch(() => null)) as View | null;
      if (!stopped && body) setView((current) => mergeView(current, body));
      return body?.status ?? null;
    }

    let statusTimer = 0;
    let confirmTimer = 0;
    async function tick(doConfirm: boolean) {
      if (stopped) return;
      let status: string | null = null;
      if (doConfirm && transactionNsu && confirms < 15) {
        confirms += 1;
        status = await confirm();
      }
      status = status ?? (await readStatus());
      if (!isTerminalPaymentStatus(status)) return;
      confirms = 15;
      window.clearInterval(statusTimer);
      if (confirmTimer) window.clearInterval(confirmTimer);
    }

    void tick(Boolean(transactionNsu));
    statusTimer = window.setInterval(() => void tick(false), 1000);
    if (transactionNsu) confirmTimer = window.setInterval(() => void tick(true), 2000);
    return () => {
      stopped = true;
      window.clearInterval(statusTimer);
      if (confirmTimer) window.clearInterval(confirmTimer);
    };
  }, [canQuery, orderNsu, localRef, slug, transactionNsu]);

  async function recheck() {
    if (!canRecheck || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/pagamento/confirmar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          order_nsu: orderNsu,
          transaction_nsu: transactionNsu,
          slug,
          local_ref: localRef,
        }),
      });
      const body = (await response.json().catch(() => null)) as View | null;
      if (body) setView((current) => mergeView(current, body));
    } finally {
      setBusy(false);
    }
  }

  const status = view.status;
  const flag = customerOrderFlag(status);
  const approved = status === "approved";
  const failed = status === "rejected" || status === "cancelled";
  const refunded = status === "refunded";
  const methodLabel = captureMethod === "pix" ? "Pix" : captureMethod === "credit_card" ? "Cartão" : captureMethod;

  const story = approved
    ? "Seus Códigos da Missão já estão liberados. O PDF completo também segue para o e-mail cadastrado neste pedido."
    : failed
      ? "Recebemos o pedido, mas este pagamento ainda não foi confirmado. Se o valor saiu da sua conta, o comprovante abaixo ajuda a conferir. Você também pode tentar de novo."
      : refunded
        ? "Este pagamento foi reembolsado. Se precisar da leitura, fale conosco com o comprovante em mãos."
        : "Enquanto o pagamento é processado, os Códigos da Missão deste mapa estão sendo revelados.";

  const emailNotice = approved
    ? view.email
      ? `O PDF completo já está a caminho de ${view.email}.`
      : "O PDF completo já está a caminho do e-mail cadastrado neste pedido."
    : failed || refunded
      ? null
      : view.email
        ? `Assim que o pagamento for confirmado, um PDF completo chega em ${view.email}.`
        : "Assim que o pagamento for confirmado, um PDF completo chega no e-mail cadastrado neste pedido.";

  return (
    <div className="grid gap-8">
      <header className="grid gap-4">
        <p className="inline-flex w-fit rounded bg-gold-soft px-3 py-1 text-sm font-semibold text-wine" role="status">
          {flag}
        </p>
        <h1 className="font-display text-4xl leading-tight text-ink md:text-5xl">Obrigada por fazer o pedido</h1>
        <p className="max-w-xl text-lg leading-8 text-muted">{story}</p>
      </header>

      <section className="grid gap-6 border-t border-gold bg-surface p-6">
        <div>
          <p className="text-sm text-muted">{approved ? "Valor pago" : "Valor deste pedido"}</p>
          {view.amountCents != null ? (
            <p className="mt-1 font-display text-5xl leading-none">{formatBrl(view.amountCents)}</p>
          ) : (
            <p className="mt-1 font-display text-3xl leading-none text-muted">A confirmar</p>
          )}
          {methodLabel ? <p className="mt-3 text-sm text-muted">{methodLabel}</p> : null}
        </div>

        {emailNotice ? (
          <p className="max-w-xl border-l-2 border-gold bg-canvas px-4 py-3 text-sm leading-6">
            {emailNotice}
          </p>
        ) : null}

        {approved && view.readingUrl ? (
          <Button asChild>
            <a href={view.readingUrl}>Abrir leitura completa</a>
          </Button>
        ) : null}
      </section>

      <div className="grid gap-3 text-sm">
        {receiptUrl ? (
          <a href={receiptUrl} className="font-semibold text-wine" target="_blank" rel="noopener noreferrer">
            Ver comprovante
          </a>
        ) : null}
        {canRecheck && !approved ? (
          <button
            type="button"
            onClick={() => void recheck()}
            disabled={busy}
            className="w-fit text-left font-semibold text-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
          >
            {busy ? "Confirmando o pagamento…" : "Atualizar status do pagamento"}
          </button>
        ) : null}
        <Link href="/" className="font-semibold text-wine">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
