import { brandedEmailHtml } from "@/features/email/brand";
import type { AdminRole } from "@/server/auth/rbac";

export const PANEL_ROLES = ["super_admin", "admin", "editor", "support"] as const;

export const ROLE_LABEL: Record<AdminRole, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  editor: "Editor",
  support: "Suporte",
};

export type AdminUserStatus = "active" | "pending" | "blocked";

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  createdAt: string;
  lastSignInAt: string | null;
  blockedAt: string | null;
  status: AdminUserStatus;
};

export function firstAccessUrl(appUrl: string, tokenHash: string, type: "invite" | "recovery") {
  const base = appUrl.replace(/\/$/, "");
  const params = new URLSearchParams({ token_hash: tokenHash, type });
  return `${base}/admin/primeiro-acesso?${params.toString()}`;
}

export function adminUserStatus(blockedAt: string | null, bannedUntil: string | null, lastSignInAt: string | null): AdminUserStatus {
  if (blockedAt) return "blocked";
  if (bannedUntil && Date.parse(bannedUntil) > Date.now()) return "blocked";
  if (!lastSignInAt) return "pending";
  return "active";
}

export function adminSignInBlock(bannedUntil: string | null | undefined, now = Date.now()) {
  if (bannedUntil && Date.parse(String(bannedUntil)) > now) return "bloqueado" as const;
  return null;
}

export function loginErrorMessage(code: string | undefined) {
  switch (code) {
    case "nao_cadastrado":
      return "Este e-mail não está cadastrado no painel.";
    case "senha":
      return "A senha está incorreta.";
    case "primeiro":
      return "Este acesso ainda não tem senha. Abra o e-mail de primeiro acesso para criá-la.";
    case "bloqueado":
      return "Este acesso está bloqueado.";
    case "config":
      return "O acesso administrativo ainda não está configurado.";
    case "email_invalido":
      return "Informe um e-mail válido.";
    case "1":
      return "Não foi possível entrar. Tente de novo.";
    default:
      return null;
  }
}

export function firstAccessEmailHtml(link: string, kind: "invite" | "recovery") {
  const title = kind === "invite" ? "Crie sua senha de acesso" : "Redefina sua senha de acesso";
  const intro =
    kind === "invite"
      ? "Você foi cadastrado no painel de Códigos da Missão. Use o botão abaixo para criar sua senha no primeiro acesso."
      : "Use o botão abaixo para criar uma nova senha e entrar no painel de Códigos da Missão.";
  return brandedEmailHtml({
    title,
    bodyHtml: `<p style="margin:0;">${intro}</p>`,
    cta: { href: link, label: "Abrir primeiro acesso" },
    note: "Se você não esperava este e-mail, ignore a mensagem.",
  });
}
