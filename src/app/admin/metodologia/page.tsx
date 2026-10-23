import { AdminPanel } from "@/components/admin/shell";
import { Input, Select } from "@/components/ui/input";
import { PROVISIONAL_ASTROLOGY_NOTICE } from "@/lib/constants/astrology";
import { publishMethodology, saveMethodologyDraft } from "@/server/actions/admin";
import { tryServiceClient } from "@/server/db/clients";

export const dynamic = "force-dynamic";

export default async function MethodologyAdminPage() {
  const service = tryServiceClient();
  const draft = service ? await service.from("methodology_versions").select("*").eq("status", "draft").maybeSingle() : null;
  const row = draft?.data;
  return (
    <AdminPanel>
      <h1 className="font-display text-4xl">Metodologia</h1>
      <p className="mt-3 max-w-2xl rounded-2xl bg-gold-soft p-4 text-sm">{PROVISIONAL_ASTROLOGY_NOTICE}</p>
      <form action={saveMethodologyDraft} className="mt-6 grid max-w-xl gap-3">
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
        <button className="min-h-11 rounded-xl bg-wine text-white" type="submit" disabled={!row}>
          Salvar rascunho
        </button>
      </form>
      <form action={publishMethodology} className="mt-8 grid max-w-xl gap-3 border-t border-border pt-6">
        <h2 className="font-display text-2xl">Publicar versão imutável</h2>
        <Input name="label" placeholder="Rótulo da versão, ex. 1.0.0" />
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="publishGlossary" />
          Os textos de casas e pontos foram revisados e podem ir para a interpretação
        </label>
        <button className="min-h-11 rounded-xl border border-wine px-4 text-wine" type="submit" disabled={!row}>
          Publicar
        </button>
      </form>
    </AdminPanel>
  );
}
