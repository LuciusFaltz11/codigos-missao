import { CouponsPanel } from "@/components/admin/coupons-panel";
import { AdminPanel, Empty } from "@/components/admin/shell";
import { roleHas } from "@/server/auth/rbac";
import { getAdminSession } from "@/server/auth/session";
import { loadAdminCoupons } from "@/server/services/coupons";

export const dynamic = "force-dynamic";

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; novo?: string; erro?: string; salvo?: string }>;
}) {
  const notice = await searchParams;
  const session = await getAdminSession();
  const rows = await loadAdminCoupons();
  const canManage = session ? roleHas(session.role, "settings.write") : false;
  return (
    <AdminPanel>
      <h1 className="font-display text-4xl">Cupons</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        O código digitado no checkout fica gravado no pedido, para o dashboard de vendas identificar o cupom usado.
      </p>
      {rows.length === 0 ? (
        <div className="mt-6">
          <Empty>Nenhum cupom cadastrado.</Empty>
        </div>
      ) : null}
      <CouponsPanel
        rows={rows}
        canManage={canManage}
        initialId={notice.editar}
        creating={notice.novo === "1"}
        notice={{ erro: notice.erro, salvo: notice.salvo }}
      />
    </AdminPanel>
  );
}
