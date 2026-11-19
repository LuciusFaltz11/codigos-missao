"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, Eye, X } from "lucide-react";
import { NatalWheel } from "@/components/chart/natal-wheel";
import {
  filterAdminLeads,
  leadFilterParam,
  type AdminLead,
  type LeadFilter,
} from "@/features/admin/leads";
import { formatDatePt, formatDateTimePt } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  complete: "Calculado",
  failed: "Falhou",
  pending: "Pendente",
  calculating: "Em cálculo",
  not_configured: "Motor ausente",
  license_unconfirmed: "Licença pendente",
};

const FILTERS: Array<{ id: LeadFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "unconverted", label: "Sem conversão" },
  { id: "unique", label: "Sem repetição" },
];

function chartLabel(status: string) {
  return STATUS_LABEL[status] ?? status;
}

const EMAIL_EXPORTS = [
  { scope: "all", label: "Todos os leads", href: "/api/admin/leads/export?kind=emails&scope=all" },
  { scope: "unconverted", label: "Apenas sem conversão", href: "/api/admin/leads/export?kind=emails&scope=unconverted" },
  { scope: "unique", label: "Todos, sem repetição", href: "/api/admin/leads/export?kind=emails&scope=unique" },
] as const;

function EmailExportMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded border border-line bg-surface px-3 py-2 text-sm hover:border-ink"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        Exportar apenas e-mails
        <ChevronDown className={cn("size-4", open ? "rotate-180" : "")} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Quais e-mails exportar"
          className="absolute right-0 z-20 mt-1 min-w-56 rounded border border-border bg-surface p-1 shadow-sm"
        >
          {EMAIL_EXPORTS.map((item) => (
            <a
              key={item.scope}
              role="menuitem"
              href={item.href}
              className="block rounded px-3 py-2 text-sm hover:bg-gold-soft"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function leadsUrl(filter: LeadFilter, id?: string | null) {
  const params = new URLSearchParams();
  const filtro = leadFilterParam(filter);
  if (filtro) params.set("filtro", filtro);
  if (id) params.set("ver", id);
  const query = params.toString();
  return query ? `/admin/leads?${query}` : "/admin/leads";
}

export function LeadsPanel({
  rows,
  initialId,
  initialFilter = "all",
  canExport = false,
}: {
  rows: AdminLead[];
  initialId?: string;
  initialFilter?: LeadFilter;
  canExport?: boolean;
}) {
  const [openId, setOpenId] = useState(initialId ?? null);
  const [filter, setFilter] = useState<LeadFilter>(initialFilter);
  const visible = useMemo(() => filterAdminLeads(rows, filter), [rows, filter]);
  const selected = visible.find((row) => row.id === openId) ?? rows.find((row) => row.id === openId) ?? null;

  useEffect(() => {
    setOpenId(initialId ?? null);
  }, [initialId]);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  function syncUrl(id: string | null, nextFilter = filter) {
    window.history.replaceState(null, "", leadsUrl(nextFilter, id));
  }

  function openLead(id: string) {
    setOpenId(id);
    syncUrl(id);
  }

  function closeDrawer() {
    setOpenId(null);
    syncUrl(null);
  }

  function applyFilter(next: LeadFilter) {
    setFilter(next);
    const stillVisible = filterAdminLeads(rows, next).some((row) => row.id === openId);
    const nextId = stillVisible ? openId : null;
    if (!stillVisible) setOpenId(null);
    syncUrl(nextId, next);
  }

  const latestChart = selected?.charts[0] ?? null;

  return (
    <>
      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div role="group" aria-label="Filtro de leads" className="flex flex-wrap rounded border border-border bg-surface p-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "rounded px-3 py-2 text-sm",
                filter === item.id ? "bg-wine text-white" : "text-ink hover:bg-gold-soft",
              )}
              aria-pressed={filter === item.id}
              onClick={() => applyFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {canExport ? (
          <div className="flex flex-wrap items-start gap-2">
            <a
              className="rounded border border-line bg-surface px-3 py-2 text-sm hover:border-ink"
              href="/api/admin/leads/export?kind=full"
            >
              Exportar planilha completa
            </a>
            <EmailExportMenu />
          </div>
        ) : null}
      </div>
      <p className="mt-3 text-sm text-muted">
        {visible.length === 1 ? "1 lead neste recorte." : `${visible.length} leads neste recorte.`}
        {filter === "unique" ? " Um cadastro por e-mail, o mais recente." : ""}
      </p>
      {visible.length === 0 ? (
        <p className="mt-6 rounded border border-dashed border-border bg-surface p-6 text-sm text-muted">
          Nenhum lead neste recorte.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-160 border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="w-12 py-2">
                  <span className="sr-only">Abrir</span>
                </th>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Cadastro</th>
                <th>Mapa</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-border hover:bg-gold-soft/70"
                  tabIndex={0}
                  aria-label={`Abrir ${row.name}`}
                  data-open={row.id === openId ? "true" : undefined}
                  onClick={() => openLead(row.id)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openLead(row.id);
                    }
                  }}
                >
                  <td className="py-2">
                    <button
                      type="button"
                      className="grid size-10 place-items-center rounded-lg text-wine hover:bg-gold-soft"
                      aria-label={`Abrir ${row.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        openLead(row.id);
                      }}
                    >
                      <Eye className="size-4" strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="font-medium">{row.name}</span>
                    {row.converted ? (
                      <span className="ml-2 inline-flex rounded bg-gold-soft px-2 py-0.5 text-xs font-semibold text-wine">
                        Comprou
                      </span>
                    ) : null}
                  </td>
                  <td>{row.email}</td>
                  <td>{formatDateTimePt(row.createdAt)}</td>
                  <td>{row.charts[0] ? chartLabel(row.charts[0].status) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog.Root
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
          {selected ? (
            <Dialog.Content className="admin-drawer fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-2xl flex-col bg-surface shadow-[-16px_0_40px_rgba(36,29,34,0.08)]">
              <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
                <div>
                  <Dialog.Title className="font-display text-3xl">{selected.name}</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-muted">{selected.email}</Dialog.Description>
                  {selected.converted ? (
                    <p className="mt-2">
                      <span className="inline-flex rounded bg-gold-soft px-2 py-0.5 text-xs font-semibold text-wine">
                        Comprou
                      </span>
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-muted">Ainda sem compra aprovada.</p>
                  )}
                </div>
                <Dialog.Close
                  className="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-gold-soft hover:text-ink"
                  aria-label="Fechar ficha do lead"
                >
                  <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
                </Dialog.Close>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <dl className="grid gap-3 text-sm">
                  <div>
                    <dt className="text-muted">Data de cadastro</dt>
                    <dd className="mt-1">{formatDateTimePt(selected.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Privacidade</dt>
                    <dd className="mt-1">
                      {selected.privacyAccepted == null
                        ? "Sem registro"
                        : selected.privacyAccepted
                          ? `Aceita${selected.policyVersion ? ` · ${selected.policyVersion}` : ""}`
                          : "Não aceita"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Comunicações</dt>
                    <dd className="mt-1">{selected.marketingOptIn ? "Aceita receber" : "Não aceita receber"}</dd>
                  </div>
                  {selected.birth ? (
                    <>
                      <div>
                        <dt className="text-muted">Nascimento</dt>
                        <dd className="mt-1">
                          {formatDatePt(selected.birth.date)} · {selected.birth.time} · {selected.birth.timezone}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted">Local</dt>
                        <dd className="mt-1">
                          {selected.birth.city}
                          {selected.birth.country ? ` · ${selected.birth.country}` : ""}
                        </dd>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted">Este lead ainda não tem registro de nascimento.</p>
                  )}
                </dl>
                {latestChart ? (
                  <div className="mt-8 grid gap-4">
                    <p className="text-sm text-muted">
                      {chartLabel(latestChart.status)}
                      {latestChart.engineStatus ? ` · motor ${latestChart.engineStatus}` : ""}
                      {latestChart.errorCode ? ` · ${latestChart.errorCode}` : ""}
                      {latestChart.createdAt ? ` · ${formatDateTimePt(latestChart.createdAt)}` : ""}
                    </p>
                    {latestChart.chart ? (
                      <NatalWheel
                        chart={latestChart.chart}
                        highlightPointId={latestChart.highlightPointId}
                        heading="Mapa gerado"
                      />
                    ) : (
                      <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
                        O mapa deste lead não tem posições calculadas para exibir.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-8 rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
                    Nenhum mapa foi gerado para este lead.
                  </p>
                )}
              </div>
            </Dialog.Content>
          ) : null}
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
