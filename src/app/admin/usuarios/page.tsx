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
  return (
    <AdminPanel>
      <h1 className="font-display text-4xl">Usuários</h1>
      <p className="mt-2 text-sm text-muted">
        O papel fica no banco. Quem entra pela primeira vez cria a própria senha pelo e-mail de convite.
      </p>
      {rows.length === 0 ? (
        <div className="mt-6">
          <Empty>Nenhum administrador cadastrado.</Empty>
        </div>
      ) : null}
      <UsersPanel
        rows={rows}
        canManage={canManage}
        currentUserId={session?.userId ?? null}
        initialId={notice.editar}
        creating={notice.novo === "1"}
      />
    </AdminPanel>
  );
}
