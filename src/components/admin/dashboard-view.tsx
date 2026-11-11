import Link from "next/link";
import { ChartCard } from "@/components/admin/charts/chart-card";
import { ComboChart } from "@/components/admin/charts/combo-chart";
import { DonutChart } from "@/components/admin/charts/donut-chart";
import { FunnelChart } from "@/components/admin/charts/funnel-chart";
import { KpiSparklines } from "@/components/admin/charts/kpi-sparklines";
import { DashboardPeriod } from "@/components/admin/dashboard-period";
import { Empty } from "@/components/admin/shell";
import { formatRelativePt, type DashboardViewModel } from "@/features/admin/dashboard";
import { orderStatusLabel } from "@/features/admin/orders";
import { formatBrl, formatDateTimePt } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  approved: "bg-gold-soft text-wine",
  pending: "bg-surface text-ink ring-1 ring-border",
  rejected: "bg-gold-soft/40 text-muted",
  cancelled: "bg-gold-soft/40 text-muted",
  refunded: "bg-gold-soft/70 text-ink",
};

export function DashboardView({ data }: { data: DashboardViewModel }) {
  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-4xl leading-tight md:text-5xl">
            {data.greeting}, {data.adminName}
          </h1>
          <span className="hairline mt-3 block" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted">
            {data.rangeLabel}
            {data.configured ? "" : " · Configure o Supabase para ver a operação real."}
          </p>
        </div>
        {data.canRead ? (
          <DashboardPeriod preset={data.range.preset} fromDate={data.range.fromDate} toDate={data.range.toDate} />
        ) : null}
      </header>

      {!data.configured ? (
        <Empty>Configure o Supabase para ver a operação real.</Empty>
      ) : !data.canRead ? (
        <Empty>Seu papel não acessa os números da operação.</Empty>
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
            <ComboChart series={data.series} />
            <div className="grid gap-4">
              <DonutChart slices={data.orderStatus} />
              <FunnelChart steps={data.funnel} />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <LeadList
              title="Últimos leads"
              empty="Nenhum lead ainda."
              rows={data.latestLeads}
              showConverted
            />
            <SaleList rows={data.latestSales} />
          </div>
          <UnconvertedList total={data.unconverted.total} rows={data.unconverted.rows} />
          <ErrorList rows={data.errors} />
        </>
      )}
    </div>
  );
}

function LeadList({
  title,
  empty,
  rows,
  showConverted = false,
}: {
  title: string;
  empty: string;
  rows: DashboardViewModel["latestLeads"];
  showConverted?: boolean;
}) {
  return (
    <ChartCard title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/admin/leads?ver=${row.id}`}
                className="grid gap-1 py-3 hover:bg-gold-soft/50 md:grid-cols-[1fr_auto] md:items-center"
              >
                <span>
                  <span className="block font-medium">{row.name}</span>
                  <span className="block text-sm text-muted">
                    {row.email}
                    {row.city ? ` · ${row.city}` : ""}
                  </span>
                </span>
                <span className="text-sm text-muted">
                  {showConverted ? (row.converted ? "Converteu" : row.hasChart ? "Com mapa" : "Sem compra") : formatRelativePt(row.createdAt)}
                  {showConverted ? ` · ${formatRelativePt(row.createdAt)}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}

function SaleList({ rows }: { rows: DashboardViewModel["latestSales"] }) {
  return (
    <ChartCard title="Últimas vendas">
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma venda ainda.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/admin/pedidos?ver=${row.id}`}
                className="grid gap-1 py-3 hover:bg-gold-soft/50 md:grid-cols-[1fr_auto] md:items-center"
              >
                <span>
                  <span className="block font-medium">{row.leadName}</span>
                  <span className="block text-sm text-muted">
                    {formatBrl(row.amountCents)}
                    {row.couponCode ? ` · ${row.couponCode}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-sm text-muted">
                  <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", STATUS_TONE[row.status] ?? "bg-gold-soft")}>
                    {orderStatusLabel(row.status)}
                  </span>
                  {formatDateTimePt(row.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}

function UnconvertedList({ total, rows }: { total: number; rows: DashboardViewModel["unconverted"]["rows"] }) {
  return (
    <ChartCard
      title={total === 1 ? "1 lead sem conversão" : `${total} leads sem conversão`}
      subtitle="Leads do período sem pedido aprovado. Abra o cadastro para seguir o contato."
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          {total === 0 ? "Nenhum lead sem conversão neste recorte." : "A lista visível está vazia."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/admin/leads?ver=${row.id}`}
                className="grid gap-1 py-3 hover:bg-gold-soft/50 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <span>
                  <span className="block font-medium">{row.name}</span>
                  <span className="block text-sm text-muted">
                    {row.email}
                    {row.city ? ` · ${row.city}` : ""}
                    {row.hasChart ? " · com mapa" : " · sem mapa"}
                  </span>
                </span>
                <span className="text-sm text-muted">{formatRelativePt(row.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {total > rows.length ? (
        <p className="mt-3 text-sm text-muted">Mostrando {rows.length} de {total}. Os demais estão em Leads.</p>
      ) : null}
    </ChartCard>
  );
}

function ErrorList({ rows }: { rows: DashboardViewModel["errors"] }) {
  return (
    <ChartCard title="Erros recentes" subtitle="Falhas de mapa, leitura, PDF e e-mail, com o texto gravado no banco.">
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma falha recente.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={row.href} className="grid gap-1 py-3 hover:bg-gold-soft/50">
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{row.title}</span>
                  <time className="text-sm text-muted" dateTime={row.at}>
                    {formatDateTimePt(row.at)}
                  </time>
                </span>
                <span className="text-sm text-muted">{row.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
