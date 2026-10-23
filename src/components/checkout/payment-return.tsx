"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const hints: Record<string, string> = {
  success: "O navegador voltou do checkout da InfinitePay. Isso ainda não confirma o pagamento.",
  pending: "A InfinitePay informou uma situação pendente. A confirmação continua no servidor.",
  failure: "O retorno do checkout indica que o pagamento não foi aprovado. Nenhuma leitura foi liberada por esta tela.",
};

export function PaymentReturn({ reference, outcome }: { reference: string | null; outcome: string | null }) {
  const [status, setStatus] = useState<string>(reference ? "carregando" : "unknown");

  useEffect(() => {
    if (!reference) return;
    const current = reference;
    let stopped = false;
    async function poll() {
      const response = await fetch(`/api/orders/status?ref=${encodeURIComponent(current)}`);
      const body = await response.json();
      if (!stopped) setStatus(body.status ?? "unknown");
    }
    void poll();
    const timer = window.setInterval(() => void poll(), 4000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [reference]);

  const label =
    status === "approved"
      ? "Pagamento aprovado. A leitura entra em processamento."
      : status === "pending"
        ? "Pagamento ainda pendente."
        : status === "rejected" || status === "cancelled"
          ? "Pagamento não aprovado."
          : status === "refunded"
            ? "Reembolso registrado. A política de acesso ainda depende de decisão editorial."
            : status === "not_configured"
              ? "O banco ainda não está configurado, então nenhum pagamento pode ser confirmado."
              : status === "carregando"
                ? "Estamos consultando o estado confirmado no servidor."
                : "Não há pagamento confirmado para esta referência.";

  return (
    <div className="grid gap-4">
      <p className="rounded-2xl bg-gold-soft px-4 py-3 text-sm">{outcome ? hints[outcome] ?? hints.success : "Aguardando a referência do pedido."}</p>
      <h1 className="font-display text-4xl">{label}</h1>
      <p className="text-sm text-muted">Estado no servidor: {status}</p>
      <Link href="/" className="text-sm font-semibold text-wine">
        Voltar ao início
      </Link>
    </div>
  );
}
