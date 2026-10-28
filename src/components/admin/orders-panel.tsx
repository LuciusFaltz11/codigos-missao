"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Eye, X } from "lucide-react";
import {
  orderStatusLabel,
  paymentProviderLabel,
  type AdminOrder,
} from "@/features/admin/orders";
import { formatBrl, formatDateTimePt } from "@/lib/formatters";

const STATUS_TONE: Record<string, string> = {
  approved: "bg-gold-soft text-wine",
  pending: "bg-surface text-ink ring-1 ring-border",
  rejected: "bg-gold-soft/40 text-muted",
  cancelled: "bg-gold-soft/40 text-muted",
  refunded: "bg-gold-soft/70 text-ink",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[status] ?? "bg-gold-soft text-ink"}`}>
      {orderStatusLabel(status)}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-1 break-all">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-semibold tracking-wide text-wine uppercase">{title}</h3>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function originLabel(order: AdminOrder) {
  const provider = order.payments[0]?.provider;
  if (provider) return paymentProviderLabel(provider);
  if (order.couponCode && order.amountCents === 0) return "Cupom";
  return "—";
}

export function OrdersPanel({ rows, initialId }: { rows: AdminOrder[]; initialId?: string }) {
  const [openId, setOpenId] = useState(initialId ?? null);
  const selected = rows.find((row) => row.id === openId) ?? null;

  useEffect(() => {
    setOpenId(initialId ?? null);
  }, [initialId]);

  function syncUrl(id: string | null) {
    window.history.replaceState(null, "", id ? `/admin/pedidos?ver=${id}` : "/admin/pedidos");
  }

  function openOrder(id: string) {
    setOpenId(id);
    syncUrl(id);
  }

  function closeDrawer() {
    setOpenId(null);
    syncUrl(null);
  }

  return (
    <>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-160 border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="w-12 py-2">
                <span className="sr-only">Abrir</span>
              </th>
              <th className="py-2 pr-4">Data</th>
              <th className="py-2 pr-4">Cliente</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Cobrado</th>
              <th className="py-2 pr-4">Cupom</th>
              <th className="py-2">Origem</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-border hover:bg-gold-soft/70"
                tabIndex={0}
                aria-label={`Abrir pedido de ${row.leadName}`}
                data-open={row.id === openId ? "true" : undefined}
                onClick={() => openOrder(row.id)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openOrder(row.id);
                  }
                }}
              >
                <td className="py-2">
                  <button
                    type="button"
                    className="grid size-10 place-items-center rounded-lg text-wine hover:bg-gold-soft"
                    aria-label={`Abrir pedido de ${row.leadName}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      openOrder(row.id);
                    }}
                  >
                    <Eye className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </td>
                <td className="py-3 pr-4 whitespace-nowrap">{formatDateTimePt(row.createdAt)}</td>
                <td className="py-3 pr-4">
                  <p className="font-medium">{row.leadName}</p>
                  <p className="text-muted">{row.leadEmail}</p>
                </td>
                <td className="py-3 pr-4">
                  <StatusPill status={row.status} />
                </td>
                <td className="py-3 pr-4">
                  <p>{formatBrl(row.amountCents)}</p>
                  {row.discountCents > 0 ? (
                    <p className="text-muted">
                      <span className="line-through">{formatBrl(row.originalCents)}</span>
                      {row.couponCode ? ` · ${row.couponCode}` : ""}
                    </p>
                  ) : null}
                </td>
                <td className="py-3 pr-4">{row.couponCode ?? "—"}</td>
                <td className="py-3">{originLabel(row)}</td>
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
                  <Dialog.Title className="font-display text-3xl">{selected.leadName}</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-muted">
                    {orderStatusLabel(selected.status)} · {formatBrl(selected.amountCents)}
                    {selected.couponCode ? ` · ${selected.couponCode}` : ""}
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  className="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-gold-soft hover:text-ink"
                  aria-label="Fechar ficha do pedido"
                >
                  <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
                </Dialog.Close>
              </div>
              <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-5">
                <Section title="Pedido">
                  <Field label="Status">
                    <StatusPill status={selected.status} />
                  </Field>
                  <Field label="Criado em">{formatDateTimePt(selected.createdAt)}</Field>
                  <Field label="Atualizado em">{formatDateTimePt(selected.updatedAt)}</Field>
                  <Field label="Referência externa">{selected.externalReference}</Field>
                  <Field label="ID do pedido">{selected.id}</Field>
                  <Field label="ID do mapa">{selected.chartId}</Field>
                </Section>

                <Section title="Valores">
                  <Field label="Valor original">{formatBrl(selected.originalCents)}</Field>
                  <Field label="Desconto">
                    {selected.discountCents > 0 ? `−${formatBrl(selected.discountCents)}` : "Sem desconto"}
                  </Field>
                  <Field label="Valor cobrado">{formatBrl(selected.amountCents)}</Field>
                  <Field label="Moeda">{selected.currency}</Field>
                </Section>

                <Section title="Cupom">
                  <Field label="Código">{selected.couponCode ?? "Nenhum cupom"}</Field>
                  <Field label="Nome">{selected.couponName ?? "—"}</Field>
                  <Field label="Tipo">
                    {selected.couponKind === "percent"
                      ? `${selected.couponPercent}%`
                      : selected.couponKind === "fixed" && selected.couponAmountCents != null
                        ? formatBrl(selected.couponAmountCents)
                        : "—"}
                  </Field>
                  <Field label="ID do cupom">{selected.couponId ?? "—"}</Field>
                </Section>

                <Section title="Cliente">
                  <Field label="Nome">{selected.leadName}</Field>
                  <Field label="E-mail">{selected.leadEmail}</Field>
                  <Field label="Lead">
                    <Link className="font-semibold text-wine" href={`/admin/leads?ver=${selected.leadId}`}>
                      Abrir ficha do lead
                    </Link>
                  </Field>
                </Section>

                <Section title="Produto">
                  <Field label="Nome">{selected.productName ?? "—"}</Field>
                  <Field label="Preço atual do catálogo">
                    {selected.productPriceCents == null ? "—" : formatBrl(selected.productPriceCents)}
                  </Field>
                  <Field label="ID do produto">{selected.productId}</Field>
                </Section>

                <section className="grid gap-3">
                  <h3 className="text-sm font-semibold tracking-wide text-wine uppercase">Pagamentos</h3>
                  {selected.payments.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
                      Nenhum pagamento registrado neste pedido.
                    </p>
                  ) : (
                    <ul className="grid gap-3">
                      {selected.payments.map((payment) => (
                        <li key={payment.id} className="rounded-2xl border border-border p-4 text-sm">
                          <dl className="grid gap-3 sm:grid-cols-2">
                            <Field label="Provedor">{paymentProviderLabel(payment.provider)}</Field>
                            <Field label="Status">{orderStatusLabel(payment.status)}</Field>
                            <Field label="Valor">{formatBrl(payment.amountCents)}</Field>
                            <Field label="Quando">{formatDateTimePt(payment.createdAt)}</Field>
                            <Field label="ID no provedor">{payment.providerPaymentId}</Field>
                            <Field label="ID interno">{payment.id}</Field>
                          </dl>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <Section title="Checkout">
                  <Field label="Slug InfinitePay">{selected.preferenceId ?? "—"}</Field>
                  <Field label="Link de pagamento">
                    {selected.initPoint ? (
                      <a className="font-semibold text-wine" href={selected.initPoint} target="_blank" rel="noreferrer">
                        Abrir checkout
                      </a>
                    ) : (
                      "Não gerado"
                    )}
                  </Field>
                </Section>

                <Section title="Acesso">
                  <Field label="Entitlement">{selected.entitlement ? "Concedido" : "Ainda não liberado"}</Field>
                  <Field label="Concedido em">
                    {selected.entitlement ? formatDateTimePt(selected.entitlement.grantedAt) : "—"}
                  </Field>
                  <Field label="Revogado em">
                    {selected.entitlement?.revokedAt ? formatDateTimePt(selected.entitlement.revokedAt) : "—"}
                  </Field>
                  <Field label="Reembolso em análise">
                    {selected.entitlement?.refundPendingPolicy ? "Sim" : "Não"}
                  </Field>
                  <Field label="ID do entitlement">{selected.entitlement?.id ?? "—"}</Field>
                </Section>

                <Section title="Leitura">
                  <Field label="Status">{selected.reading ? selected.reading.status : "Não gerada"}</Field>
                  <Field label="Modelo">{selected.reading?.model ?? "—"}</Field>
                  <Field label="Versão do prompt">{selected.reading?.promptVersion ?? "—"}</Field>
                  <Field label="Erro">{selected.reading?.lastError ?? "—"}</Field>
                  <Field label="Criada em">
                    {selected.reading ? formatDateTimePt(selected.reading.createdAt) : "—"}
                  </Field>
                </Section>

                <Section title="PDF">
                  <Field label="Status">{selected.report ? selected.report.status : "Não gerado"}</Field>
                  <Field label="Arquivo">{selected.report?.storagePath ?? "—"}</Field>
                  <Field label="Criado em">
                    {selected.report ? formatDateTimePt(selected.report.createdAt) : "—"}
                  </Field>
                </Section>

                <section className="grid gap-3">
                  <h3 className="text-sm font-semibold tracking-wide text-wine uppercase">E-mails</h3>
                  {selected.emails.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
                      Nenhum e-mail enviado para este pedido.
                    </p>
                  ) : (
                    <ul className="grid gap-3">
                      {selected.emails.map((email) => (
                        <li key={email.id} className="rounded-2xl border border-border p-4 text-sm">
                          <dl className="grid gap-3 sm:grid-cols-2">
                            <Field label="Status">{email.status}</Field>
                            <Field label="Quando">{formatDateTimePt(email.createdAt)}</Field>
                            <Field label="ID do provedor">{email.providerId ?? "—"}</Field>
                            <Field label="Erro">{email.lastError ?? "—"}</Field>
                          </dl>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </Dialog.Content>
          ) : null}
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
