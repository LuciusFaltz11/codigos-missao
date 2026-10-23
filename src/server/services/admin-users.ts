import "server-only";
import { adminUserStatus, firstAccessEmailHtml, firstAccessUrl, type AdminUserRow } from "@/features/admin/users";
import { isAdminRole } from "@/server/auth/rbac";
import { tryServiceClient } from "@/server/db/clients";
import { getServerEnv } from "@/server/env";
import { createEmailProvider } from "@/server/providers/email";

export type { AdminUserRow };

export async function loadAdminUsers(): Promise<AdminUserRow[]> {
  const service = tryServiceClient();
  if (!service) return [];
  const profiles = await service
    .from("admin_profiles")
    .select("id,email,role,created_at")
    .order("created_at", { ascending: false });
  const rows = profiles.data ?? [];
  if (rows.length === 0) return [];
  const listed = await service.auth.admin.listUsers({ perPage: 200, page: 1 });
  const authById = new Map((listed.data.users ?? []).map((user) => [user.id, user]));
  return rows.flatMap((row) => {
    const role = String(row.role);
    if (!isAdminRole(role)) return [];
    const auth = authById.get(String(row.id));
    const lastSignInAt = auth?.last_sign_in_at ? String(auth.last_sign_in_at) : null;
    const bannedUntil = auth?.banned_until ? String(auth.banned_until) : null;
    const blockedAt = bannedUntil && Date.parse(bannedUntil) > Date.now() ? bannedUntil : null;
    return [
      {
        id: String(row.id),
        email: String(row.email),
        role,
        createdAt: String(row.created_at ?? ""),
        lastSignInAt,
        blockedAt,
        status: adminUserStatus(blockedAt, bannedUntil, lastSignInAt),
      },
    ];
  });
}

export async function sendAdminAccessEmail(email: string, kind: "invite" | "recovery") {
  const service = tryServiceClient();
  const mail = createEmailProvider();
  if (!service) return { ok: false as const, code: "config" as const };
  if (mail.state !== "configured") return { ok: false as const, code: "email" as const };
  const generated = await service.auth.admin.generateLink({
    type: kind,
    email,
    options: { redirectTo: `${getServerEnv().appUrl.replace(/\/$/, "")}/admin/primeiro-acesso` },
  });
  const tokenHash = generated.data?.properties?.hashed_token;
  if (generated.error || !tokenHash) return { ok: false as const, code: "link" as const };
  try {
    await mail.send({
      to: email,
      subject: kind === "invite" ? "Crie sua senha — Códigos da Missão" : "Redefina sua senha — Códigos da Missão",
      html: firstAccessEmailHtml(firstAccessUrl(getServerEnv().appUrl, tokenHash, kind), kind),
    });
  } catch {
    return { ok: false as const, code: "send" as const };
  }
  return { ok: true as const };
}

export async function countActiveSuperAdmins(exceptId?: string) {
  const service = tryServiceClient();
  if (!service) return 0;
  const profiles = await service.from("admin_profiles").select("id").eq("role", "super_admin");
  const listed = await service.auth.admin.listUsers({ perPage: 200, page: 1 });
  const authById = new Map((listed.data.users ?? []).map((user) => [user.id, user]));
  return (profiles.data ?? []).filter((row) => {
    const id = String(row.id);
    if (exceptId && id === exceptId) return false;
    const bannedUntil = authById.get(id)?.banned_until;
    return !(bannedUntil && Date.parse(String(bannedUntil)) > Date.now());
  }).length;
}
