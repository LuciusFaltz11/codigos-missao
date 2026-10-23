import { AdminPanel, Empty } from "@/components/admin/shell";
import { Input, TextArea } from "@/components/ui/input";
import { editorialKnowledge } from "@/features/missions/catalog";
import { updateGlossary } from "@/server/actions/admin";
import { tryServiceClient } from "@/server/db/clients";

export const dynamic = "force-dynamic";

export default async function AstrologyAdminPage() {
  const service = tryServiceClient();
  const houses = service ? await service.from("house_meanings").select("house_number,title,summary,published").order("house_number") : null;
  const points = service ? await service.from("point_meanings").select("id,name,summary,published") : null;
  const signs = service ? await service.from("sign_meanings").select("id,name,summary,status") : null;
  const houseRows = houses?.data?.length
    ? houses.data
    : editorialKnowledge.casas.map((house) => ({ house_number: house.numero, title: house.titulo, summary: house.resumo, published: false }));
  const pointRows = points?.data?.length
    ? points.data
    : editorialKnowledge.pontos.map((point) => ({ id: point.id, name: point.nome, summary: point.resumo, published: false }));
  const signRows = signs?.data?.length
    ? signs.data
    : editorialKnowledge.signos.map((sign) => ({ id: sign.id, name: sign.nome, summary: sign.significado_editorial, status: sign.status }));
  return (
    <AdminPanel>
      <h1 className="font-display text-4xl">Base astrológica</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Os resumos vieram dos PDFs como rascunho. Eles não vão para a interpretação paga enquanto não forem publicados com a metodologia. O glossário dos signos continua pendente.
      </p>
      <div className="mt-8 grid gap-8">
        {houseRows.map((house) => (
          <form key={String(house.house_number)} action={updateGlossary.bind(null, "house", String(house.house_number))} className="grid gap-2 rounded-2xl bg-surface p-4">
            <p className="text-xs text-muted">Casa {String(house.house_number)} · {house.published ? "publicado" : "rascunho"}</p>
            <Input name="title" defaultValue={String(house.title)} />
            <TextArea className="min-h-24" name="summary" defaultValue={String(house.summary)} />
            <button className="justify-self-start rounded-xl bg-wine px-4 py-2 text-sm text-white" type="submit" disabled={!houses?.data?.length}>
              Salvar casa
            </button>
          </form>
        ))}
        {pointRows.map((point) => (
          <form key={String(point.id)} action={updateGlossary.bind(null, "point", String(point.id))} className="grid gap-2 rounded-2xl bg-surface p-4">
            <p className="text-xs text-muted">{String(point.name)} · {point.published ? "publicado" : "rascunho"}</p>
            <Input name="title" defaultValue={String(point.name)} />
            <TextArea className="min-h-24" name="summary" defaultValue={String(point.summary)} />
            <button className="justify-self-start rounded-xl bg-wine px-4 py-2 text-sm text-white" type="submit" disabled={!points?.data?.length}>
              Salvar ponto
            </button>
          </form>
        ))}
        <section>
          <h2 className="font-display text-2xl">Signos</h2>
          {signRows.every((sign) => !sign.summary) ? <Empty>Glossário autoral dos signos pendente. Nenhum significado foi preenchido.</Empty> : null}
          <ul className="mt-3 grid gap-2 text-sm">
            {signRows.map((sign) => (
              <li key={String(sign.id)}>
                {String(sign.name)} — {String(sign.status)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminPanel>
  );
}
