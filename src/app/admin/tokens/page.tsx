import { TokensView } from "@/components/admin/tokens-view";
import { AdminPanel } from "@/components/admin/shell";
import { parseDashboardPeriod } from "@/features/admin/dashboard";
import { roleHas } from "@/server/auth/rbac";
import { getAdminSession } from "@/server/auth/session";
import { loadAdminTokens } from "@/server/services/admin-tokens";

export const dynamic = "force-dynamic";

export default async function TokensAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string }>;
}) {
  const params = await searchParams;
  const session = await getAdminSession();
  const range = parseDashboardPeriod(params);
  const canRead = Boolean(session && roleHas(session.role, "dashboard.read"));
  const data = await loadAdminTokens({ range, canRead });

  return (
    <AdminPanel>
      <TokensView data={data} />
    </AdminPanel>
  );
}
