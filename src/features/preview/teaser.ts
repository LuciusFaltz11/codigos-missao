import { pointHint } from "@/features/astrology/point-hints";
import { pointLabel } from "@/lib/constants/astrology";

const FEMININE_POINTS = new Set(["moon", "venus", "part_of_fortune"]);

const HOUSE_HINTS: Record<number, string> = {
  1: "individualização, presença e o modo de entrar na experiência",
  2: "valor, recursos e substância — o ter sem confundir com o ser",
  3: "percepção, mente concreta e comunicação no entorno imediato",
  4: "raízes, lar e a base interior que sustenta a vida",
  5: "expressão criativa, prazer e aquilo que nasce de si",
  6: "rotina, serviço e o aperfeiçoamento do cotidiano",
  7: "o outro, parceria e o espelhamento no vínculo",
  8: "transformação, intimidade e regeneração simbólica",
  9: "sentido, verdade e expansão da visão de mundo",
  10: "realização pública, vocação e reconhecimento",
  11: "grupos, ideais e o futuro compartilhado",
  12: "unidade, inconsciente e a entrega a algo maior",
};

export type FreePreviewSummary = {
  kicker: string;
  body: string;
  invitation: string;
};

function pointPhrase(pointId: string) {
  const label = pointLabel(pointId);
  return FEMININE_POINTS.has(pointId) ? `a ${label}` : `o ${label}`;
}

export function houseHint(houseNumber: number) {
  return HOUSE_HINTS[houseNumber] ?? `casa ${houseNumber}`;
}

export function composeFreePreviewSummary(input: {
  pointId: string;
  signName: string;
  houseNumber: number;
  archetype: string;
  keyword: string;
  otherCount: number;
}): FreePreviewSummary {
  const point = pointPhrase(input.pointId);
  const Point = point.charAt(0).toUpperCase() + point.slice(1);
  const hint = pointHint(input.pointId).replace(/\.$/, "");
  const field = houseHint(input.houseNumber);
  const others =
    input.otherCount <= 0
      ? "os demais encontros deste mapa"
      : input.otherCount === 1
        ? "o outro Código deste mapa"
        : `os outros ${input.otherCount} Códigos deste mapa`;

  return {
    kicker: `${Point} encontra ${input.archetype}`,
    body: `Neste mapa, ${point} em ${input.signName} na casa ${input.houseNumber} encontra ${input.archetype} e o verbo ${input.keyword}. ${hint}. Esse movimento se mistura a esse arquétipo no campo de ${field} — um convite a observar como essa força pode se expressar, sem virar destino nem diagnóstico.`,
    invitation: `Esta é só a primeira leitura. A experiência completa costura este Código com ${others}, a Luz e a Sombra no contexto de cada ponto, e uma síntese para guardar.`,
  };
}
