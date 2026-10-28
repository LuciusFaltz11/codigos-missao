"use client";

import { useMemo, useState, type ReactNode } from "react";
import { NatalWheel } from "@/components/chart/natal-wheel";
import { MissionCard } from "@/components/mission-cards/mission-card";
import type { NatalChartView } from "@/features/astrology/wheel";

export type ChartReadingCode = {
  archetype: string;
  keyword: string;
  decan: 1 | 2 | 3;
  decanRuler: string;
  light: string;
  shadow: string;
  imageUrl: string | null;
  element: string | null;
};

export type ChartReadingPoint = {
  pointId: string;
  pointLabel: string;
  signName: string;
  degreeLabel: string;
  houseNumber: number;
  unlocked: boolean;
  code: ChartReadingCode | null;
  interpretation?: string | null;
  invitation?: string | null;
  reflectiveQuestion?: string | null;
};

function ActivationFacts({ point }: { point: ChartReadingPoint }) {
  return (
    <div className="grid gap-1 text-sm">
      <p>
        {point.pointLabel} · {point.signName} {point.degreeLabel} · casa {point.houseNumber}
      </p>
      {point.code ? (
        <>
          <p>Decanato {point.code.decan}</p>
          <p className="text-muted">
            Regente do decanato: {point.code.decanRuler}. Este regente não é o planeta que ativou o código.
          </p>
        </>
      ) : null}
    </div>
  );
}

function ReadingPanel({
  point,
  bodyLabel,
  lockedAction,
  narrativePending = false,
}: {
  point: ChartReadingPoint | null;
  bodyLabel?: string | null;
  lockedAction?: ReactNode;
  narrativePending?: boolean;
}) {
  if (!point) {
    if (bodyLabel) {
      return (
        <aside className="rounded-3xl border border-border bg-surface p-6">
          <p className="text-xs font-semibold tracking-wide text-wine uppercase">{bodyLabel}</p>
          <p className="mt-3 text-sm text-muted">Este ponto aparece no mapa e não ativa um Código.</p>
        </aside>
      );
    }
    return (
      <aside className="rounded-3xl border border-border bg-surface p-6">
        <p className="text-sm text-muted">Selecione um ponto no mapa para ver o encontro com o Código.</p>
      </aside>
    );
  }

  if (!point.unlocked || !point.code) {
    return (
      <aside className="rounded-3xl border border-border bg-surface p-6">
        <p className="text-xs font-semibold tracking-wide text-wine uppercase">{point.pointLabel}</p>
        <h3 className="mt-2 font-display text-3xl">Este ponto também ativa um Código</h3>
        <p className="mt-3 text-sm">
          {point.signName} {point.degreeLabel} · casa {point.houseNumber}
        </p>
        <p className="mt-3 text-sm text-muted">
          A carta, a Luz, a Sombra e a leitura deste ponto entram na experiência completa. Aqui ele só aparece como posição do mapa.
        </p>
        {lockedAction ? <div className="mt-5">{lockedAction}</div> : null}
      </aside>
    );
  }

  return (
    <aside className="grid gap-5">
      <p className="text-sm font-semibold tracking-wide text-wine uppercase">Código liberado</p>
      <MissionCard
        archetype={point.code.archetype}
        keyword={point.code.keyword}
        element={point.code.element}
        signName={point.signName}
        decan={point.code.decan}
        light={point.code.light}
        shadow={point.code.shadow}
        imageUrl={point.code.imageUrl}
      />
      <div className="grid gap-2">
        <h3 className="font-display text-3xl">{point.pointLabel}</h3>
        <ActivationFacts point={point} />
      </div>
      {point.interpretation ? <p className="leading-7 whitespace-pre-line">{point.interpretation}</p> : null}
      {point.invitation ? <p className="text-sm leading-6 text-muted">{point.invitation}</p> : null}
      {point.reflectiveQuestion ? <p className="font-medium">{point.reflectiveQuestion}</p> : null}
      {narrativePending && !point.interpretation ? (
        <p className="text-sm leading-6 text-muted">
          A narrativa deste encontro está sendo preparada e chega automaticamente por e-mail. O Código, a Luz e a Sombra oficiais já estão aqui.
        </p>
      ) : null}
    </aside>
  );
}

