"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { READING_DELIVERY_PHASES, type ReadingDeliveryState } from "@/features/reading/delivery";

const COPY: Record<ReadingDeliveryState["phase"], { title: string; body: string }> = {
  queued: {
    title: "Sua leitura está sendo realizada",
    body: "O mapa e os Códigos já estão nesta página. A interpretação completa está na fila e será enviada automaticamente para o seu e-mail quando ficar pronta. Você pode acompanhar o resumo daqui, sem precisar esperar o download.",
  },
  interpreting: {
    title: "Sua leitura está sendo realizada",
    body: "Estamos costurando os Códigos deste mapa. Assim que a leitura estiver pronta, o PDF segue automaticamente por e-mail. Enquanto isso, o mapa e os Códigos calculados já podem ser explorados abaixo.",
  },
  composing: {
    title: "A leitura já aparece abaixo",
    body: "O PDF e o envio automático por e-mail ainda estão sendo finalizados. Os botões de download e reenvio só ficam disponíveis quando essa entrega estiver 100% pronta.",
  },
  ready: {
    title: "A leitura completa está pronta",
    body: "O PDF também segue por e-mail. Você pode baixar o arquivo ou pedir um reenvio por aqui.",
  },
  failed: {
    title: "Não foi possível concluir a leitura agora",
    body: "O pagamento permanece registrado. Tente de novo mais tarde ou fale conosco. O mapa e os Códigos calculados continuam visíveis nesta página.",
  },
};

export function ReadingDeliveryPanel({
  token,
  initial,
  lastError,
}: {
  token: string;
  initial: ReadingDeliveryState;
  lastError?: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const previous = useRef(initial);

  useEffect(() => {
    setState(initial);
    previous.current = initial;
  }, [initial]);

  useEffect(() => {
    if (!state.poll) return;
    let stopped = false;
    async function poll() {
      const response = await fetch(`/api/charts/${encodeURIComponent(token)}/status`, { cache: "no-store" });
      if (!response.ok || stopped) return;
      const body = (await response.json()) as ReadingDeliveryState & { ok?: boolean };
      if (stopped || !body.ok || !READING_DELIVERY_PHASES.includes(body.phase)) return;
      const next: ReadingDeliveryState = {
        phase: body.phase,
        progress: Number(body.progress),
        poll: Boolean(body.poll),
        interpretationReady: Boolean(body.interpretationReady),
        deliveryReady: Boolean(body.deliveryReady),
      };
      const changed =
        next.phase !== previous.current.phase ||
        next.interpretationReady !== previous.current.interpretationReady ||
        next.deliveryReady !== previous.current.deliveryReady;
      previous.current = next;
      setState(next);
      if (changed) router.refresh();
    }
    void poll();
    const timer = window.setInterval(() => void poll(), 4000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [router, state.poll, token]);

  const copy = COPY[state.phase];

  return (
    <section className="grid gap-4" aria-live="polite">
      <div className="grid gap-3 rounded-3xl border border-gold bg-gold-soft px-6 py-5">
        <p className="text-xs font-semibold tracking-wide text-wine uppercase">
          {state.deliveryReady ? "Entrega pronta" : "Leitura em preparação"} · {state.progress}%
        </p>
        <h2 className="font-display text-3xl">{copy.title}</h2>
        <p className="max-w-3xl leading-7">{copy.body}</p>
        {state.poll ? (
          <div className="h-1.5 overflow-hidden rounded-full bg-white/70" aria-hidden>
            <div className="h-full rounded-full bg-wine transition-[width] duration-500" style={{ width: `${state.progress}%` }} />
          </div>
        ) : null}
        {state.phase === "failed" && lastError ? <p className="text-sm text-muted">Motivo técnico: {lastError}.</p> : null}
      </div>
      {state.deliveryReady ? (
        <div className="flex flex-wrap gap-3">
          <a className="ui-button rounded-xl bg-wine px-4 py-2 font-semibold text-white" href={`/api/charts/${token}/report`}>
            Baixar PDF
          </a>
          <form action={`/api/charts/${token}/email`} method="post">
            <button className="rounded-xl border border-border px-4 py-2" type="submit">
              Reenviar e-mail
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
