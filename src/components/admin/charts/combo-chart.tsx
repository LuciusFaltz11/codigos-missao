"use client";

import { useMemo, useState } from "react";
import { ChartCard, ChartLegend } from "@/components/admin/charts/chart-card";
import type { DailyPoint } from "@/features/admin/dashboard";
import { cn } from "@/lib/utils";

const WINE = "#1E332D";
const GOLD = "#C7A96B";

export function ComboChart({ series }: { series: DailyPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = useMemo(() => Math.max(1, ...series.flatMap((point) => [point.leads, point.sales])), [series]);
  const width = 640;
  const height = 220;
  const pad = { top: 12, right: 8, bottom: 28, left: 28 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const barW = series.length ? innerW / series.length : 0;
  const points = series.map((point, index) => {
    const x = pad.left + barW * index + barW / 2;
    const y = pad.top + innerH - (point.sales / max) * innerH;
    return `${x},${y}`;
  });
  const hovered = active !== null ? series[active] : null;
  const labelEvery = series.length > 20 ? 4 : series.length > 12 ? 2 : 1;

  return (
    <ChartCard
      title="Leads e vendas"
      subtitle="Barras de leads com a linha de compras aprovadas no período."
      action={<ChartLegend items={[{ color: WINE, label: "Leads" }, { color: GOLD, label: "Vendas" }]} />}
    >
      {series.length === 0 ? (
        <p className="py-10 text-sm text-muted">Sem movimento neste recorte.</p>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label="Comparativo diário de leads e vendas">
            {[0.25, 0.5, 0.75, 1].map((tick) => {
              const y = pad.top + innerH - innerH * tick;
              return (
                <g key={tick}>
                  <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />
                  <text x={pad.left - 6} y={y + 4} textAnchor="end" className="fill-muted" fontSize="10">
                    {Math.round(max * tick)}
                  </text>
                </g>
              );
            })}
            {series.map((point, index) => {
              const x = pad.left + barW * index + barW * 0.18;
              const barHeight = (point.leads / max) * innerH;
              return (
                <rect
                  key={point.date}
                  x={x}
                  y={pad.top + innerH - barHeight}
                  width={barW * 0.64}
                  height={Math.max(point.leads ? 2 : 0, barHeight)}
                  rx="2"
                  fill={active === index ? GOLD : WINE}
                  opacity={active === null || active === index ? 1 : 0.35}
                  className="origin-bottom"
                />
              );
            })}
            {points.length > 1 ? (
              <polyline
                fill="none"
                stroke={GOLD}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points.join(" ")}
              />
            ) : null}
            {series.map((point, index) => {
              const x = pad.left + barW * index + barW / 2;
              const y = pad.top + innerH - (point.sales / max) * innerH;
              return (
                <circle
                  key={`${point.date}-dot`}
                  cx={x}
                  cy={y}
                  r={active === index ? 5 : 3}
                  fill={GOLD}
                  stroke="white"
                  strokeWidth="1.5"
                />
              );
            })}
            {series.map((point, index) =>
              index % labelEvery === 0 ? (
                <text
                  key={`${point.date}-label`}
                  x={pad.left + barW * index + barW / 2}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-muted"
                  fontSize="10"
                >
                  {point.label}
                </text>
              ) : null,
            )}
            {series.map((point, index) => (
              <rect
                key={`${point.date}-hit`}
                x={pad.left + barW * index}
                y={pad.top}
                width={barW}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
              />
            ))}
          </svg>
          {hovered ? (
            <p className={cn("pointer-events-none absolute top-0 right-0 rounded border border-border bg-canvas px-3 py-2 text-xs text-ink")}>
              {hovered.label}: {hovered.leads} leads · {hovered.sales} vendas
            </p>
          ) : null}
        </div>
      )}
    </ChartCard>
  );
}
