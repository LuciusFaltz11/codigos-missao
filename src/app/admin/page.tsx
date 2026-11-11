import { DashboardView } from "@/components/admin/dashboard-view";
import { AdminPanel } from "@/components/admin/shell";
import { adminDisplayName, greetingAt, maskLeadRow, maskSaleRow, parseDashboardPeriod } from "@/features/admin/dashboard";
import { roleHas } from "@/server/auth/rbac";
import { getAdminSession } from "@/server/auth/session";
import { loadAdminDashboard } from "@/server/services/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string }>;
}) {
  const params = await searchParams;
  const session = await getAdminSession();
  const range = parseDashboardPeriod(params);
  const greeting = greetingAt();
  const adminName = session?.name ?? adminDisplayName({ email: session?.email });
  const canRead = Boolean(session && roleHas(session.role, "dashboard.read"));
  const data = await loadAdminDashboard({ range, greeting, adminName, canRead });
  const masked =
    session?.role === "support"
      ? {
          ...data,
          latestLeads: data.latestLeads.map(maskLeadRow),
          latestSales: data.latestSales.map(maskSaleRow),
          unconverted: { ...data.unconverted, rows: data.unconverted.rows.map(maskLeadRow) },
        }
      : data;

  return (
    <AdminPanel>
      <DashboardView data={masked} />
    </AdminPanel>
  );
}
