import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { getAdminSession } from "@/server/auth/session";
import { integrationStatus } from "@/server/env";
import { signOut } from "@/server/actions/admin";
import { AdminBreadcrumb } from "@/components/ui/breadcrumb";

export async function AdminPanel({ children }: { children: React.ReactNode }) {
  const status = integrationStatus();
  const session = await getAdminSession();
  if (status.supabase === "configured" && !session) redirect("/admin/login");
  return (
    <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
      <aside className="border-r border-border bg-canvas p-4">
        <p className="font-display text-2xl text-wine">Admin</p>
        <p className="mt-1 text-xs text-muted">{session ? session.role : "sem autenticação configurada"}</p>
        <AdminNav />
        {session ? (
          <form action={signOut} className="mt-6">
            <button className="text-sm text-muted" type="submit">
              Sair
            </button>
          </form>
        ) : null}
      </aside>
      <div className="min-w-0 p-6">
        <AdminBreadcrumb />
        {children}
      </div>
    </div>
  );
}

export function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </article>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded border border-dashed border-border bg-surface p-6 text-sm text-muted">{children}</p>;
}
