import Link from "next/link";
import { PageShell } from "@/components/site/chrome";
import { MissionCard } from "@/components/mission-cards/mission-card";
import { cardArtDisplayUrl } from "@/features/missions/card-art";
import { officialCatalog } from "@/features/missions/catalog";
import { elementLabel, signBySlug, DISCLAIMER } from "@/lib/constants/astrology";
import { tryServiceClient } from "@/server/db/clients";

export const dynamic = "force-dynamic";

type HomeSample = {
  id: string;
  number: number;
  archetype: string;
  keyword: string;
  signSlug: string;
  signName: string;
  decan: number;
  imageSrc: string | null;
};

function shuffle<T>(items: readonly T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap] as T;
    copy[swap] = current as T;
  }
  return copy;
}

function pickHomeSampleIds(rows: { id: string; image_url: string | null }[]) {
  const withArt = rows.filter((row) => row.image_url).map((row) => String(row.id));
  const pool = withArt.length > 0 ? withArt : officialCatalog.map((code) => code.id);
  return shuffle(pool).slice(0, 3);
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
        number: code.number,
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
      <section className="border-b border-border bg-canvas">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div className="min-w-0">
            <p className="font-display text-xl text-wine">Val Wilges</p>
            <h1 className="mt-3 max-w-xl font-display text-5xl leading-[1.1] text-ink md:text-6xl">
              Descubra seus Códigos da Missão
            </h1>
            <div className="hairline mt-6" />
            <p className="mt-6 max-w-lg text-lead text-muted">
              Uma leitura simbólica do mapa natal cruzada com 36 arquétipos femininos. O código nasce do signo e do grau. A inteligência artificial não escolhe a posição.
            </p>
            <Link href="/mapa" className="ui-button mt-8 inline-flex min-h-11 items-center rounded bg-wine px-5 font-semibold text-white hover:bg-wine-deep">
              Descobrir meus Códigos da Missão
            </Link>
          </div>
          <div className="grid min-w-0 grid-cols-3 gap-3">
            {samples.map((code) => (
              <figure key={code.id} tabIndex={0} className="group relative min-w-0 border border-gold/70 bg-white outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
                <div className="overflow-hidden bg-gold-soft text-ink">
                  {code.imageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={code.imageSrc} alt={`Carta ${code.archetype}`} className="aspect-2/3 h-full w-full object-cover" />
                  ) : (
                    <div className="flex aspect-2/3 flex-col justify-end p-3">
                      <p className="text-[10px] text-muted">{elementLabel(signBySlug(code.signSlug)?.element ?? "")}</p>
                      <p className="mt-6 font-display text-lg leading-tight wrap-break-word">{code.archetype}</p>
                      <p className="mt-2 text-xs">{code.keyword}</p>
                    </div>
                  )}
                </div>
                {code.imageSrc ? (
                  <figcaption className="border-t border-gold/70 bg-white px-2 py-2">
                    <p className="text-[10px] font-medium text-gold">Código {String(code.number).padStart(2, "0")}</p>
                    <p className="mt-1 line-clamp-2 font-display text-sm leading-tight text-ink">{code.archetype}</p>
                    <p className="mt-1 text-[10px] font-semibold text-wine">{code.keyword}</p>
                    <p className="mt-1 text-[10px] leading-snug text-muted">
                      {code.signName} · {code.decan}º decanato
                    </p>
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-sm text-muted">As cartas acima são exemplos do catálogo. Elas não representam o mapa de uma pessoa.</p>
        <div className="mt-10 grid gap-0 border-t border-line md:grid-cols-3 md:border-t-0 md:border-l md:border-line">
          {[
            ["1", "Nascimento", "Data, hora exata e cidade confirmada, com fuso histórico."],
            ["2", "Prévia", "Uma ativação gratuita, hoje proposta no Sol, sem revelar o restante."],
            ["3", "Leitura", "Depois do pagamento confirmado, a interpretação integrada, o PDF e o e-mail."],
          ].map(([number, title, text]) => (
            <article key={number} className="border-b border-line px-0 py-6 md:border-b-0 md:border-r md:px-8 md:py-2">
              <p className="font-display text-3xl text-wine">{number}</p>
              <h2 className="mt-3 font-display text-2xl">{title}</h2>
              <p className="mt-2 text-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-2xl px-4 pb-16">
        <div className="hairline" />
        <h2 className="mt-6 font-display text-4xl">Luz e sombra, sem julgamento</h2>
        <p className="mt-4 text-lead text-muted">{DISCLAIMER}</p>
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
