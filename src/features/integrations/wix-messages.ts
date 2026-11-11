export const WIX_MESSAGE_SOURCE = "codigos-missao";

export type WixChartReadyMessage = {
  source: typeof WIX_MESSAGE_SOURCE;
  type: "chart-ready";
  redirectUrl: string;
};

export type WixResizeMessage = {
  source: typeof WIX_MESSAGE_SOURCE;
  type: "resize";
  height: number;
};

export type WixEmbedMessage = WixChartReadyMessage | WixResizeMessage;

export function wixChartReadyMessage(redirectUrl: string): WixChartReadyMessage {
  return { source: WIX_MESSAGE_SOURCE, type: "chart-ready", redirectUrl };
}

export function wixResizeMessage(height: number): WixResizeMessage {
  return { source: WIX_MESSAGE_SOURCE, type: "resize", height: Math.max(0, Math.round(height)) };
}

export function isWixEmbedMessage(data: unknown): data is WixEmbedMessage {
  if (!data || typeof data !== "object") return false;
  const payload = data as Record<string, unknown>;
  if (payload.source !== WIX_MESSAGE_SOURCE) return false;
  if (payload.type === "chart-ready") return typeof payload.redirectUrl === "string";
  if (payload.type === "resize") return typeof payload.height === "number" && Number.isFinite(payload.height);
  return false;
}

export function previewRedirectUrl(appUrl: string, token: string) {
  const origin = new URL(appUrl).origin;
  return `${origin}/mapa/resultado/${encodeURIComponent(token)}`;
}

export function embedPreviewUrl(redirectUrl: string, embedOrigin: string) {
  try {
    const parsed = new URL(redirectUrl);
    const origin = new URL(embedOrigin).origin;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parsed.search || parsed.hash || parsed.username || parsed.password) return null;
    if (parts.length !== 3 || parts[0] !== "mapa" || parts[1] !== "resultado" || parts[2].length <= 8) return null;
    return `${origin}/mapa/resultado/${parts[2]}`;
  } catch {
    return null;
  }
}

export function navigateToPreview(url: string) {
  try {
    if (window.top && window.top !== window) {
      window.top.location.assign(url);
      return;
    }
  } catch {
    // Alguns browsers bloqueiam leitura de top; a atribuição da URL ainda pode funcionar no catch abaixo.
  }
  window.location.assign(url);
}

export function isSafePreviewRedirect(url: string, appUrl: string) {
  try {
    const parsed = new URL(url);
    const app = new URL(appUrl);
    const local = app.hostname === "localhost" || app.hostname === "127.0.0.1";
    if (parsed.username || parsed.password || parsed.hash) return false;
    if (parsed.search) return false;
    if (parsed.origin !== app.origin) return false;
    if (local) {
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    } else if (parsed.protocol !== "https:") {
      return false;
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.length === 3 && parts[0] === "mapa" && parts[1] === "resultado" && parts[2].length > 8;
  } catch {
    return false;
  }
}

export function parentOriginFromReferrer(referrer: string, allowed: string[]) {
  try {
    const origin = new URL(referrer).origin;
    return allowed.includes(origin) ? origin : null;
  } catch {
    return null;
  }
}

export function redirectFromParentMessage(input: {
  eventOrigin: string;
  appOrigin: string;
  data: unknown;
  appUrl: string;
}) {
  if (input.eventOrigin !== input.appOrigin) return null;
  if (!isWixEmbedMessage(input.data) || input.data.type !== "chart-ready") return null;
  return isSafePreviewRedirect(input.data.redirectUrl, input.appUrl) ? input.data.redirectUrl : null;
}

export function postToWixParent(
  payload: WixEmbedMessage,
  input: { allowedOrigins: string[]; referrer?: string; post?: (message: WixEmbedMessage, origin: string) => void },
) {
  const preferred = input.referrer ? parentOriginFromReferrer(input.referrer, input.allowedOrigins) : null;
  const targets = new Set<string>(preferred ? [preferred, ...input.allowedOrigins] : input.allowedOrigins);
  if (targets.size === 0) targets.add("*");
  const send =
    input.post ??
    ((message, origin) => {
      window.parent.postMessage(message, origin);
      try {
        window.top?.postMessage(message, origin);
      } catch {
        // iframe aninhado no Wix
      }
    });
  for (const origin of targets) send(payload, origin);
}
