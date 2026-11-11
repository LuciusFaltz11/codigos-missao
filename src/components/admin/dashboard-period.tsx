"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PeriodPreset } from "@/features/admin/dashboard";
import { cn } from "@/lib/utils";

const PRESETS: Array<{ id: PeriodPreset; label: string; href: string }> = [
  { id: "7d", label: "7 dias", href: "/admin?periodo=7d" },
  { id: "15d", label: "15 dias", href: "/admin?periodo=15d" },
  { id: "mes", label: "Mês", href: "/admin?periodo=mes" },
  { id: "custom", label: "Personalizado", href: "/admin?periodo=custom" },
];

export function DashboardPeriod({
  preset,
  fromDate,
  toDate,
}: {
  preset: PeriodPreset;
  fromDate: string;
  toDate: string;
}) {
  const router = useRouter();
  const custom = preset === "custom";

  return (
    <div className="grid gap-3">
      <div role="group" aria-label="Período" className="flex flex-wrap rounded border border-border bg-surface p-1">
        {PRESETS.map((item) => {
          const active = item.id === "custom" ? custom : preset === item.id;
          const href =
            item.id === "custom" ? `/admin?periodo=custom&de=${fromDate}&ate=${toDate}` : item.href;
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
        action="/admin"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const de = String(data.get("de") ?? "");
          const ate = String(data.get("ate") ?? "");
          router.push(`/admin?periodo=custom&de=${encodeURIComponent(de)}&ate=${encodeURIComponent(ate)}`);
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
