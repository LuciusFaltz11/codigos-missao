import { ChartCard } from "@/components/admin/charts/chart-card";
import type { DashboardFunnelStep } from "@/features/admin/dashboard";

export function FunnelChart({ steps }: { steps: DashboardFunnelStep[] }) {
  const max = Math.max(1, ...steps.map((step) => step.count));
  return (
    <ChartCard title="Funil" subtitle="Do cadastro ao PDF enviado no período.">
      {steps.every((step) => step.count === 0) ? (
        <p className="py-8 text-sm text-muted">Ainda não há percurso neste recorte.</p>
      ) : (
        <ol className="grid gap-2">
          {steps.map((step, index) => {
            const width = Math.max(18, (step.count / max) * 100);
            const prev = steps[index - 1]?.count ?? step.count;
            const keep = prev > 0 ? Math.round((step.count / prev) * 100) : null;
            return (
              <li key={step.id} className="grid gap-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{step.label}</span>
                  <span className="text-muted">
                    {step.count}
                    {keep !== null && index > 0 ? ` · ${keep}% do passo anterior` : ""}
                  </span>
                </div>
                <div className="h-7 overflow-hidden rounded-sm bg-canvas">
                  <div
                    className="flex h-full items-center rounded-sm bg-wine px-2 text-xs text-white"
                    style={{ width: `${width}%`, opacity: 1 - index * 0.12 }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </ChartCard>
  );
}
