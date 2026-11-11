"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isTerminalPaymentStatus } from "@/features/checkout/return-status";
import { Button } from "@/components/ui/button";

const hints: Record<string, string> = {
  success: "O navegador voltou do checkout da InfinitePay. Isso ainda não confirma o pagamento.",
  pending: "A InfinitePay informou uma situação pendente. A confirmação continua no servidor.",
  failure: "O retorno do checkout indica que o pagamento não foi aprovado. Nenhuma leitura foi liberada por esta tela.",
};

type View = { status: string; readingUrl: string | null };

export function PaymentReturn({
  orderNsu,
  slug,
  transactionNsu,
  captureMethod,
  receiptUrl,
  outcome,
}: {
  orderNsu: string | null;
  slug: string | null;
  transactionNsu: string | null;
  captureMethod: string | null;
  receiptUrl: string | null;
  outcome: string | null;
}) {
  const canQuery = Boolean(orderNsu || slug);
  const [view, setView] = useState<View>({ status: canQuery ? "carregando" : "unknown", readingUrl: null });

  useEffect(() => {
    if (!canQuery) return;
    const statusQuery = new URLSearchParams();
    if (orderNsu) statusQuery.set("ref", orderNsu);
    if (slug) statusQuery.set("slug", slug);
    let stopped = false;
    let confirms = 0;

    async function readStatus() {
      const response = await fetch(`/api/orders/status?${statusQuery.toString()}`, { cache: "no-store" });
      const body = (await response.json()) as View;
      if (!stopped) setView({ status: body.status ?? "unknown", readingUrl: body.readingUrl ?? null });
      return body.status ?? "unknown";
    }

    async function confirm() {
      if (!transactionNsu) return;
      await fetch("/api/pagamento/confirmar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          order_nsu: orderNsu,
          transaction_nsu: transactionNsu,
          slug,
        }),
      });
    }

    let statusTimer = 0;
    let confirmTimer = 0;
    async function tick(doConfirm: boolean) {
      if (stopped) return;
      if (doConfirm && transactionNsu && confirms < 15) {
        confirms += 1;
        await confirm();
      }
      const status = await readStatus();
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
  }, [canQuery, orderNsu, slug, transactionNsu]);

  const status = view.status;
  const label =
    status === "approved"
      ? "Pagamento aprovado. Sua leitura completa está liberada."
      : status === "pending" || status === "carregando"
        ? "Estamos confirmando o pagamento com a InfinitePay."
        : status === "rejected" || status === "cancelled"
          ? "Pagamento não aprovado."
          : status === "refunded"
            ? "Reembolso registrado. A política de acesso ainda depende de decisão editorial."
            : status === "not_configured"
              ? "O banco ainda não está configurado, então nenhum pagamento pode ser confirmado."
              : "Não encontramos este pedido ainda. Se você acabou de pagar, aguarde alguns segundos.";

  const methodLabel = captureMethod === "pix" ? "Pix" : captureMethod;
  const reference = orderNsu ?? slug;

  return (
    <div className="grid gap-5">
      <p className="border-l-2 border-gold bg-canvas px-4 py-3 text-sm">
        {outcome ? (hints[outcome] ?? hints.success) : "Aguardando a referência do pedido."}
      </p>
      <h1 className="font-display text-4xl">{label}</h1>
      <dl className="grid gap-2 text-sm text-muted">
        <div>
          <dt className="sr-only">Estado no servidor</dt>
          <dd>Estado no servidor: {status}</dd>
        </div>
        {methodLabel ? (
          <div>
            <dt className="inline font-medium text-ink">Método: </dt>
            <dd className="inline">{methodLabel}</dd>
          </div>
        ) : null}
        {reference ? (
          <div>
            <dt className="inline font-medium text-ink">Referência: </dt>
            <dd className="inline break-all">{reference}</dd>
          </div>
        ) : null}
      </dl>
      {status === "approved" && view.readingUrl ? (
        <Button asChild>
          <a href={view.readingUrl}>Abrir leitura completa</a>
        </Button>
      ) : null}
      {receiptUrl ? (
        <a href={receiptUrl} className="text-sm font-semibold text-wine" target="_blank" rel="noopener noreferrer">
          Ver recibo da InfinitePay
        </a>
      ) : null}
      <Link href="/" className="text-sm font-semibold text-wine">
        Voltar ao início
      </Link>
    </div>
  );
}
