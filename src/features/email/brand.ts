function escapeAttr(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

export const EMAIL_BRAND = {
  canvas: "#F3F3F3",
  surface: "#FFFFFF",
  ink: "#0B0A09",
  muted: "#60605F",
  wine: "#1E332D",
  wineDeep: "#192823",
  gold: "#C7A96B",
  border: "#D9D9D9",
  display: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  sans: "Montserrat, 'Helvetica Neue', Helvetica, Arial, sans-serif",
} as const;

export function brandedEmailHtml(input: {
  title: string;
  bodyHtml: string;
  cta: { href: string; label: string };
  note?: string;
}) {
  const brand = EMAIL_BRAND;
  const note = input.note
    ? `<p style="margin:28px 0 0;color:${brand.muted};font-family:${brand.sans};font-size:14px;line-height:1.6;">${input.note}</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Montserrat:wght@400;600&display=swap" />
  </head>
  <body style="margin:0;padding:0;background:${brand.canvas};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.canvas};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${brand.surface};border:1px solid ${brand.border};border-radius:4px;overflow:hidden;">
            <tr>
              <td style="padding:24px 32px 20px;border-bottom:1px solid ${brand.border};">
                <p style="margin:0;color:${brand.ink};font-family:${brand.display};font-size:22px;font-weight:600;line-height:1.2;">Códigos da Missão</p>
              </td>
            </tr>
            <tr>
              <td style="height:2px;background:${brand.gold};font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:32px;color:${brand.ink};font-family:${brand.sans};font-size:16px;line-height:1.65;">
                <h1 style="margin:0 0 16px;color:${brand.ink};font-family:${brand.display};font-size:32px;font-weight:600;line-height:1.2;">${input.title}</h1>
                ${input.bodyHtml}
                <p style="margin:28px 0 0;">
                  <a href="${escapeAttr(input.cta.href)}" style="display:inline-block;background:${brand.wine};color:#ffffff;font-family:${brand.sans};font-size:14px;font-weight:600;text-decoration:none;padding:14px 18px;border-radius:4px;">${escapeAttr(input.cta.label)}</a>
                </p>
                ${note}
              </td>
            </tr>
            <tr>
              <td style="background:${brand.wineDeep};border-top:1px solid ${brand.gold};padding:24px 32px;color:rgba(255,255,255,0.8);font-family:${brand.sans};font-size:13px;line-height:1.55;">
                <p style="margin:0 0 8px;color:#ffffff;font-family:${brand.display};font-size:20px;font-weight:600;">Códigos da Missão</p>
                <p style="margin:0;">Leitura simbólica. Não é diagnóstico, previsão ou destino.</p>
                <p style="margin:8px 0 0;">Metodologia autoral de Val Wilges.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
