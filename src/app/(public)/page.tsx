import Link from "next/link";
import { PageShell } from "@/components/site/chrome";
import { MissionCard } from "@/components/mission-cards/mission-card";
import { cardArtDisplayUrl } from "@/features/missions/card-art";
import { officialCatalog } from "@/features/missions/catalog";
import { elementLabel, signBySlug, DISCLAIMER } from "@/lib/constants/astrology";
import { tryServiceClient } from "@/server/db/clients";

export const dynamic = "force-dynamic";

const HOME_SAMPLE_IDS = ["aries-1", "touro-2", "peixes-3"];

type HomeSample = {
  id: string;
  archetype: string;
  keyword: string;
  signSlug: string;
  signName: string;
  decan: number;
  imageSrc: string | null;
};

function pickHomeSampleIds(rows: { id: string; image_url: string | null }[]) {
  const withArt = new Set(rows.filter((row) => row.image_url).map((row) => String(row.id)));
  const preferred = HOME_SAMPLE_IDS.filter((id) => withArt.has(id));
  if (preferred.length === HOME_SAMPLE_IDS.length) return preferred;
  const rest = rows.map((row) => String(row.id)).filter((id) => withArt.has(id) && !preferred.includes(id));
  const picked = [...preferred, ...rest].slice(0, 3);
  return picked.length > 0 ? picked : HOME_SAMPLE_IDS;
}

async function loadHomeSamples(): Promise<HomeSample[]> {
  const service = tryServiceClient();
  const stored = service
    ? await service.from("mission_codes").select("id,image_url,updated_at").order("number")
    : null;
  const rows = stored?.data ?? [];
  const art = new Map(rows.map((row) => [String(row.id), row]));
  const ids = pickHomeSampleIds(rows.map((row) => ({ id: String(row.id), image_url: (row.image_url as string | null) ?? null })));
  return ids
    .map((id) => officialCatalog.find((code) => code.id === id))
    .filter((code): code is NonNullable<typeof code> => Boolean(code))
    .map((code) => {
      const row = art.get(code.id);
      const storedUrl = typeof row?.image_url === "string" ? row.image_url : null;
      return {
        id: code.id,
        archetype: code.archetype,
        keyword: code.keyword,
        signSlug: code.signSlug,
        signName: code.signName,
        decan: code.decan,
        imageSrc: cardArtDisplayUrl(code.id, storedUrl ?? code.imageUrl, row?.updated_at ? String(row.updated_at) : null),
      };
    });
}

export default async function HomePage() {
  const samples = await loadHomeSamples();
  return (
    <PageShell>
      <section className="overflow-hidden bg-wine text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div className="min-w-0">
            <p className="text-sm tracking-[0.18em] text-gold-soft uppercase">Val Wilges</p>
            <h1 className="mt-4 max-w-xl font-display text-5xl leading-tight md:text-6xl">
              Descubra seus Códigos da Missão
            </h1>
            <p className="mt-6 max-w-lg text-lg text-gold-soft">
              Uma leitura simbólica do mapa natal cruzada com 36 arquétipos femininos. O código nasce do signo e do grau. A inteligência artificial não escolhe a posição.
            </p>
            <Link href="/mapa" className="ui-button mt-8 inline-flex min-h-11 items-center rounded-xl bg-white px-5 font-semibold text-wine">
              Descobrir meus Códigos da Missão
            </Link>
          </div>
          <div className="grid min-w-0 grid-cols-3 gap-3">
            {samples.map((code) => (
              <div key={code.id} className="min-w-0 overflow-hidden rounded-2xl bg-gold-soft text-ink">
                {code.imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={code.imageSrc} alt={`Carta ${code.archetype}`} className="aspect-2/3 h-full w-full object-cover" />
                ) : (
                  <div className="flex aspect-2/3 flex-col justify-end p-3">
                    <p className="text-[10px] tracking-widest text-muted uppercase">{elementLabel(signBySlug(code.signSlug)?.element ?? "")}</p>
                    <p className="mt-6 font-display text-lg leading-tight wrap-break-word">{code.archetype}</p>
                    <p className="mt-2 text-xs uppercase">{code.keyword}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-sm text-muted">As cartas acima são exemplos do catálogo. Elas não representam o mapa de uma pessoa.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            ["1", "Nascimento", "Data, hora exata e cidade confirmada, com fuso histórico."],
            ["2", "Prévia", "Uma ativação gratuita, hoje proposta no Sol, sem revelar o restante."],
            ["3", "Leitura", "Depois do pagamento confirmado, a interpretação integrada, o PDF e o e-mail."],
          ].map(([number, title, text]) => (
            <article key={number} className="rounded-2xl border border-border bg-surface p-6">
              <p className="font-display text-3xl text-wine">{number}</p>
              <h2 className="mt-3 font-display text-2xl">{title}</h2>
              <p className="mt-2 text-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-16 text-center">
        <h2 className="font-display text-4xl">Luz e sombra, sem julgamento</h2>
        <p className="mt-4 text-lg leading-8 text-muted">{DISCLAIMER}</p>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 md:grid-cols-3">
        {samples.map((code) => (
          <MissionCard
            key={code.id}
            archetype={code.archetype}
            keyword={code.keyword}
            element={signBySlug(code.signSlug)?.element}
            signName={code.signName}
            decan={code.decan}
            imageUrl={code.imageSrc}
            caption="Exemplo do catálogo, não é um mapa calculado."
          />
        ))}
      </section>
    </PageShell>
  );
}
