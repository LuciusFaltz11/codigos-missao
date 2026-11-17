import Link from "next/link";
import { ChartCard } from "@/components/admin/charts/chart-card";
import { DonutChart } from "@/components/admin/charts/donut-chart";
import { KpiSparklines } from "@/components/admin/charts/kpi-sparklines";
import { TokenTrendChart } from "@/components/admin/charts/token-trend-chart";
import { DashboardPeriod } from "@/components/admin/dashboard-period";
import { Empty } from "@/components/admin/shell";
import type { TokensViewModel } from "@/features/admin/tokens";
import { formatDateTimePt, formatTokenCount, formatUsd } from "@/lib/formatters";

export function TokensView({ data }: { data: TokensViewModel }) {
  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-4xl leading-tight md:text-5xl">Tokens</h1>
          <span className="hairline mt-3 block" aria-hidden="true" />
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Uso de IA nas leituras completas de {data.rangeLabel}. A média por pedido soma todas as leituras daquele
            pedido, inclusive reprocessamentos.
            {data.configured ? "" : " Configure o Supabase para ver o gasto real."}
          </p>
        </div>
        {data.canRead ? (
          <DashboardPeriod
            preset={data.range.preset}
            fromDate={data.range.fromDate}
            toDate={data.range.toDate}
            basePath="/admin/tokens"
          />
        ) : null}
      </header>

      {!data.configured ? (
        <Empty>Configure o Supabase para ver o gasto de IA.</Empty>
      ) : !data.canRead ? (
        <Empty>Seu papel não acessa os números de tokens.</Empty>
      ) : (
        <>
          <KpiSparklines items={data.kpis} />
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            {data.extras.map((item) => (
              <li key={item.label}>
                <span className="text-ink">{item.label}</span> {item.value}
              </li>
            ))}
          </ul>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,1fr)]">
            <TokenTrendChart series={data.series} />
            <div className="grid gap-4">
              <DonutChart
                slices={data.mix}
                title="Mix"
                subtitle="Entrada custa menos que saída. No gpt-4.1 a saída vale 4 vezes mais."
                ariaLabel="Tokens de entrada e saída"
                empty="Nenhuma leitura com tokens neste recorte."
              />
              <ModelList models={data.models} />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <HeavyOrders rows={data.heavyOrders} />
            <RecentReadings rows={data.recent} />
          </div>
          <p className="text-sm text-muted">
            {data.pricingNote}
            {data.missingUsage
              ? ` ${data.missingUsage} leitura${data.missingUsage === 1 ? "" : "s"} completa${data.missingUsage === 1 ? "" : "s"} sem token_usage ficaram de fora da média.`
              : ""}
          </p>
        </>
      )}
    </div>
  );
}

function ModelList({ models }: { models: TokensViewModel["models"] }) {
  return (
    <ChartCard title="Modelos" subtitle="Gasto estimado pelo modelo gravado em cada leitura.">
      {models.length === 0 ? (
        <p className="text-sm text-muted">Nenhum modelo neste recorte.</p>
      ) : (
        <ul className="divide-y divide-border">
          {models.map((row) => (
            <li key={row.model} className="flex items-baseline justify-between gap-3 py-3 text-sm">
              <span>
                <span className="block font-medium">{row.model}</span>
                <span className="text-muted">
                  {row.readings === 1 ? "1 leitura" : `${row.readings} leituras`} · {formatTokenCount(row.tokens)} tokens
                </span>
              </span>
              <span>{formatUsd(row.usd)}</span>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}

function HeavyOrders({ rows }: { rows: TokensViewModel["heavyOrders"] }) {
  return (
    <ChartCard title="Pedidos mais caros" subtitle="Tokens somados por pedido no período, do maior para o menor.">
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nenhum pedido com leitura neste recorte.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.orderId}>
              <Link
                href={`/admin/pedidos?ver=${row.orderId}`}
                className="grid gap-1 py-3 hover:bg-gold-soft/50 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <span>
                  <span className="block font-medium">{formatTokenCount(row.totalTokens)} tokens</span>
                  <span className="block text-sm text-muted">
                    {row.readings === 1 ? "1 leitura" : `${row.readings} leituras`} · {formatTokenCount(row.inputTokens)}{" "}
                    in · {formatTokenCount(row.outputTokens)} out
                  </span>
                </span>
                <span className="text-sm">{formatUsd(row.usd)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}

function RecentReadings({ rows }: { rows: TokensViewModel["recent"] }) {
  return (
    <ChartCard title="Leituras recentes" subtitle="Uso gravado em cada leitura completa do período.">
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma leitura completa neste recorte.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={row.orderId ? `/admin/pedidos?ver=${row.orderId}` : "/admin/relatorios"}
                className="grid gap-1 py-3 hover:bg-gold-soft/50 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <span>
                  <span className="block font-medium">{formatTokenCount(row.totalTokens)} tokens</span>
                  <span className="block text-sm text-muted">
                    {row.model} · {formatTokenCount(row.inputTokens)} in · {formatTokenCount(row.outputTokens)} out
                  </span>
                </span>
                <span className="text-right text-sm">
                  <span className="block">{formatUsd(row.usd)}</span>
                  <time className="text-muted" dateTime={row.createdAt}>
                    {formatDateTimePt(row.createdAt)}
                  </time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
