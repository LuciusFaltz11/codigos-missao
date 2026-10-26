import { AdminPanel } from "@/components/admin/shell";
import { ImmediateFlash } from "@/components/ui/flash-toast";
import { Input, Select } from "@/components/ui/input";
import type { MethodologySnapshot } from "@/features/interpretation/context";
import { glossaryReady } from "@/features/methodology/snapshot";
import { pointLabel, PROVISIONAL_ASTROLOGY_NOTICE } from "@/lib/constants/astrology";
import { formatDateTimePt } from "@/lib/formatters";
import { resolveFlash } from "@/lib/flash";
import { publishMethodology, saveMethodologyDraft } from "@/server/actions/admin";
import { roleHas } from "@/server/auth/rbac";
import { getAdminSession } from "@/server/auth/session";
import { tryServiceClient } from "@/server/db/clients";

export const dynamic = "force-dynamic";

const ZODIAC_LABEL: Record<string, string> = {
  tropical: "Tropical",
  sidereal: "Sideral",
};

const HOUSE_LABEL: Record<string, string> = {
  placidus: "Placidus",
  whole_sign: "Signo inteiro",
};

const NODE_LABEL: Record<string, string> = {
  true: "Verdadeiro",
  mean: "Médio",
};

const FORTUNA_LABEL: Record<string, string> = {
  pending_approval: "Pendente de homologação",
  day_night_traditional: "Fórmula diurna/noturna tradicional, ainda provisória",
};

function asSnapshot(value: unknown): MethodologySnapshot | null {
  if (!value || typeof value !== "object") return null;
  return value as MethodologySnapshot;
}

