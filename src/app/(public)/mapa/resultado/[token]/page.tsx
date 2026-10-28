import Link from "next/link";
import { notFound } from "next/navigation";
import { ChartReadingExperience, type ChartReadingPoint } from "@/components/chart/chart-reading";
import { MissionCard } from "@/components/mission-cards/mission-card";
import { PageShell } from "@/components/site/chrome";
import { formatBrl } from "@/lib/formatters";
import { loadFreePreview } from "@/server/services/charts";

export const dynamic = "force-dynamic";

const statusCopy: Record<string, string> = {
  not_configured: "O motor astronômico não está configurado. Nenhuma posição foi inventada.",
  license_unconfirmed: "A licença do motor astronômico ainda não foi confirmada. Nenhuma posição foi calculada.",
  failed: "O cálculo não pôde ser concluído. Seus dados foram guardados e o mapa pode ser reprocessado.",
  pending: "O cálculo ainda está pendente.",
  calculating: "O cálculo está em andamento.",
  complete: "O mapa foi calculado com os parâmetros registrados nesta versão.",
};

const errorCopy: Record<string, string> = {
  house_system_unavailable: "Placidus não está definido nessa latitude. O mapa não foi trocado para signo inteiro.",
  position_unvalidated: "Uma posição ficou fora da faixa validada do motor. Nenhuma leitura foi gerada com ela.",
  body_unavailable: "O motor não devolveu um ponto necessário. Nenhuma posição foi completada por aproximação.",
  sidereal_ayanamsa_unconfigured: "O zodíaco sideral ainda não tem ayanamsa definido. Nenhum deslocamento foi escolhido.",
};

function previewPoints(preview: {
  freeActivation: {
    pointId: string;
    archetype: string;
    keyword: string;
    decan: 1 | 2 | 3;
    decanRuler: string;
    light: string;
    shadow: string;
    imageUrl: string | null;
    element: string | null;
  } | null;
  interpretationSummary: { body: string; invitation: string } | null;
  activationPoints: Array<{
    pointId: string;
    pointLabel: string;
    signName: string;
    degreeLabel: string;
    houseNumber: number;
    unlocked: boolean;
  }>;
}): ChartReadingPoint[] {
  return preview.activationPoints.map((item) => {
    const free = preview.freeActivation;
    if (!item.unlocked || !free || free.pointId !== item.pointId) {
      return { ...item, code: null };
    }
    return {
      ...item,
      code: {
        archetype: free.archetype,
        keyword: free.keyword,
        decan: free.decan,
        decanRuler: free.decanRuler,
        light: free.light,
        shadow: free.shadow,
        imageUrl: free.imageUrl,
        element: free.element,
      },
      interpretation: preview.interpretationSummary?.body ?? null,
      invitation: preview.interpretationSummary?.invitation ?? null,
    };
  });
}

