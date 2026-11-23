import { BroadcastPanel } from "@/components/admin/broadcast-panel";
import { AdminPanel, Empty } from "@/components/admin/shell";
import { ImmediateFlash } from "@/components/ui/flash-toast";
import { roleHas } from "@/server/auth/rbac";
import { getAdminSession } from "@/server/auth/session";
import { loadDefaultBroadcastHtml } from "@/server/content/broadcast-template";
import { integrationStatus } from "@/server/env";
import { resolveFlash } from "@/lib/flash";

export const dynamic = "force-dynamic";

export default async function AdminEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; salvo?: string; enviados?: string; pulo?: string; falha?: string }>;
}) {
  const query = await searchParams;
  const flashParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) flashParams.set(key, value);
  }
  const flash = resolveFlash("/admin/emails", flashParams);
  const session = await getAdminSession();
  const canSend = Boolean(session && roleHas(session.role, "broadcast.send"));
  if (session && !canSend) {
    return (
      <AdminPanel>
        <Empty>Seu papel não envia campanhas de e-mail.</Empty>
      </AdminPanel>
    );
  }
  const emailReady = integrationStatus().email === "configured";
  const defaultHtml = loadDefaultBroadcastHtml();
  return (
    <AdminPanel>
      <ImmediateFlash flash={flash} />
      <h1 className="font-display text-4xl">E-mail</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Envio manual pela Resend. Cole os endereços, confira o assunto e o HTML. Cada mensagem sai com um link de
        descadastro para <span className="text-ink">/descadastrar</span>. As imagens do modelo usam o endereço público
        do site.
      </p>
      <BroadcastPanel canSend={canSend} emailReady={emailReady} defaultHtml={defaultHtml} />
    </AdminPanel>
  );
}
