export const READING_EMAIL_ATTACHMENT_LIMIT = 15_000_000;

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function readingEmailIdempotencyKey(reportId: string, jobId: string, resend: boolean) {
  const key = resend ? `codigos-missao-resend-${jobId}` : `codigos-missao-report-${reportId}`;
  return key.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 256);
}

export function readingEmailContent(input: { name: string; url: string; attached: boolean }) {
  const safeUrl = escapeHtml(input.url);
  const name = input.name.trim();
  const greeting = name ? `Olá, ${escapeHtml(name)}.` : "Olá.";
  const fileNote = input.attached
    ? "O PDF da leitura segue anexo neste e-mail. O botão abaixo abre a mesma leitura em uma página segura, para consultar quando quiser."
    : "O PDF pode ser baixado na página da leitura. O botão abaixo abre essa página em um endereço seguro, para consultar quando quiser.";
  const text = [
    greeting,
    "",
    "Sua leitura completa dos Códigos da Missão está pronta.",
    fileNote,
    "",
    input.url,
    "",
    "A leitura é simbólica e não descreve um destino fixo.",
    "",
    "Códigos da Missão",
  ].join("\n");
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#F8F6F1;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F6F1;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="background:#482931;padding:32px;">
                <p style="margin:0;color:#E8DCC6;font-family:Georgia,serif;font-size:12px;letter-spacing:0.16em;">CÓDIGOS DA MISSÃO</p>
                <h1 style="margin:14px 0 0;color:#ffffff;font-family:Georgia,serif;font-size:30px;font-weight:400;line-height:1.25;">Sua leitura completa está pronta</h1>
              </td>
            </tr>
            <tr>
              <td style="height:4px;background:#B99B62;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:32px;color:#241D22;font-family:Georgia,serif;font-size:17px;line-height:1.6;">
                <p style="margin:0 0 16px;">${greeting}</p>
                <p style="margin:0 0 16px;">Os Códigos deste mapa já foram reunidos em uma leitura só sua. Ela pode ser lida com calma, no seu tempo.</p>
                <p style="margin:0 0 28px;">${fileNote}</p>
                <a href="${safeUrl}" style="display:inline-block;background:#482931;color:#ffffff;font-family:Georgia,serif;font-size:16px;text-decoration:none;padding:14px 22px;border-radius:12px;">Abrir minha leitura</a>
                <p style="margin:28px 0 0;color:#5E5664;font-size:14px;line-height:1.5;">A leitura é simbólica e não descreve um destino fixo.</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;color:#5E5664;font-family:Georgia,serif;font-size:12px;">Códigos da Missão</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  return {
    subject: "Sua leitura completa está pronta",
    html,
    text,
  };
}
