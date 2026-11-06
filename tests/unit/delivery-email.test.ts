import { describe, expect, it } from "vitest";
import { readingEmailContent, readingEmailIdempotencyKey } from "@/features/reading/delivery-email";

describe("e-mail da leitura completa", () => {
  it("monta um convite com o nome e o PDF anexo", () => {
    const message = readingEmailContent({
      name: "Ana <Silva>",
      url: "https://codigos.test/mapa/completo/abc",
      attached: true,
    });
    expect(message.subject).toBe("Sua leitura completa está pronta");
    expect(message.html).toContain("Olá, Ana &lt;Silva&gt;.");
    expect(message.html).not.toContain("Ana <Silva>");
    expect(message.html).toContain("O PDF da leitura segue anexo");
    expect(message.html).toContain("https://codigos.test/mapa/completo/abc");
    expect(message.text).toContain("https://codigos.test/mapa/completo/abc");
  });

  it("não promete anexo quando o PDF fica só na página", () => {
    const message = readingEmailContent({ name: "", url: "https://codigos.test/leitura", attached: false });
    expect(message.html).toContain("Olá.");
    expect(message.html).toContain("baixado na página da leitura");
    expect(message.html).not.toContain("segue anexo");
  });

  it("repete a mesma chave no envio automático e separa um reenvio", () => {
    const reportId = "5b0b6c2e-1c3a-4d2e-9f10-123456789abc";
    const jobId = "job-1";
    expect(readingEmailIdempotencyKey(reportId, jobId, false)).toBe(readingEmailIdempotencyKey(reportId, "job-2", false));
    expect(readingEmailIdempotencyKey(reportId, jobId, true)).toBe(`codigos-missao-resend-${jobId}`);
    expect(readingEmailIdempotencyKey(reportId, jobId, true)).not.toBe(readingEmailIdempotencyKey(reportId, jobId, false));
  });
});
