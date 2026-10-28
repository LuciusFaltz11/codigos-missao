import { DEFAULT_ACTIVATION_POINTS, PROVISIONAL_ASTROLOGY_NOTICE, resolvedActivationPoints } from "@/lib/constants/astrology";
import { editorialKnowledge, officialCatalog, type MissionCode } from "@/features/missions/catalog";
import type { MethodologySnapshot } from "@/features/interpretation/context";

export function provisionalSnapshot(codes: MissionCode[] = officialCatalog): MethodologySnapshot {
  return {
    versionLabel: "0.1.0-provisional",
    status: "provisional",
    rulesValidated: false,
    zodiac: "tropical",
    houseSystem: "placidus",
    nodeMode: "true",
    fortunaRule: "pending_approval",
    activateAscendant: true,
    freePreviewPoint: "sun",
    activationPoints: [...DEFAULT_ACTIVATION_POINTS],
    codes,
    houses: editorialKnowledge.casas.map((house) => ({
      id: String(house.numero),
      title: house.titulo,
      summary: house.resumo,
      published: false,
    })),
    points: editorialKnowledge.pontos.map((point) => ({
      id: point.id,
      title: point.nome,
      summary: point.resumo,
      published: false,
    })),
    notice: PROVISIONAL_ASTROLOGY_NOTICE,
  };
}

export function glossaryReady(snapshot: MethodologySnapshot) {
  const housesReady = Array.from({ length: 12 }, (_, index) => String(index + 1)).every((id) => {
    const house = snapshot.houses.find((item) => item.id === id);
    return Boolean(house?.published && house.summary.trim());
  });
  const pointsReady = resolvedActivationPoints(snapshot).every((id) => {
    if (id === "part_of_fortune" && snapshot.fortunaRule === "pending_approval") return true;
    const point = snapshot.points.find((item) => item.id === id);
    return Boolean(point?.published && point.summary.trim());
  });
  return snapshot.status === "published" && housesReady && pointsReady;
}

export function methodologySellable(snapshot: MethodologySnapshot) {
  return snapshot.rulesValidated && glossaryReady(snapshot);
}

export function calculationCompatible(frozen: MethodologySnapshot, published: MethodologySnapshot) {
  return frozen.zodiac === published.zodiac && frozen.houseSystem === published.houseSystem && frozen.nodeMode === published.nodeMode;
}

export function adoptPublishedSnapshot(
  frozen: MethodologySnapshot,
  published: MethodologySnapshot | null,
  input: { chartComplete: boolean; hasEntitlement: boolean },
) {
  if (input.hasEntitlement || !input.chartComplete || !published) return frozen;
  if (methodologySellable(frozen)) return frozen;
  if (!methodologySellable(published) || !calculationCompatible(frozen, published)) return frozen;
  return published;
}

export function checkoutBlockers(input: {
  chartStatus: string;
  snapshot: MethodologySnapshot;
  priceCents: number | null;
  integrations: { infinitepay: string; llm: string; email: string };
  alreadyEntitled: boolean;
  requirePaymentProvider?: boolean;
}) {
  const blockers: string[] = [];
  const requirePaymentProvider = input.requirePaymentProvider ?? true;
  if (input.alreadyEntitled) blockers.push("Esta leitura já está liberada.");
  if (input.chartStatus !== "complete") {
    blockers.push("O mapa ainda não tem um cálculo astronômico concluído.");
  }
  if (input.snapshot.status !== "published" || !input.snapshot.rulesValidated) {
    blockers.push(
      "Este mapa ainda usa a metodologia do momento em que foi gerado. Publique e homologue no painel; mapas não pagos com o mesmo zodíaco, casas e nodo entram na venda sozinhos.",
    );
  }
  if (!glossaryReady(input.snapshot)) {
    blockers.push(
      "Os textos de casas e pontos desta versão ainda não foram publicados. Na publicação, marque que os textos podem ir para a interpretação.",
    );
  }
  if (input.priceCents === null) blockers.push("O preço do produto ainda não foi configurado.");
  if (requirePaymentProvider && input.integrations.infinitepay !== "configured") {
    blockers.push("A InfinitePay não está configurada.");
  }
  if (input.integrations.llm !== "configured") blockers.push("O provedor de interpretação não está configurado.");
  if (input.integrations.email !== "configured") blockers.push("O e-mail transacional não está configurado.");
  return blockers;
}
