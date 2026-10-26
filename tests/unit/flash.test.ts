import { describe, expect, it } from "vitest";
import { resolveFlash } from "@/lib/flash";

function params(query: string) {
  return new URLSearchParams(query);
}

describe("avisos em toast", () => {
  it("mostra sucesso ao publicar a metodologia", () => {
    expect(resolveFlash("/admin/metodologia", params("publicado=1"))).toEqual({
      kind: "success",
      message: "Versão publicada. Mapas novos passam a usar este pacote.",
    });
  });

  it("mostra erro de permissão em vermelho", () => {
    expect(resolveFlash("/admin/metodologia", params("erro=permissao"))).toEqual({
      kind: "error",
      message: "Seu papel não salva nem publica a metodologia.",
    });
  });

  it("separa rascunho ausente de catálogo incompleto", () => {
    expect(resolveFlash("/admin/metodologia", params("erro=rascunho"))).toEqual({
      kind: "error",
      message: "Salve o rascunho antes de publicar.",
    });
    expect(resolveFlash("/admin/metodologia", params("erro=salvar"))).toEqual({
      kind: "error",
      message: "Não foi possível salvar o rascunho.",
    });
  });

  it("traduz o erro de login sem perder o contexto da página", () => {
    expect(resolveFlash("/admin/login", params("erro=senha&email=val@example.com"))).toEqual({
      kind: "error",
      message: "A senha está incorreta.",
    });
  });

  it("avisa cupom inválido no checkout", () => {
    expect(resolveFlash("/checkout/abc", params("erro=cupom"))).toEqual({
      kind: "error",
      message: "Este código de desconto não é válido.",
    });
  });

  it("ignora parâmetros que não são aviso", () => {
    expect(resolveFlash("/admin/cupons", params("editar=1&novo=1"))).toBeNull();
  });
});
