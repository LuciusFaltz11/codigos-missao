"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PeriodPreset } from "@/features/admin/dashboard";
import { cn } from "@/lib/utils";

const PRESET_IDS: Array<{ id: PeriodPreset; label: string }> = [
  { id: "7d", label: "7 dias" },
  { id: "15d", label: "15 dias" },
  { id: "mes", label: "Mês" },
  { id: "custom", label: "Personalizado" },
];

function periodHref(basePath: string, preset: PeriodPreset, fromDate?: string, toDate?: string) {
  if (preset === "custom" && fromDate && toDate) {
    return `${basePath}?periodo=custom&de=${fromDate}&ate=${toDate}`;
  }
  return `${basePath}?periodo=${preset}`;
}

export function DashboardPeriod({
  preset,
  fromDate,
  toDate,
  basePath = "/admin",
}: {
  preset: PeriodPreset;
  fromDate: string;
  toDate: string;
  basePath?: string;
}) {
  const router = useRouter();
  const custom = preset === "custom";

  return (
    <div className="grid gap-3">
      <div role="group" aria-label="Período" className="flex flex-wrap rounded border border-border bg-surface p-1">
        {PRESET_IDS.map((item) => {
          const active = item.id === "custom" ? custom : preset === item.id;
          const href = periodHref(basePath, item.id, fromDate, toDate);
          return (
            <Link
              key={item.id}
              href={href}
              className={cn(
                "rounded px-3 py-2 text-sm",
                active ? "bg-wine text-white" : "text-ink hover:bg-gold-soft",
              )}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        action={basePath}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const de = String(data.get("de") ?? "");
          const ate = String(data.get("ate") ?? "");
          router.push(`${basePath}?periodo=custom&de=${encodeURIComponent(de)}&ate=${encodeURIComponent(ate)}`);
        }}
      >
        <input type="hidden" name="periodo" value="custom" />
        <label className="grid gap-1 text-xs text-muted">
          De
          <input
            className="input-shell-field min-h-10 rounded border border-line bg-surface px-2 text-sm text-ink"
            type="date"
            name="de"
            defaultValue={fromDate}
            required
          />
        </label>
        <label className="grid gap-1 text-xs text-muted">
          Até
          <input
            className="input-shell-field min-h-10 rounded border border-line bg-surface px-2 text-sm text-ink"
            type="date"
            name="ate"
            defaultValue={fromDate && toDate ? toDate : fromDate}
            required
          />
        </label>
        <button className="min-h-10 rounded border border-line bg-surface px-3 text-sm hover:border-ink" type="submit">
          Aplicar
        </button>
      </form>
    </div>
  );
}
