"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    setCode(defaultCode);
    setEditing(!applied);
  }, [applied, defaultCode]);

  function apply(next = code) {
    const params = new URLSearchParams();
    if (next.trim()) params.set("cupom", next.trim());
    router.push(params.size ? `/checkout/${token}?${params}` : `/checkout/${token}`);
  }

  const locked = applied && !editing;

  return (
    <form className="grid gap-5" action={`/api/checkout/${token}`} method="post">
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
              readOnly={locked}
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
              className="min-h-11 shrink-0 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-ink"
              type="button"
              onClick={() => setEditing(true)}
            >
              Trocar cupom
            </button>
          ) : (
            <button
              className="min-h-11 shrink-0 rounded-xl border border-wine px-4 text-sm font-semibold text-wine"
              type="button"
              onClick={() => apply()}
            >
              Aplicar
            </button>
          )}
        </span>
      </div>
      {canPay ? (
        <button className="min-h-12 w-full rounded-xl bg-wine px-5 font-semibold text-white" type="submit">
          Liberar a leitura completa
        </button>
      ) : null}
    </form>
  );
}
