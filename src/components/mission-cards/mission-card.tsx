import { elementLabel } from "@/lib/constants/astrology";
import { Badge } from "@/components/ui/badge";

export function MissionCard({
  archetype,
  keyword,
  element,
  signName,
  decan,
  light,
  shadow,
  imageUrl,
  caption,
}: {
  archetype: string;
  keyword: string;
  element?: string | null;
  signName?: string;
  decan?: number;
  light?: string;
  shadow?: string;
  imageUrl?: string | null;
  caption?: string;
}) {
  const tone = element === "fogo" || element === "terra" || element === "ar" || element === "agua" ? element : "neutral";
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="relative aspect-[2/3] border-b border-gold bg-gold-soft">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={`Carta ${archetype}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-xs tracking-[0.2em] text-muted uppercase">Arte original pendente</p>
            <p className="mt-4 font-display text-3xl text-wine">{archetype}</p>
          </div>
        )}
      </div>
      <div className="grid gap-3 p-5">
        {caption ? <p className="text-xs text-muted">{caption}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          {element ? <Badge tone={tone}>{elementLabel(element)}</Badge> : null}
          {signName && decan ? (
            <Badge>
              {signName} · decanato {decan}
            </Badge>
          ) : null}
        </div>
        <h3 className="font-display text-2xl">{archetype}</h3>
        <p className="text-sm font-semibold tracking-wide text-wine uppercase">{keyword}</p>
        {light ? <p className="text-sm leading-6">{light}</p> : null}
        {shadow ? (
          <details>
            <summary className="cursor-pointer text-sm font-semibold">Sombra</summary>
            <p className="mt-2 text-sm leading-6 text-muted">{shadow}</p>
          </details>
        ) : null}
      </div>
    </article>
  );
}
