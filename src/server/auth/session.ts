import "server-only";
import { isAdminRole, roleHas, type AdminRole, type Permission } from "@/server/auth/rbac";
import { tryServiceClient, trySessionClient } from "@/server/db/clients";

export type AdminSession = {
  userId: string;
  email: string;
  role: AdminRole;
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await trySessionClient();
  const service = tryServiceClient();
  if (!session || !service) return null;
  const { data, error } = await session.auth.getUser();
  if (error || !data.user) return null;
  const profile = await service
    .from("admin_profiles")
    .select("role,email")
    .eq("id", data.user.id)
    .maybeSingle();
  const role = profile.data?.role;
  if (!role || !isAdminRole(role)) return null;
  const authUser = await service.auth.admin.getUserById(data.user.id);
  const bannedUntil = authUser.data.user?.banned_until;
  if (bannedUntil && Date.parse(String(bannedUntil)) > Date.now()) return null;
  return { userId: data.user.id, email: String(profile.data?.email ?? data.user.email ?? ""), role };
}

export async function requirePermission(permission: Permission) {
  const admin = await getAdminSession();
  if (!admin) return { ok: false as const, status: 401 as const, admin: null };
  if (!roleHas(admin.role, permission)) return { ok: false as const, status: 403 as const, admin };
  return { ok: true as const, status: 200 as const, admin };
}
