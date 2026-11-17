"use client";

import { useMemo, useState } from "react";
import { ChartCard, ChartLegend } from "@/components/admin/charts/chart-card";
import type { TokenDailyPoint } from "@/features/admin/tokens";
import { formatTokenCount, formatUsd } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const WINE = "#1E332D";
const GOLD = "#C7A96B";
const INK = "#0B0A09";

export function TokenTrendChart({ series }: { series: TokenDailyPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const maxTokens = useMemo(
    () => Math.max(1, ...series.map((point) => point.totalTokens)),
    [series],
  );
  const maxUsd = useMemo(() => Math.max(0.01, ...series.map((point) => point.usd)), [series]);
  const width = 640;
  const height = 220;
  const pad = { top: 12, right: 44, bottom: 28, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const barW = series.length ? innerW / series.length : 0;
  const points = series.map((point, index) => {
    const x = pad.left + barW * index + barW / 2;
    const y = pad.top + innerH - (point.usd / maxUsd) * innerH;
    return `${x},${y}`;
  });
  const hovered = active !== null ? series[active] : null;
  const labelEvery = series.length > 20 ? 4 : series.length > 12 ? 2 : 1;

  return (
    <ChartCard
      title="Tokens e gasto"
      subtitle="Barras de entrada e saída, com a linha do custo estimado em dólar."
      action={
        <ChartLegend
          items={[
            { color: WINE, label: "Entrada" },
            { color: GOLD, label: "Saída" },
            { color: INK, label: "Gasto" },
          ]}
        />
      }
    >
      {series.length === 0 ? (
        <p className="py-10 text-sm text-muted">Sem uso de IA neste recorte.</p>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label="Tokens e gasto diário de IA">
            {[0.25, 0.5, 0.75, 1].map((tick) => {
              const y = pad.top + innerH - innerH * tick;
              return (
                <g key={tick}>
                  <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />
                  <text x={pad.left - 6} y={y + 4} textAnchor="end" className="fill-muted" fontSize="9">
                    {formatTokenCount(maxTokens * tick)}
                  </text>
                  <text x={width - pad.right + 6} y={y + 4} textAnchor="start" className="fill-muted" fontSize="9">
                    {formatUsd(maxUsd * tick)}
                  </text>
                </g>
              );
            })}
            {series.map((point, index) => {
              const x = pad.left + barW * index + barW * 0.18;
              const widthBar = barW * 0.64;
              const inputH = (point.inputTokens / maxTokens) * innerH;
              const outputH = (point.outputTokens / maxTokens) * innerH;
              const faded = active !== null && active !== index;
              return (
                <g key={point.date} opacity={faded ? 0.35 : 1}>
                  <rect
                    x={x}
                    y={pad.top + innerH - inputH}
                    width={widthBar}
                    height={Math.max(point.inputTokens ? 2 : 0, inputH)}
                    rx="1"
                    fill={WINE}
                  />
                  <rect
                    x={x}
                    y={pad.top + innerH - inputH - outputH}
                    width={widthBar}
                    height={Math.max(point.outputTokens ? 2 : 0, outputH)}
                    rx="1"
                    fill={GOLD}
                  />
                </g>
              );
            })}
            {points.length > 1 ? (
              <polyline
                fill="none"
                stroke={INK}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points.join(" ")}
              />
            ) : null}
            {series.map((point, index) => {
              const x = pad.left + barW * index + barW / 2;
              const y = pad.top + innerH - (point.usd / maxUsd) * innerH;
              return (
                <circle
                  key={`${point.date}-dot`}
                  cx={x}
                  cy={y}
                  r={active === index ? 5 : 3}
                  fill={INK}
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
              {hovered.label}: {formatTokenCount(hovered.totalTokens)} tokens · {formatUsd(hovered.usd)}
            </p>
          ) : null}
        </div>
      )}
    </ChartCard>
  );
}
