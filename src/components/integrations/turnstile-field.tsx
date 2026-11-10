"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function TurnstileField({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !siteKey) return;
    let cancelled = false;

    function renderWidget() {
      if (cancelled || !hostRef.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(hostRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const existing = document.querySelector<HTMLScriptElement>("script[data-codigos-turnstile]");
      if (!existing) {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.dataset.codigosTurnstile = "true";
        script.addEventListener("load", renderWidget);
        document.head.appendChild(script);
      } else {
        existing.addEventListener("load", renderWidget);
      }
    }

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [siteKey]);

  return <div ref={hostRef} className="wix-turnstile" />;
}
