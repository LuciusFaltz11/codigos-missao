import { UsersPanel } from "@/components/admin/users-panel";
import { AdminPanel, Empty } from "@/components/admin/shell";
import { roleHas } from "@/server/auth/rbac";
import { getAdminSession } from "@/server/auth/session";
import { loadAdminUsers } from "@/server/services/admin-users";

export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; novo?: string }>;
}) {
  const notice = await searchParams;
  const session = await getAdminSession();
  const rows = await loadAdminUsers();
  const canManage = session ? roleHas(session.role, "users.invite") : false;
  const canAssignSuper = session?.role === "super_admin";
  return (
    <AdminPanel>
      <h1 className="font-display text-4xl">Usuários</h1>
      <p className="mt-2 text-sm text-muted">
        Cadastre e-mail, papel e senha neste painel. A pessoa entra com esses dados, sem depender do e-mail de convite.
      </p>
      {rows.length === 0 ? (
        <div className="mt-6">
          <Empty>Nenhum administrador cadastrado.</Empty>
        </div>
      ) : null}
      <UsersPanel
        rows={rows}
        canManage={canManage}
        canAssignSuper={canAssignSuper}
        currentUserId={session?.userId ?? null}
        initialId={notice.editar}
        creating={notice.novo === "1"}
      />
    </AdminPanel>
  );
}
