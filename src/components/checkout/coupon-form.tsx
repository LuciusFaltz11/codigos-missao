"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { InputShell } from "@/components/ui/input";

export function CheckoutCouponForm({
  token,
  defaultCode,
  applied,
  canPay,
}: {
  token: string;
  defaultCode: string;
  applied: boolean;
  canPay: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState(defaultCode);
  const [editing, setEditing] = useState(!applied);
  const [applying, setApplying] = useState(false);
  const [pending, startApply] = useTransition();
  const busy = applying || pending;

  useEffect(() => {
    setCode(defaultCode);
    setEditing(!applied);
  }, [applied, defaultCode]);

  useEffect(() => {
    if (!pending) setApplying(false);
  }, [pending, applied, defaultCode]);

  function apply(next = code) {
    if (busy) return;
    const params = new URLSearchParams();
    if (next.trim()) params.set("cupom", next.trim());
    setApplying(true);
    startApply(() => {
      router.push(params.size ? `/checkout/${token}?${params}` : `/checkout/${token}`);
    });
  }

  const locked = applied && !editing;

  return (
    <form
      className="grid gap-5"
      action={`/api/checkout/${token}`}
      method="post"
      onSubmit={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <div className="grid gap-2">
        <label htmlFor="checkout-coupon" className="text-sm font-medium text-ink">
          Código de desconto
        </label>
        <span className="flex items-stretch gap-2">
          <InputShell className={locked ? "border-success/35 bg-success/5" : undefined}>
            <input
              id="checkout-coupon"
              className="input-shell-field"
              name="cupom"
              value={code}
              readOnly={locked || busy}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="Digite o código"
              aria-describedby={locked ? "coupon-applied-status" : undefined}
            />
            {locked ? (
              <span id="coupon-applied-status" className="pr-3 text-sm font-semibold text-success">
                Aplicado
              </span>
            ) : null}
          </InputShell>
          {locked ? (
            <button
              className="min-h-11 shrink-0 rounded border border-line bg-surface px-4 text-sm font-semibold text-ink"
              type="button"
              onClick={() => setEditing(true)}
            >
              Trocar cupom
            </button>
          ) : (
            <button
              className="min-h-11 shrink-0 rounded border border-wine px-4 text-sm font-semibold text-wine disabled:opacity-50"
              type="button"
              onClick={() => apply()}
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? "Aplicando…" : "Aplicar"}
            </button>
          )}
        </span>
      </div>
      {canPay ? (
        <button
          className="min-h-12 w-full rounded bg-wine px-5 font-semibold text-white hover:bg-wine-deep disabled:opacity-50"
          type="submit"
          disabled={busy}
        >
          Liberar a leitura completa
        </button>
      ) : null}
    </form>
  );
}
