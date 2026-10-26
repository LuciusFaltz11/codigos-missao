"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function CheckoutCouponForm({
  token,
  defaultCode,
  canPay,
}: {
  token: string;
  defaultCode: string;
  canPay: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState(defaultCode);
  return (
    <form className="grid gap-4" action={`/api/checkout/${token}`} method="post">
      <label className="grid gap-2 text-sm font-medium text-ink">
        Código de desconto
        <Input
          name="cupom"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="Opcional"
        />
      </label>
      <button
        className="justify-self-start text-sm font-semibold text-wine"
        type="button"
        onClick={() => {
          const params = new URLSearchParams();
          if (code.trim()) params.set("cupom", code.trim());
          router.push(params.size ? `/checkout/${token}?${params}` : `/checkout/${token}`);
        }}
      >
        Aplicar cupom
      </button>
      {canPay ? (
        <button className="min-h-11 rounded-xl bg-wine px-5 font-semibold text-white" type="submit">
          Pagar com InfinitePay
        </button>
      ) : null}
    </form>
  );
}
