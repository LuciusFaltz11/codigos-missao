import { loginErrorMessage } from "@/features/admin/users";

export type FlashKind = "success" | "error";
export type Flash = { kind: FlashKind; message: string };

export const FLASH_PARAM_KEYS = ["erro", "salvo", "publicado"] as const;

function errorFlash(message: string): Flash {
  return { kind: "error", message };
}

function successFlash(message: string): Flash {
  return { kind: "success", message };
}

function byPrefix(pathname: string, table: Record<string, (params: URLSearchParams) => Flash | null>) {
  const match = Object.keys(table)
    .sort((a, b) => b.length - a.length)
    .find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`));
  return match ? table[match] : null;
}

export function resolveFlash(pathname: string, params: URLSearchParams): Flash | null {
  const erro = params.get("erro");
  const salvo = params.get("salvo");
  const publicado = params.get("publicado");

  const resolver = byPrefix(pathname, {
    "/admin/login": () => {
      const message = loginErrorMessage(erro ?? undefined);
      return message ? errorFlash(message) : null;
    },
    "/admin/primeiro-acesso": () => {
      if (erro === "senha") return errorFlash("A senha precisa ter pelo menos 8 caracteres e coincidir com a confirmação.");
      if (erro === "1") return errorFlash("Este link expirou ou já foi usado. Peça um novo e-mail no painel.");
      return null;
    },
    "/admin/metodologia": () => {
      if (salvo === "1") return successFlash("Rascunho salvo.");
      if (publicado === "1") return successFlash("Versão publicada. Mapas novos passam a usar este pacote.");
      if (erro === "permissao") return errorFlash("Seu papel não salva nem publica a metodologia.");
      if (erro === "config") return errorFlash("O banco ainda não está configurado.");
      if (erro === "rascunho") return errorFlash("Salve o rascunho antes de publicar.");
      if (erro === "catalogo") return errorFlash("A publicação exige os 36 códigos íntegros no banco.");
      if (erro === "salvar") return errorFlash("Não foi possível salvar o rascunho.");
      if (erro === "1") return errorFlash("Não foi possível publicar esta versão.");
      return null;
    },
    "/admin/configuracoes": () => {
      if (salvo === "1") return successFlash("Preço salvo.");
      if (erro === "permissao") return errorFlash("Seu papel não altera o preço.");
      if (erro === "config") return errorFlash("O banco ainda não está configurado.");
      if (erro === "1") return errorFlash("Informe um valor entre R$ 1,00 e R$ 100.000,00.");
      return null;
    },
    "/admin/cupons": () => {
      if (salvo === "1") return successFlash("Cupom salvo.");
      if (erro === "permissao") return errorFlash("Seu papel não altera cupons.");
      if (erro === "existe") return errorFlash("Já existe um cupom com este código.");
      if (erro === "1") return errorFlash("Informe nome, código e um desconto em percentual ou em reais.");
      if (erro === "config") return errorFlash("O banco ainda não está configurado.");
      return null;
    },
    "/admin/usuarios": () => {
      if (salvo === "1") return successFlash("Alteração salva.");
      if (salvo === "usuario") return successFlash("Usuário criado. Já é possível entrar no painel com este e-mail e senha.");
      if (salvo === "convite") return successFlash("Convite enviado. A pessoa cria a senha no primeiro acesso.");
      if (salvo === "email") return successFlash("E-mail de acesso reenviado.");
      if (erro === "permissao") return errorFlash("Seu papel não gerencia usuários.");
      if (erro === "senha") return errorFlash("A senha precisa ter pelo menos 8 caracteres e coincidir com a confirmação.");
      if (erro === "email") return errorFlash("Configure o envio de e-mail para cadastrar ou reenviar o acesso.");
      if (erro === "existe") return errorFlash("Já existe um usuário com este e-mail.");
      if (erro === "ultimo") return errorFlash("O último super admin ativo não pode ser bloqueado nem rebaixado.");
      if (erro === "proprio") return errorFlash("Você não pode bloquear o próprio acesso.");
      if (erro === "1" || erro === "config" || erro === "link" || erro === "send") {
        return errorFlash("Não foi possível concluir esta ação.");
      }
      return null;
    },
    "/admin/codigos": () => {
      if (salvo === "1") return successFlash("Rascunho salvo.");
      if (erro === "config") return errorFlash("O banco não está configurado para salvar.");
      if (erro === "imagem") return errorFlash("Envie um PNG, JPG ou WebP de até 4 MB.");
      if (erro === "upload") return errorFlash("Não foi possível guardar a imagem. Confira o bucket card-art no Supabase.");
      if (erro === "1") return errorFlash("Não foi possível salvar este rascunho.");
      return null;
    },
    "/admin/astrologia": () => {
      if (salvo === "1") return successFlash("Texto salvo.");
      if (erro === "config") return errorFlash("O banco ainda não está configurado.");
      if (erro === "1") return errorFlash("Não foi possível salvar este texto.");
      return null;
    },
    "/admin/relatorios": () => {
      if (salvo === "1") return successFlash("Reprocessamento enfileirado.");
      if (erro === "permissao") return errorFlash("Seu papel não reprocessa relatórios.");
      if (erro === "config") return errorFlash("O banco ainda não está configurado.");
      return null;
    },
    "/admin/simulador": () => {
      if (erro === "1") return errorFlash("Informe uma longitude válida e uma casa entre 1 e 12.");
      return null;
    },
  });

  if (resolver) return resolver(params);

  if (pathname.startsWith("/checkout/")) {
    if (erro === "cupom") return errorFlash("Este código de desconto não é válido.");
    if (erro === "minimo") return errorFlash("Este cupom deixa o valor abaixo do mínimo de cobrança.");
    if (erro === "link") return errorFlash("A InfinitePay não confirmou o link de pagamento.");
    if (erro === "1") return errorFlash("Não foi possível abrir o pagamento.");
  }

  return null;
}
