import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BROADCAST_PLACEHOLDER,
  DEFAULT_BROADCAST_SUBJECT,
  MAX_BROADCAST_RECIPIENTS,
  appendUnsubscribeFooter,
  broadcastSendSummary,
  broadcastUnsubscribeUrl,
  htmlToBroadcastText,
  parseBroadcastEmails,
  prepareBroadcastHtml,
  prepareBroadcastText,
  rewriteBroadcastAssets,
} from "@/features/admin/broadcast";

describe("envio manual de e-mail", () => {
  it("separa e-mails válidos, remove repetição e guarda inválidos", () => {
    const parsed = parseBroadcastEmails(" Ana@Site.com , ana@site.com\nfoo\njoao@site.com; ");
    expect(parsed.emails).toEqual(["ana@site.com", "joao@site.com"]);
    expect(parsed.invalid).toEqual(["foo"]);
  });

  it("reescreve imagens relativas e troca o placeholder de descadastro", () => {
    const html = prepareBroadcastHtml(
      `<html><body><img src="images/capa.png" alt="" /><p>${BROADCAST_PLACEHOLDER}</p></body></html>`,
      {
        unsubscribeUrl: "https://codigos.test/descadastrar/token",
        assetBase: "https://codigos.test/email/leads/",
      },
    );
    expect(html).toContain('src="https://codigos.test/email/leads/capa.png"');
    expect(html).not.toContain(BROADCAST_PLACEHOLDER);
    expect(html).toContain('href="https://codigos.test/descadastrar/token"');
    expect(html).toContain("Descadastre-se aqui");
    expect(html).toContain("data-broadcast-unsub");
  });

  it("acrescenta rodapé quando o HTML customizado não tem placeholder", () => {
    const html = prepareBroadcastHtml("<p>Olá</p>", {
      unsubscribeUrl: "https://codigos.test/descadastrar/abc",
      assetBase: "https://codigos.test/email/leads",
    });
    expect(html).toContain("https://codigos.test/descadastrar/abc");
    expect(html).toContain("data-broadcast-unsub");
    expect(html).toContain('width="600"');
    expect(html).toContain("max-width:600px");
    expect(html).toContain("min-width:600px");
    expect(appendUnsubscribeFooter(html, "https://codigos.test/descadastrar/abc")).toBe(html);
  });

  it("coloca o link de descadastro no texto simples", () => {
    const text = prepareBroadcastText(`Oi\n${BROADCAST_PLACEHOLDER}`, "https://codigos.test/sair");
    expect(text).toContain("https://codigos.test/sair");
    expect(text).not.toContain(BROADCAST_PLACEHOLDER);
    expect(htmlToBroadcastText("<p>Oi</p>", "https://codigos.test/sair")).toContain("https://codigos.test/sair");
  });

  it("monta a URL pública e o resumo do envio", () => {
    expect(broadcastUnsubscribeUrl("https://codigos.test/", "tok_1")).toBe("https://codigos.test/descadastrar/tok_1");
    expect(rewriteBroadcastAssets('<img src="images/a.jpg" />', "https://codigos.test/email/leads/")).toContain(
      'src="https://codigos.test/email/leads/a.jpg"',
    );
    expect(broadcastSendSummary({ sent: 1, skipped: 0, failed: 0 })).toBe("1 e-mail enviado.");
    expect(DEFAULT_BROADCAST_SUBJECT.length).toBeGreaterThan(8);
    expect(MAX_BROADCAST_RECIPIENTS).toBe(80);
  });

  it("prepara o HTML da campanha de leads com imagens públicas e descadastro", () => {
    const source = readFileSync(join(process.cwd(), "src/content/email/leads.html"), "utf8");
    const html = prepareBroadcastHtml(source, {
      unsubscribeUrl: "https://codigos.test/descadastrar/abc",
      assetBase: "https://codigos.test/email/leads/",
    });
    expect(source).toContain(BROADCAST_PLACEHOLDER);
    expect(html).not.toContain(BROADCAST_PLACEHOLDER);
    expect(html).not.toContain('src="images/');
    expect(html).toContain('src="https://codigos.test/email/leads/e94beac54213798cfc8398339abde19c.png"');
    expect(html).toContain('href="https://codigos.test/descadastrar/abc"');
    expect(html).toContain("data-broadcast-unsub");
    expect(html).toContain("width:600px;max-width:600px;min-width:600px");
  });
});