export default async function MethodologyAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; salvo?: string; publicado?: string }>;
}) {
  const query = await searchParams;
  const flashParams = new URLSearchParams();
  if (query.erro) flashParams.set("erro", query.erro);
  if (query.salvo) flashParams.set("salvo", query.salvo);
  if (query.publicado) flashParams.set("publicado", query.publicado);
  const flash = resolveFlash("/admin/metodologia", flashParams);
  const session = await getAdminSession();
  const canWrite = session ? roleHas(session.role, "content.write") : false;
  const canPublish = session ? roleHas(session.role, "methodology.publish") : false;
  const service = tryServiceClient();
  const draft = service ? await service.from("methodology_versions").select("*").eq("status", "draft").maybeSingle() : null;
  const published = service
    ? await service
        .from("methodology_versions")
        .select(
          "label,zodiac,house_system,node_mode,fortuna_rule,activate_ascendant,free_preview_point,rules_validated,rules_note,snapshot,published_at",
        )
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : null;
  const row = draft?.data;
  const live = published?.data ?? null;
  const snapshot = asSnapshot(live?.snapshot);
  const glossaryPublished = snapshot ? glossaryReady(snapshot) : false;
  const homologated = Boolean(live?.rules_validated);
  return (
    <AdminPanel>
      <ImmediateFlash flash={flash} />
      <h1 className="font-display text-4xl">Metodologia</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Salvar o rascunho não libera o checkout. Mapas ainda não pagos passam a usar a versão publicada se zodíaco, casas e nodo forem os mesmos. Se as regras de cálculo mudarem, é preciso gerar um mapa novo.
      </p>

      <section className="mt-8 rounded-3xl border border-border bg-surface p-6">
        <h2 className="font-display text-2xl">Versão publicada</h2>
        {live ? (
          <>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Rótulo</dt>
                <dd className="mt-1 font-medium">{String(live.label)}</dd>
              </div>
              <div>
                <dt className="text-muted">Publicada em</dt>
                <dd className="mt-1">{live.published_at ? formatDateTimePt(String(live.published_at)) : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Homologação</dt>
                <dd className={`mt-1 font-medium ${homologated ? "text-success" : "text-danger"}`}>
                  {homologated ? "Regras homologadas pela especialista" : "Ainda não homologada"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Textos de casas e pontos</dt>
                <dd className={`mt-1 font-medium ${glossaryPublished ? "text-success" : "text-danger"}`}>
                  {glossaryPublished ? "Publicados nesta versão" : "Ainda não publicados nesta versão"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Zodíaco</dt>
                <dd className="mt-1">{ZODIAC_LABEL[String(live.zodiac)] ?? String(live.zodiac)}</dd>
              </div>
              <div>
                <dt className="text-muted">Casas</dt>
                <dd className="mt-1">{HOUSE_LABEL[String(live.house_system)] ?? String(live.house_system)}</dd>
              </div>
              <div>
                <dt className="text-muted">Nodo</dt>
                <dd className="mt-1">{NODE_LABEL[String(live.node_mode)] ?? String(live.node_mode)}</dd>
              </div>
              <div>
                <dt className="text-muted">Roda da Fortuna</dt>
                <dd className="mt-1">{FORTUNA_LABEL[String(live.fortuna_rule)] ?? String(live.fortuna_rule)}</dd>
              </div>
              <div>
                <dt className="text-muted">Ponto da prévia gratuita</dt>
                <dd className="mt-1">{pointLabel(String(live.free_preview_point))}</dd>
              </div>
              <div>
                <dt className="text-muted">Ascendente</dt>
                <dd className="mt-1">{live.activate_ascendant ? "Ativado nesta versão" : "Fora desta versão"}</dd>
              </div>
            </dl>
            {live.rules_note && !homologated ? (
              <p className="mt-4 rounded-2xl bg-gold-soft p-4 text-sm">{String(live.rules_note)}</p>
            ) : null}
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Nenhuma versão publicada. Mapas novos usam o pacote provisório até a primeira publicação homologada.
          </p>
        )}
      </section>

      {!live || !homologated ? <p className="mt-6 max-w-2xl rounded-2xl bg-gold-soft p-4 text-sm">{PROVISIONAL_ASTROLOGY_NOTICE}</p> : null}

      <form action={saveMethodologyDraft} className="mt-8 grid max-w-xl gap-3">
        <h2 className="font-display text-2xl">Rascunho</h2>
        <label className="grid gap-1 text-sm">
          Zodíaco
          <Select name="zodiac" defaultValue={String(row?.zodiac ?? "tropical")}>
            <option value="tropical">Tropical</option>
            <option value="sidereal">Sideral</option>
          </Select>
        </label>
        <label className="grid gap-1 text-sm">
          Casas
          <Select name="houseSystem" defaultValue={String(row?.house_system ?? "placidus")}>
            <option value="placidus">Placidus</option>
            <option value="whole_sign">Signo inteiro</option>
          </Select>
        </label>
        <label className="grid gap-1 text-sm">
          Nodo
          <Select name="nodeMode" defaultValue={String(row?.node_mode ?? "true")}>
            <option value="true">Verdadeiro</option>
            <option value="mean">Médio</option>
          </Select>
        </label>
        <label className="grid gap-1 text-sm">
          Roda da Fortuna
          <Select name="fortunaRule" defaultValue={String(row?.fortuna_rule ?? "pending_approval")}>
            <option value="pending_approval">Pendente de homologação</option>
            <option value="day_night_traditional">Fórmula diurna/noturna tradicional, ainda provisória</option>
          </Select>
        </label>
        <label className="grid gap-1 text-sm">
          Ponto da prévia gratuita
          <Select name="freePreviewPoint" defaultValue={String(row?.free_preview_point ?? "sun")}>
            <option value="sun">Sol</option>
            <option value="moon">Lua</option>
            <option value="north_node">Nodo Norte</option>
          </Select>
        </label>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="activateAscendant" defaultChecked={Boolean(row?.activate_ascendant)} />
          Ativar também o Ascendente
        </label>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="rulesValidated" defaultChecked={Boolean(row?.rules_validated)} />
          A especialista homologou zodíaco, casas, nodo e Fortuna
        </label>
        <button className="min-h-11 rounded-xl bg-wine text-white" type="submit" disabled={!canWrite}>
          Salvar rascunho
        </button>
      </form>
      <form action={publishMethodology} className="mt-8 grid max-w-xl gap-3 border-t border-border pt-6">
        <h2 className="font-display text-2xl">Publicar versão imutável</h2>
        <Input name="label" placeholder="Rótulo da versão, ex. 1.0.0" disabled={!canPublish} />
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="publishGlossary" disabled={!canPublish} />
          Os textos de casas e pontos foram revisados e podem ir para a interpretação
        </label>
        <button className="min-h-11 rounded-xl border border-wine px-4 text-wine" type="submit" disabled={!canPublish}>
          Publicar
        </button>
        {!canPublish ? (
          <p className="text-sm text-muted">Somente admin ou super admin publica uma versão imutável.</p>
        ) : null}
      </form>
    </AdminPanel>
  );
}