export function ChartReadingExperience({
  chart,
  points,
  initialPointId,
  heading = "Mapa",
  lockedCount = 0,
  lockedAction,
  narrativePending = false,
}: {
  chart: NatalChartView;
  points: ChartReadingPoint[];
  initialPointId?: string | null;
  heading?: string;
  lockedCount?: number;
  lockedAction?: ReactNode;
  narrativePending?: boolean;
}) {
  const fallbackId = points.find((item) => item.unlocked)?.pointId ?? points[0]?.pointId ?? null;
  const [selectedPointId, setSelectedPointId] = useState<string | null>(initialPointId ?? fallbackId);
  const selected = points.find((item) => item.pointId === selectedPointId) ?? null;
  const selectedBody = chart.bodies.find((body) => body.pointId === selectedPointId) ?? null;
  const markedPointIds = points.filter((item) => item.unlocked && item.code).map((item) => item.pointId);
  const markerImages = useMemo(() => {
    const images: Record<string, string> = {};
    for (const item of points) {
      if (item.unlocked && item.code?.imageUrl) images[item.pointId] = item.code.imageUrl;
    }
    return images;
  }, [points]);
  const unlocked = points.filter((item) => item.unlocked && item.code);

  return (
    <section className="grid gap-8">
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_320px]">
        <div className="rounded-3xl border border-border bg-surface p-4 sm:p-6">
          <NatalWheel
            chart={chart}
            heading={heading}
            selectedPointId={selectedPointId}
            onSelectPoint={setSelectedPointId}
            markedPointIds={markedPointIds}
            markerImages={markerImages}
            showPositions={false}
          />
        </div>
        <div className="grid gap-5">
          <div className="grid gap-3">
            <p className="text-sm font-semibold tracking-wide text-wine uppercase">Legenda</p>
            {unlocked.length > 0 ? (
              <ul className="grid gap-3">
                {unlocked.map((item) => (
                  <li key={item.pointId}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left ${
                        item.pointId === selectedPointId ? "border-gold bg-gold-soft" : "border-border bg-surface"
                      }`}
                      onClick={() => setSelectedPointId(item.pointId)}
                    >
                      {item.code?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.code.imageUrl} alt="" className="h-12 w-8 rounded-md object-cover" />
                      ) : (
                        <span className="flex h-12 w-8 items-center justify-center rounded-md bg-gold-soft text-xs text-wine">
                          {item.pointLabel.slice(0, 2)}
                        </span>
                      )}
                      <span>
                        <span className="block font-medium">{item.code?.archetype}</span>
                        <span className="block text-sm text-wine uppercase">{item.code?.keyword}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nenhum Código está liberado neste mapa ainda.</p>
            )}
            {lockedCount > 0 ? (
              <p className="text-sm text-muted">
                {lockedCount} {lockedCount === 1 ? "ponto com Código" : "pontos com Código"} na leitura completa.
              </p>
            ) : null}
          </div>
          <ReadingPanel
            point={selected}
            bodyLabel={selected ? null : selectedBody?.label}
            lockedAction={lockedAction}
            narrativePending={narrativePending}
          />
        </div>
      </div>
      <nav aria-label="Pontos do mapa" className="grid gap-2">
        <p className="text-sm font-semibold tracking-wide text-wine uppercase">Pontos</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {chart.bodies.map((body) => {
            const activation = points.find((item) => item.pointId === body.pointId) ?? null;
            const isSelected = body.pointId === selectedPointId;
            return (
              <li key={body.pointId}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  className={`w-full rounded-2xl px-4 py-3 text-left text-sm ${isSelected ? "bg-gold-soft" : "bg-surface"}`}
                  onClick={() => setSelectedPointId(body.pointId)}
                >
                  <p className="font-medium">{body.label}</p>
                  <p>
                    {body.signName} {body.degreeLabel} · casa {body.houseNumber ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {activation?.unlocked && activation.code
                      ? `${activation.code.archetype} · ${activation.code.keyword}`
                      : activation
                        ? "Código na leitura completa"
                        : "Sem Código"}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </section>
  );
}