export default async function PreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const loaded = await loadFreePreview(token);
  if (!loaded) notFound();
  const { preview } = loaded;
  const free = preview.freeActivation;
  const lockedCount = preview.otherActivationCount ?? 0;
  const totalCodes = lockedCount + (free ? 1 : 0);
  const completeHref = preview.entitlement === "active" ? `/mapa/completo/${token}` : `/checkout/${token}`;
  const completeLabel = preview.entitlement === "active" ? "Abrir leitura completa" : "Continuar para a leitura completa";
  const lockedAction = (
    <Link href={completeHref} className="ui-button inline-flex rounded-xl bg-wine px-4 py-3 font-semibold text-white">
      {completeLabel}
    </Link>
  );

  return (
    <PageShell>
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12">
        <header className="grid gap-3">
          <p className="text-sm text-muted">Resultado</p>
          {free ? (
            <>
              <p className="text-sm font-semibold tracking-wide text-wine uppercase">
                {free.pointLabel} encontra {free.archetype}
              </p>
              <h1 className="font-display text-4xl">{free.archetype}</h1>
              <p className="text-lg font-semibold tracking-wide text-wine uppercase">{free.keyword}</p>
              <p>
                {free.pointLabel} · {free.signName} {free.degreeLabel} · decanato {free.decan} · casa {free.houseNumber}
              </p>
              <p className="text-sm text-muted">
                Regente do decanato: {free.decanRuler}. Este regente não é o planeta que ativou o código.
              </p>
            </>
          ) : (
            <h1 className="font-display text-4xl">Seu mapa astral</h1>
          )}
          <p className="text-sm">
            {preview.birth.cityLabel} · {preview.birth.localDate} · {preview.birth.localTime} · {preview.birth.timezone}
          </p>
          <p className="text-sm text-muted">
            {(preview.errorCode && errorCopy[preview.errorCode]) || statusCopy[preview.status] || statusCopy.pending}
          </p>
        </header>
        {preview.notice ? <p className="rounded-2xl bg-gold-soft px-4 py-3 text-sm">{preview.notice}</p> : null}
        {preview.interpretationSummary ? (
          <section className="grid gap-4 rounded-3xl border border-gold bg-surface px-6 py-6">
            <p className="text-sm font-semibold tracking-wide text-wine uppercase">Primeira leitura</p>
            <h2 className="font-display text-3xl">{preview.interpretationSummary.kicker}</h2>
            <p className="max-w-3xl text-lg leading-8">{preview.interpretationSummary.body}</p>
            <p className="max-w-3xl leading-7 text-muted">{preview.interpretationSummary.invitation}</p>
            <Link href={completeHref} className="ui-button mt-1 inline-flex w-fit rounded-xl bg-wine px-4 py-3 font-semibold text-white">
              {completeLabel}
            </Link>
          </section>
        ) : null}
        {preview.chart ? (
          <ChartReadingExperience
            chart={preview.chart}
            points={previewPoints(preview)}
            initialPointId={free?.pointId ?? null}
            lockedCount={lockedCount}
            lockedAction={lockedAction}
          />
        ) : free ? (
          <div className="grid items-start gap-8 md:grid-cols-[280px_1fr]">
            <MissionCard
              archetype={free.archetype}
              keyword={free.keyword}
              element={free.element}
              signName={free.signName}
              decan={free.decan}
              light={free.light}
              shadow={free.shadow}
              imageUrl={free.imageUrl}
            />
            <div className="grid gap-3">
              <h2 className="font-display text-3xl">{free.pointLabel}</h2>
              <p>
                {free.signName} {free.degreeLabel} · decanato {free.decan} · casa {free.houseNumber}
              </p>
              <p className="text-sm text-muted">Regente do decanato: {free.decanRuler}. Este regente não é o planeta que ativou o código.</p>
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-border bg-surface p-6">Ainda não há um mapa calculado para mostrar.</p>
        )}
        <section className="rounded-3xl bg-wine p-6 text-white">
          <h2 className="font-display text-3xl">A leitura completa integra este mapa</h2>
          <p className="mt-3 max-w-2xl text-gold-soft">
            {totalCodes > 1
              ? `Além deste encontro, há ${lockedCount} ${lockedCount === 1 ? "outro Código" : "outros Códigos"} neste mapa. A leitura completa reúne cerca de ${totalCodes} Códigos, a Luz e a Sombra no contexto de cada ponto e uma síntese.`
              : "A leitura completa reúne os Códigos deste mapa, a Luz e a Sombra no contexto de cada ponto e uma síntese."}
          </p>
          <p className="mt-4 text-lg">{preview.price ? formatBrl(preview.price.cents) : "Preço ainda não publicado"}</p>
          <Link href={completeHref} className="ui-button mt-4 inline-flex rounded-xl bg-white px-4 py-3 font-semibold text-wine">
            {completeLabel}
          </Link>
        </section>
        <p className="text-sm text-muted">{preview.disclaimer}</p>
      </div>
    </PageShell>
  );
}
