"use client";

import { useMemo, useState } from "react";
import { formatDeltaPct, type DashboardKpi } from "@/features/admin/dashboard";
import { cn } from "@/lib/utils";

export function KpiSparklines({ items }: { items: DashboardKpi[] }) {
  const [active, setActive] = useState<number | null>(null);
  if (items.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded border border-border bg-surface">
      <div className="grid grid-cols-2 divide-x divide-y divide-border md:min-w-[54rem] md:grid-cols-5 md:divide-y-0">
        {items.map((item) => (
          <article key={item.id} className="min-w-0 p-4">
            <p className="text-sm text-muted">{item.label}</p>
            <p className="mt-1 font-display text-3xl leading-none text-ink">{item.value}</p>
            <p
              className={cn(
                "mt-2 text-xs",
                item.deltaPct === null
                  ? "text-muted"
                  : item.deltaPct > 0
                    ? "text-success"
                    : item.deltaPct < 0
                      ? "text-danger"
                      : "text-muted",
              )}
            >
              {formatDeltaPct(item.deltaPct)}
            </p>
            <Sparkline
              values={item.series}
              active={active}
              onActive={setActive}
              label={item.label}
            />
          </article>
        ))}
      </div>
    </div>
  );
}

function Sparkline({
  values,
  active,
  onActive,
  label,
}: {
  values: number[];
  active: number | null;
  onActive: (index: number | null) => void;
  label: string;
}) {
  const max = useMemo(() => Math.max(1, ...values), [values]);
  if (values.length === 0) return <div className="mt-4 h-10" />;
  return (
    <div className="mt-4 flex h-10 items-end gap-px" role="img" aria-label={`Série diária de ${label}`}>
      {values.map((value, index) => (
        <span
          key={`${label}-${index}`}
          className="flex h-full min-w-0 flex-1 items-end"
          onMouseEnter={() => onActive(index)}
          onMouseLeave={() => onActive(null)}
        >
          <span
            className={cn(
              "w-full origin-bottom rounded-sm transition-colors",
              active === index ? "bg-gold" : "bg-wine/35",
            )}
            style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
          />
        </span>
      ))}
    </div>
  );
}
