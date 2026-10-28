import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChartReadingExperience, type ChartReadingPoint } from "@/components/chart/chart-reading";
import { ReadingDeliveryPanel } from "@/components/chart/reading-delivery";
import { PageShell } from "@/components/site/chrome";
import { DISCLAIMER, pointLabel, signBySlug } from "@/lib/constants/astrology";
import { formatDegree } from "@/features/astrology/longitude";
import { buildNatalChart, longitudeFromAngle, parseCusps, parseWheelPositions } from "@/features/astrology/wheel";
import { cardArtDisplayUrl } from "@/features/missions/card-art";
import { loadChartByToken } from "@/server/services/charts";
import { loadReadingProgress } from "@/server/services/reading-access";

export const dynamic = "force-dynamic";

export default async function CompleteReadingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const loaded = await loadChartByToken(token);
  if (!loaded) notFound();
  if (loaded.entitlement !== "active" || !loaded.entitlementId) redirect(`/mapa/resultado/${token}`);

  const progress = await loadReadingProgress(loaded.service, {
    chartId: loaded.chartId,
    entitlementId: loaded.entitlementId,
  });
  const interpretation = progress.interpretation;
  const houses = Object.fromEntries(loaded.activations.map((item) => [item.natalPointId, item.houseNumber]));
  const chart = buildNatalChart({
    ascendantLongitude: longitudeFromAngle(loaded.ascendant),
    midheavenLongitude: longitudeFromAngle(loaded.midheaven),
    cusps: parseCusps(loaded.cusps),
    positions: parseWheelPositions(loaded.positions),
    houses,
    omitFortune: loaded.snapshot.fortunaRule === "pending_approval",
  });
  const points: ChartReadingPoint[] = loaded.activations.map((activation) => {
    const item = interpretation
      ? interpretation.individual_readings.find((entry) => entry.activation_id === activation.id)
      : null;
    return {
      pointId: activation.natalPointId,
      pointLabel: pointLabel(activation.natalPointId),
      signName: activation.signName,
      degreeLabel: formatDegree(activation.degreeWithinSign),
      houseNumber: activation.houseNumber,
      unlocked: true,
      code: {
        archetype: activation.code.archetype,
        keyword: activation.code.keyword,
        decan: activation.code.decan,
        decanRuler: activation.code.decanRuler,
        light: activation.code.light,
        shadow: activation.code.shadow,
        imageUrl: cardArtDisplayUrl(activation.code.id, activation.code.imageUrl),
        element: signBySlug(activation.signSlug)?.element ?? null,
      },
      interpretation: item?.interpretation ?? null,
      reflectiveQuestion: item?.reflective_question ?? null,
    };
  });

  return (
    <PageShell>
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12">
        <h1 className="font-display text-4xl">Leitura completa</h1>
        <ReadingDeliveryPanel token={token} initial={progress.delivery} lastError={progress.lastError} />
        <p className="text-sm text-muted">{DISCLAIMER}</p>
        {chart ? (
          <ChartReadingExperience
            chart={chart}
            points={points}
            initialPointId={loaded.snapshot.freePreviewPoint}
            heading="Mapa e Códigos"
            narrativePending={!progress.delivery.interpretationReady}
          />
        ) : (
          <p className="rounded-2xl border border-border bg-surface p-6">O mapa desta leitura ainda não tem posições para exibir.</p>
        )}
        {interpretation ? (
          <section id="sintese" className="grid gap-4 border-t border-border pt-8">
            <h2 className="font-display text-3xl">Síntese</h2>
            {interpretation.patterns.map((pattern) => (
              <article key={pattern.pattern_id}>
                <h3 className="font-semibold">{pattern.theme}</h3>
                <p className="mt-2 leading-7">{pattern.insight}</p>
              </article>
            ))}
            <p className="leading-7">{interpretation.overall_synthesis}</p>
            <p className="leading-7">{interpretation.closing_reflection}</p>
          </section>
        ) : null}
        <Link href={`/mapa/resultado/${token}`} className="text-sm text-wine">
          Voltar à prévia
        </Link>
      </div>
    </PageShell>
  );
}
