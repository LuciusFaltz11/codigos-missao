"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, Plus, X } from "lucide-react";
import { KIND_LABEL, couponDiscountLabel, type AdminCouponRow, type CouponKind } from "@/features/admin/coupons";
import { formatDateTimePt } from "@/lib/formatters";
import { Input, InputShell, Select } from "@/components/ui/input";
import { createCoupon, updateCoupon } from "@/server/actions/admin";

export function CouponsPanel({
  rows,
  canManage,
  initialId,
  creating,
}: {
  rows: AdminCouponRow[];
  canManage: boolean;
  initialId?: string;
  creating?: boolean;
}) {
  const [openId, setOpenId] = useState(initialId ?? null);
  const [createOpen, setCreateOpen] = useState(Boolean(creating));
  const selected = rows.find((row) => row.id === openId) ?? null;

  useEffect(() => {
    setOpenId(initialId ?? null);
    setCreateOpen(Boolean(creating));
  }, [initialId, creating]);

  function syncUrl(next: { id?: string | null; novo?: boolean }) {
    const params = new URLSearchParams();
    if (next.novo) params.set("novo", "1");
    else if (next.id) params.set("editar", next.id);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/admin/cupons?${qs}` : "/admin/cupons");
  }

  function openCoupon(id: string) {
    setCreateOpen(false);
    setOpenId(id);
    syncUrl({ id });
  }

  function openCreate() {
    setOpenId(null);
    setCreateOpen(true);
    syncUrl({ novo: true });
  }

  function closeDrawer() {
    setOpenId(null);
    setCreateOpen(false);
    syncUrl({});
  }

  return (
    <>
      {canManage ? (
        <div className="mt-4">
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-wine px-4 text-sm text-white"
            onClick={openCreate}
          >
            <Plus className="size-4" strokeWidth={1.75} aria-hidden="true" />
            Novo cupom
          </button>
        </div>
      ) : null}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-160 border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="w-12 py-2">
                <span className="sr-only">Editar</span>
              </th>
              <th>Nome</th>
              <th>Código</th>
              <th>Desconto</th>
              <th>Estado</th>
              <th>Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-border hover:bg-gold-soft/70"
                tabIndex={0}
                aria-label={`Editar ${row.name}`}
                onClick={() => openCoupon(row.id)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openCoupon(row.id);
                  }
                }}
              >
                <td className="py-2">
                  <button
                    type="button"
                    className="grid size-10 place-items-center rounded-lg text-wine hover:bg-gold-soft"
                    aria-label={`Editar ${row.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      openCoupon(row.id);
                    }}
                  >
                    <Pencil className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </td>
                <td>{row.name}</td>
                <td className="font-medium tracking-wide">{row.code}</td>
                <td>{couponDiscountLabel(row)}</td>
                <td>{row.active ? "Ativo" : "Inativo"}</td>
                <td>{formatDateTimePt(row.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog.Root
        open={Boolean(selected) || createOpen}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
          {createOpen ? (
            <Dialog.Content className="admin-drawer fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-lg flex-col bg-surface shadow-[-16px_0_40px_rgba(36,29,34,0.08)]">
              <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
                <div>
                  <Dialog.Title className="font-display text-3xl">Novo cupom</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-muted">
                    O código é o que a pessoa digita no checkout. O nome aparece no dashboard de vendas.
                  </Dialog.Description>
                </div>
                <Dialog.Close className="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-gold-soft hover:text-ink" aria-label="Fechar cadastro">
                  <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
                </Dialog.Close>
              </div>
              <form action={createCoupon} className="grid gap-3 overflow-y-auto px-6 py-5">
                <CouponFields canManage={canManage} />
                <button className="min-h-11 rounded-xl bg-wine text-white" type="submit" disabled={!canManage}>
                  Cadastrar cupom
                </button>
              </form>
            </Dialog.Content>
          ) : selected ? (
            <Dialog.Content className="admin-drawer fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-lg flex-col bg-surface shadow-[-16px_0_40px_rgba(36,29,34,0.08)]">
              <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
                <div>
                  <Dialog.Title className="font-display text-3xl">{selected.name}</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-muted">
                    {selected.code} · {KIND_LABEL[selected.kind]}
                  </Dialog.Description>
                </div>
                <Dialog.Close className="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-gold-soft hover:text-ink" aria-label="Fechar cupom">
                  <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
                </Dialog.Close>
              </div>
              <form action={updateCoupon.bind(null, selected.id)} className="grid gap-3 overflow-y-auto px-6 py-5">
                <CouponFields coupon={selected} canManage={canManage} />
                <button className="min-h-11 rounded-xl bg-wine text-white" type="submit" disabled={!canManage}>
                  Salvar
                </button>
              </form>
            </Dialog.Content>
          ) : null}
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function CouponFields({ coupon, canManage }: { coupon?: AdminCouponRow; canManage: boolean }) {
  const [kind, setKind] = useState<CouponKind>(coupon?.kind ?? "percent");
  useEffect(() => {
    setKind(coupon?.kind ?? "percent");
  }, [coupon?.id, coupon?.kind]);
  return (
    <>
      <label className="grid gap-1 text-sm">
        Nome
        <Input name="name" defaultValue={coupon?.name} required maxLength={80} disabled={!canManage} />
      </label>
      <label className="grid gap-1 text-sm">
        Código
        <Input name="code" defaultValue={coupon?.code} required maxLength={32} disabled={!canManage} placeholder="LANCA10" />
      </label>
      <label className="grid gap-1 text-sm">
        Tipo de desconto
        <Select
          name="kind"
          value={kind}
          disabled={!canManage}
          onChange={(event) => setKind(event.target.value === "fixed" ? "fixed" : "percent")}
        >
          <option value="percent">{KIND_LABEL.percent}</option>
          <option value="fixed">{KIND_LABEL.fixed}</option>
        </Select>
      </label>
      {kind === "percent" ? (
        <label className="grid gap-1 text-sm">
          Percentual
          <InputShell>
            <input
              className="input-shell-field"
              name="percent"
              inputMode="numeric"
              defaultValue={coupon?.percent ?? ""}
              placeholder="10"
              required
              disabled={!canManage}
            />
            <span className="pr-3 text-sm text-muted">%</span>
          </InputShell>
        </label>
      ) : (
        <label className="grid gap-1 text-sm">
          Valor em reais
          <InputShell>
            <span className="pl-3 text-sm text-muted">R$</span>
            <input
              className="input-shell-field px-2"
              name="amount"
              inputMode="decimal"
              defaultValue={coupon?.amountCents == null ? "" : (coupon.amountCents / 100).toFixed(2).replace(".", ",")}
              placeholder="20,00"
              required
              disabled={!canManage}
            />
          </InputShell>
        </label>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input name="active" type="checkbox" defaultChecked={coupon?.active ?? true} disabled={!canManage} />
        Cupom ativo para o checkout
      </label>
    </>
  );
}
