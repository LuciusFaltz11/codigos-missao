import Link from "next/link";
import { notFound } from "next/navigation";
import { NatalWheel } from "@/components/chart/natal-wheel";
import { PageShell } from "@/components/site/chrome";
import { MissionCard } from "@/components/mission-cards/mission-card";
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

export default async function PreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const loaded = await loadFreePreview(token);
  if (!loaded) notFound();
  const { preview } = loaded;
  return (
    <PageShell>
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12">
        <div>
          <p className="text-sm text-muted">Resultado</p>
          <h1 className="mt-2 font-display text-4xl">Seu mapa astral</h1>
          <p className="mt-3 max-w-2xl text-muted">{(preview.errorCode && errorCopy[preview.errorCode]) || statusCopy[preview.status] || statusCopy.pending}</p>
        </div>
        <p className="text-sm">
          {preview.birth.cityLabel} · {preview.birth.localDate} · {preview.birth.localTime} · {preview.birth.timezone}
        </p>
        {preview.notice ? <p className="rounded-2xl bg-gold-soft px-4 py-3 text-sm">{preview.notice}</p> : null}
        {preview.chart ? (
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_320px]">
            <div className="rounded-3xl border border-border bg-surface p-4 sm:p-6">
              <NatalWheel chart={preview.chart} highlightPointId={preview.freeActivation?.pointId ?? null} />
            </div>
            {preview.freeActivation ? (
              <div className="grid gap-4">
                <p className="text-sm font-semibold tracking-wide text-wine uppercase">Código liberado</p>
                <MissionCard
                  archetype={preview.freeActivation.archetype}
                  keyword={preview.freeActivation.keyword}
                  element={preview.freeActivation.element}
                  signName={preview.freeActivation.signName}
                  decan={preview.freeActivation.decan}
                  light={preview.freeActivation.light}
                  shadow={preview.freeActivation.shadow}
                  imageUrl={preview.freeActivation.imageUrl}
                />
                <div className="grid gap-2">
                  <h2 className="font-display text-3xl">{preview.freeActivation.pointLabel}</h2>
                  <p>
                    {preview.freeActivation.signName} {preview.freeActivation.degreeLabel} · casa {preview.freeActivation.houseNumber}
                  </p>
                  <p className="text-sm text-muted">Regente do decanato: {preview.freeActivation.decanRuler}. Este regente não é o planeta que ativou o código.</p>
                </div>
              </div>
            ) : (
              <p className="rounded-2xl border border-border bg-surface p-6">Ainda não há um código da missão liberado para mostrar.</p>
            )}
          </div>
        ) : preview.freeActivation ? (
          <div className="grid items-start gap-8 md:grid-cols-[280px_1fr]">
            <MissionCard
              archetype={preview.freeActivation.archetype}
              keyword={preview.freeActivation.keyword}
              element={preview.freeActivation.element}
              signName={preview.freeActivation.signName}
              decan={preview.freeActivation.decan}
              light={preview.freeActivation.light}
              shadow={preview.freeActivation.shadow}
              imageUrl={preview.freeActivation.imageUrl}
            />
            <div className="grid gap-3">
              <h2 className="font-display text-3xl">{preview.freeActivation.pointLabel}</h2>
              <p>
                {preview.freeActivation.signName} {preview.freeActivation.degreeLabel} · casa {preview.freeActivation.houseNumber}
              </p>
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-border bg-surface p-6">Ainda não há um mapa calculado para mostrar.</p>
        )}
        {preview.ascendant ? (
          <p className="text-sm">Ascendente: {preview.ascendant.signName} {preview.ascendant.degreeLabel}. Ele aparece no mapa e não entra nas ativações enquanto a especialista não decidir.</p>
        ) : null}
        {preview.otherActivationCount !== null ? (
          <p className="text-sm">Há {preview.otherActivationCount} outros códigos calculados. Eles não aparecem nesta tela.</p>
        ) : null}
        <section className="rounded-3xl bg-wine p-6 text-white">
          <h2 className="font-display text-3xl">Você pode aprofundar sua leitura</h2>
          <p className="mt-3 max-w-2xl text-gold-soft">
            A leitura paga reúne as ativações calculadas, os padrões objetivos e uma síntese. O conteúdo só é liberado depois da confirmação da InfinitePay.
          </p>
          <p className="mt-4 text-lg">{preview.price ? formatBrl(preview.price.cents) : "Preço ainda não publicado"}</p>
          {preview.entitlement === "active" ? (
            <Link href={`/mapa/completo/${token}`} className="ui-button mt-4 inline-flex rounded-xl bg-white px-4 py-3 font-semibold text-wine">
              Abrir leitura completa
            </Link>
          ) : (
            <Link href={`/checkout/${token}`} className="ui-button mt-4 inline-flex rounded-xl bg-white px-4 py-3 font-semibold text-wine">
              Continuar para o pagamento
            </Link>
          )}
        </section>
        <p className="text-sm text-muted">{preview.disclaimer}</p>
      </div>
    </PageShell>
  );
}
