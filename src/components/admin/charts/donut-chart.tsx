"use client";

import { useMemo, useState } from "react";
import { ChartCard } from "@/components/admin/charts/chart-card";
import type { DashboardStatusSlice } from "@/features/admin/dashboard";

const COLORS: Record<string, string> = {
  approved: "#C7A96B",
  pending: "#1E332D",
  rejected: "#8C3A3A",
  cancelled: "#60605F",
  refunded: "#5679BC",
};

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlice(cx: number, cy: number, r0: number, r1: number, start: number, end: number) {
  const large = end - start > 180 ? 1 : 0;
  const p1 = polar(cx, cy, r1, start);
  const p2 = polar(cx, cy, r1, end);
  const p3 = polar(cx, cy, r0, end);
  const p4 = polar(cx, cy, r0, start);
  return `M ${p1.x} ${p1.y} A ${r1} ${r1} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${r0} ${r0} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
}

export function DonutChart({ slices }: { slices: DashboardStatusSlice[] }) {
  const [active, setActive] = useState<string | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  const arcs = useMemo(() => {
    let angle = 0;
    return slices.map((slice) => {
      const sweep = total ? (slice.count / total) * 360 : 0;
      const start = angle;
      const end = angle + Math.max(sweep, slice.count ? 0.8 : 0);
      angle += sweep;
      return { ...slice, start, end, color: COLORS[slice.status] ?? "#60605F" };
    });
  }, [slices, total]);
  const selected = arcs.find((slice) => slice.status === active) ?? arcs[0] ?? null;

  return (
    <ChartCard title="Pedidos" subtitle="Distribuição por estado no período.">
      {total === 0 ? (
        <p className="py-8 text-sm text-muted">Nenhum pedido neste recorte.</p>
      ) : (
        <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,11rem)_1fr]">
          <div className="relative mx-auto w-44">
            <svg viewBox="0 0 160 160" className="w-full" role="img" aria-label="Pedidos por estado">
              {arcs.map((slice) => (
                <path
                  key={slice.status}
                  d={donutSlice(80, 80, 46, 72, slice.start, slice.end)}
                  fill={slice.color}
                  opacity={active && active !== slice.status ? 0.35 : 1}
                  onMouseEnter={() => setActive(slice.status)}
                  onMouseLeave={() => setActive(null)}
                />
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
              <p className="font-display text-3xl leading-none">{selected?.count ?? total}</p>
              <p className="mt-1 text-xs text-muted">{selected?.label ?? "Pedidos"}</p>
            </div>
          </div>
          <ul className="grid gap-2 text-sm">
            {arcs.map((slice) => (
              <li key={slice.status}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left"
                  onMouseEnter={() => setActive(slice.status)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(slice.status)}
                  onBlur={() => setActive(null)}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: slice.color }} aria-hidden="true" />
                    {slice.label}
                  </span>
                  <span className="text-muted">
                    {slice.count} · {total ? Math.round((slice.count / total) * 100) : 0}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}
