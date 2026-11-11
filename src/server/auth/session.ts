import "server-only";
import { adminDisplayName } from "@/features/admin/dashboard";
import { isAdminRole, roleHas, type AdminRole, type Permission } from "@/server/auth/rbac";
import { tryServiceClient, trySessionClient } from "@/server/db/clients";

export type AdminSession = {
  userId: string;
  email: string;
  name: string;
  profileName: string | null;
  role: AdminRole;
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await trySessionClient();
  const service = tryServiceClient();
  if (!session || !service) return null;
  const { data, error } = await session.auth.getUser();
  if (error || !data.user) return null;
  const withName = await service
    .from("admin_profiles")
    .select("role,email,name")
    .eq("id", data.user.id)
    .maybeSingle();
  const profile = withName.error
    ? await service.from("admin_profiles").select("role,email").eq("id", data.user.id).maybeSingle()
    : withName;
  const row = (profile.data ?? null) as { role?: unknown; email?: unknown; name?: unknown } | null;
  const role = String(row?.role ?? "");
  if (!isAdminRole(role)) return null;
  const authUser = await service.auth.admin.getUserById(data.user.id);
  const bannedUntil = authUser.data.user?.banned_until;
  if (bannedUntil && Date.parse(String(bannedUntil)) > Date.now()) return null;
  const email = String(row?.email ?? data.user.email ?? "");
  const metadata = (authUser.data.user?.user_metadata ?? {}) as Record<string, unknown>;
  const storedName = typeof row?.name === "string" && row.name.trim() ? row.name.trim() : null;
  return {
    userId: data.user.id,
    email,
    name: adminDisplayName({ email, name: storedName, metadata }),
    profileName: storedName,
    role,
  };
}

export async function requirePermission(permission: Permission) {
  const admin = await getAdminSession();
  if (!admin) return { ok: false as const, status: 401 as const, admin: null };
  if (!roleHas(admin.role, permission)) return { ok: false as const, status: 403 as const, admin };
  return { ok: true as const, status: 200 as const, admin };
}
