import { brandedEmailHtml } from "@/features/email/brand";

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
  const html = brandedEmailHtml({
    title: "Sua leitura completa está pronta",
    bodyHtml: `<p style="margin:0 0 16px;">${greeting}</p>
                <p style="margin:0 0 16px;">Os Códigos deste mapa já foram reunidos em uma leitura só sua. Ela pode ser lida com calma, no seu tempo.</p>
                <p style="margin:0;">${fileNote}</p>`,
    cta: { href: safeUrl, label: "Abrir minha leitura" },
    note: "A leitura é simbólica e não descreve um destino fixo.",
  });
  return {
    subject: "Sua leitura completa está pronta",
    html,
    text,
  };
}
