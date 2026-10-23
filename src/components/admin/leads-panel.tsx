"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Eye, X } from "lucide-react";
import { NatalWheel } from "@/components/chart/natal-wheel";
import type { AdminLead } from "@/features/admin/leads";
import { formatDatePt, formatDateTimePt } from "@/lib/formatters";

const STATUS_LABEL: Record<string, string> = {
  complete: "Calculado",
  failed: "Falhou",
  pending: "Pendente",
  calculating: "Em cálculo",
  not_configured: "Motor ausente",
  license_unconfirmed: "Licença pendente",
};

function chartLabel(status: string) {
  return STATUS_LABEL[status] ?? status;
}

export function LeadsPanel({ rows, initialId }: { rows: AdminLead[]; initialId?: string }) {
  const [openId, setOpenId] = useState(initialId ?? null);
  const selected = rows.find((row) => row.id === openId) ?? null;

  useEffect(() => {
    setOpenId(initialId ?? null);
  }, [initialId]);

  function syncUrl(id: string | null) {
    const url = id ? `/admin/leads?ver=${id}` : "/admin/leads";
    window.history.replaceState(null, "", url);
  }

  function openLead(id: string) {
    setOpenId(id);
    syncUrl(id);
  }

  function closeDrawer() {
    setOpenId(null);
    syncUrl(null);
  }

  const latestChart = selected?.charts[0] ?? null;

  return (
    <>
      <div className="mt-6 overflow-x-auto">
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
            {rows.map((row) => (
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
                <td>{row.name}</td>
                <td>{row.email}</td>
                <td>{formatDateTimePt(row.createdAt)}</td>
                <td>{row.charts[0] ? chartLabel(row.charts[0].status) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
