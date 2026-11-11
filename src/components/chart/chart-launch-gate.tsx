"use client";

import { useEffect, useState } from "react";
import { remainingUntilUnlock, type UnlockRemaining } from "@/features/launch/chart-gate";
import { cn } from "@/lib/utils";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function ChartLaunchGate({
  children,
  variant = "site",
}: {
  children: React.ReactNode;
  variant?: "site" | "wix";
}) {
  const [remaining, setRemaining] = useState<UnlockRemaining>(() => remainingUntilUnlock());

  useEffect(() => {
    function tick() {
      setRemaining(remainingUntilUnlock());
    }
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, []);

  if (!remaining.locked) return children;

  return (
    <div className="relative isolate">
      <div className="pointer-events-none select-none blur-[3px]" aria-hidden="true" inert={true}>
        {children}
      </div>
      <div
        className={cn(
          "absolute inset-0 z-10 px-4 py-8",
          variant === "wix" ? "bg-[#f3f3f3]/80" : "bg-canvas/80",
        )}
      >
        <div
          className={cn(
            "sticky top-6 mx-auto max-w-sm text-center",
            variant === "wix" ? "text-[#0b0a09]" : "text-ink",
          )}
          role="status"
          aria-live="polite"
        >
          <p className="font-display text-3xl leading-tight md:text-4xl">Aberto às 20:00</p>
          <span className="hairline mx-auto mt-4 block" aria-hidden="true" />
          <p className="mt-4 text-sm text-muted">Os Códigos da Missão estarão disponíveis em:</p>
          <div className="mt-6 flex justify-center gap-3" aria-label="Tempo restante">
            <TimeCell value={pad(remaining.hours)} label="horas" />
            <TimeCell value={pad(remaining.minutes)} label="minutos" />
            <TimeCell value={pad(remaining.seconds)} label="segundos" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-16">
      <p className="font-display text-4xl leading-none text-wine">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
