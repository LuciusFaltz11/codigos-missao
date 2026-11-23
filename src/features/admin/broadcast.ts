export const BROADCAST_PLACEHOLDER = "[DESCADASTRE-SE AQUI]";
export const BROADCAST_FOOTER_MARK = "data-broadcast-unsub";
export const DEFAULT_BROADCAST_SUBJECT = "Há camadas ainda mais profundas no seu mapa";
export const MAX_BROADCAST_RECIPIENTS = 80;
export const BROADCAST_ASSET_PATH = "/email/leads/";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeBroadcastEmail(email: string) {
  return email.trim().toLowerCase();
}

export function parseBroadcastEmails(raw: string) {
  const seen = new Set<string>();
  const emails: string[] = [];
  const invalid: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const value = normalizeBroadcastEmail(part);
    if (!value) continue;
    if (!EMAIL_PATTERN.test(value)) {
      if (!invalid.includes(part.trim())) invalid.push(part.trim());
      continue;
    }
    if (seen.has(value)) continue;
    seen.add(value);
    emails.push(value);
  }
  return { emails, invalid };
}

export function broadcastUnsubscribeUrl(appUrl: string, token: string) {
  return `${appUrl.replace(/\/$/, "")}/descadastrar/${encodeURIComponent(token)}`;
}

export function broadcastAssetBase(appUrl: string) {
  return `${appUrl.replace(/\/$/, "")}${BROADCAST_ASSET_PATH}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function unsubscribeAnchor(url: string, label = "Descadastre-se aqui") {
  return `<a href="${escapeHtml(url)}" style="color:#f0c9aa;text-decoration:underline" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

export function rewriteBroadcastAssets(html: string, assetBase: string) {
  const base = assetBase.endsWith("/") ? assetBase : `${assetBase}/`;
  return html.replaceAll('src="images/', `src="${base}`).replaceAll("src='images/", `src='${base}`);
}

export function unsubscribeFooterHtml(unsubscribeUrl: string) {
  const link = unsubscribeAnchor(unsubscribeUrl);
  return `<table ${BROADCAST_FOOTER_MARK}="1" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:0;border:0;">
  <tr>
    <td align="center" style="padding:0;">
      <table role="presentation" align="center" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;min-width:600px;margin:0 auto;background:#1c2a30;">
        <tr>
          <td align="center" style="padding:20px 24px;color:#f0c9aa;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;">
            Você recebeu este e-mail porque o endereço foi incluído em um envio da Val Wilges.
            <br />
            ${link} para não receber mais estes avisos.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

export function appendUnsubscribeFooter(html: string, unsubscribeUrl: string) {
  if (html.includes(`${BROADCAST_FOOTER_MARK}=`)) return html;
  const footer = unsubscribeFooterHtml(unsubscribeUrl);
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${footer}</body>`);
  return `${html}${footer}`;
}

export function prepareBroadcastHtml(
  html: string,
  input: { unsubscribeUrl: string; assetBase: string },
) {
  let next = rewriteBroadcastAssets(html, input.assetBase);
  const link = unsubscribeAnchor(input.unsubscribeUrl);
  if (next.includes(BROADCAST_PLACEHOLDER)) {
    next = next.replaceAll(BROADCAST_PLACEHOLDER, link);
  }
  return appendUnsubscribeFooter(next, input.unsubscribeUrl);
}

export function prepareBroadcastText(text: string, unsubscribeUrl: string) {
  const line = `Para não receber mais estes e-mails: ${unsubscribeUrl}`;
  const withLink = text.includes(BROADCAST_PLACEHOLDER)
    ? text.replaceAll(BROADCAST_PLACEHOLDER, unsubscribeUrl)
    : text;
  if (withLink.includes(unsubscribeUrl)) {
    return withLink.trim().endsWith(unsubscribeUrl) ? withLink.trim() : `${withLink.trim()}\n\n${line}`;
  }
  return `${withLink.trim()}\n\n${line}`;
}

export function htmlToBroadcastText(html: string, unsubscribeUrl: string) {
  const stripped = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return prepareBroadcastText(stripped, unsubscribeUrl);
}

export function broadcastSendSummary(input: { sent: number; skipped: number; failed: number }) {
  const parts = [
    `${input.sent} e-mail${input.sent === 1 ? "" : "s"} enviado${input.sent === 1 ? "" : "s"}.`,
  ];
  if (input.skipped > 0) {
    parts.push(`${input.skipped} já descadastrado${input.skipped === 1 ? "" : "s"}.`);
  }
  if (input.failed > 0) {
    parts.push(`${input.failed} falh${input.failed === 1 ? "ou" : "aram"}.`);
  }
  return parts.join(" ");
}
