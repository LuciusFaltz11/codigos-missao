import { AdminPanel, Empty } from "@/components/admin/shell";
import { Field, InputShell } from "@/components/ui/input";
import { formatBrl } from "@/lib/formatters";
import { updatePrice } from "@/server/actions/admin";
import { roleHas } from "@/server/auth/rbac";
import { getAdminSession } from "@/server/auth/session";
import { tryServiceClient } from "@/server/db/clients";
import { getServerEnv, integrationStatus, type IntegrationName, type IntegrationState } from "@/server/env";

export const dynamic = "force-dynamic";

const INTEGRATIONS: Record<IntegrationName, { title: string; hint: string }> = {
  supabase: { title: "Banco e autenticação", hint: "Supabase guarda leads, mapas e o acesso do painel." },
  infinitepay: { title: "Pagamentos", hint: "InfinitePay confirma a compra antes de liberar a leitura." },
  email: { title: "E-mail", hint: "Resend envia o convite de primeiro acesso e o relatório." },
  llm: { title: "Interpretação", hint: "O modelo só entra depois do pagamento confirmado." },
  geocoding: { title: "Cidade de nascimento", hint: "A Geoapify confirma o lugar. Coordenadas ficam no servidor." },
  astronomy: { title: "Motor astronômico", hint: "O Caelus calcula as posições. Nada é inventado se o motor falhar." },
};

const STATUS_LABEL: Record<IntegrationState, string> = {
  configured: "Pronto",
  not_configured: "Ausente",
  license_unconfirmed: "Licença pendente",
};

function StatusPill({ state }: { state: IntegrationState }) {
  const tone =
    state === "configured"
      ? "bg-success/15 text-success"
      : state === "license_unconfirmed"
        ? "bg-gold-soft text-ink"
        : "bg-danger/10 text-danger";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{STATUS_LABEL[state]}</span>;
}

export default async function SettingsPage() {
  const session = await getAdminSession();
  const canWrite = session ? roleHas(session.role, "settings.write") : false;
  const env = getServerEnv();
  const status = integrationStatus(env);
  const service = tryServiceClient();
  const product = service
    ? await service.from("products").select("name,price_cents,active,currency").eq("slug", "leitura-completa").maybeSingle()
    : null;
  const cents = product?.data?.price_cents == null ? null : Number(product.data.price_cents);
  const active = Boolean(product?.data?.active);
  const readyCount = Object.values(status).filter((value) => value === "configured").length;
  return (
    <AdminPanel>
      <h1 className="font-display text-4xl">Configurações</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Preço da leitura completa e o estado das integrações. Nenhuma chave secreta aparece aqui.
      </p>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
        <section className="rounded-3xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">Venda</p>
          <h2 className="mt-1 font-display text-3xl">{product?.data?.name ? String(product.data.name) : "Leitura completa"}</h2>
          <p className="mt-2 font-display text-4xl">{cents == null ? "—" : formatBrl(cents)}</p>
          <p className="mt-1 text-sm text-muted">{active ? "Ativa no checkout" : "Oculta no checkout"}</p>
          {product?.data ? (
            <form action={updatePrice} className="mt-6 grid gap-4">
              <Field label="Preço em reais" hint="Use vírgula ou ponto. O valor cobrado é este, em centavos no InfinitePay.">
                <InputShell>
                  <span className="pl-3 text-sm text-muted">R$</span>
                  <input
                    className="input-shell-field px-2"
                    name="price"
                    inputMode="decimal"
                    defaultValue={cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",")}
                    placeholder="0,00"
                    disabled={!canWrite}
                  />
                </InputShell>
              </Field>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border px-4 py-3">
                <input className="mt-1 size-4" type="checkbox" name="active" defaultChecked={active} disabled={!canWrite} />
                <span>
                  <span className="block text-sm font-medium">Produto ativo para venda</span>
                  <span className="mt-1 block text-sm font-normal text-muted">
                    Enquanto estiver desmarcado, o checkout não oferece a leitura completa.
                  </span>
                </span>
              </label>
              <button className="min-h-11 rounded-xl bg-wine text-white" type="submit" disabled={!canWrite}>
                Salvar preço
              </button>
              {!canWrite ? <p className="text-sm text-muted">Somente admin altera o preço.</p> : null}
            </form>
          ) : (
            <div className="mt-6">
              <Empty>Semeie o banco para editar o preço da leitura completa.</Empty>
            </div>
          )}
        </section>

        <div className="grid gap-6">
          <section className="rounded-3xl border border-border bg-surface p-6">
            <h2 className="font-display text-3xl">Ambiente</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted">URL do app</dt>
                <dd className="mt-1 break-all text-sm">{env.appUrl}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Política de privacidade</dt>
                <dd className="mt-1 text-sm">{env.policyVersion}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Motor astronômico</dt>
                <dd className="mt-1 text-sm">{env.astrologyEngine}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Geocodificação</dt>
                <dd className="mt-1 text-sm">{env.geocodingProvider || "não definido"}</dd>
              </div>
            </dl>
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <h2 className="font-display text-3xl">Integrações</h2>
              <p className="text-sm text-muted">
                {readyCount} de {Object.keys(status).length} prontas
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(INTEGRATIONS) as IntegrationName[]).map((name) => {
                const item = INTEGRATIONS[name];
                const state = status[name];
                return (
                  <li key={name} className="rounded-3xl border border-border bg-surface p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-semibold">{item.title}</h3>
                      <StatusPill state={state} />
                    </div>
                    <p className="mt-2 text-sm text-muted">{item.hint}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </AdminPanel>
  );
}
