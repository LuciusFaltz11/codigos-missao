import { FIRE_SIGN_SLUGS, SIGNS } from "@/lib/constants/astrology";
import { officialCatalog, type MissionCode } from "@/features/missions/catalog";

export type CatalogIssue = { codeId: string | null; message: string };

export function inspectCatalog(catalog: MissionCode[] = officialCatalog): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  if (catalog.length !== 36) {
    issues.push({ codeId: null, message: `O catálogo tem ${catalog.length} registros; o esperado é 36.` });
  }

  const pairs = new Set<string>();
  const ids = new Set<string>();
  const numbers = new Set<number>();
  for (const code of catalog) {
    const pair = `${code.signSlug}:${code.decan}`;
    if (pairs.has(pair)) issues.push({ codeId: code.id, message: `Par duplicado ${pair}.` });
    pairs.add(pair);
    if (ids.has(code.id)) issues.push({ codeId: code.id, message: "ID duplicado." });
    ids.add(code.id);
    if (code.id !== `${code.signSlug}-${code.decan}`) {
      issues.push({ codeId: code.id, message: "O ID não segue signo-decanato." });
    }
    if (numbers.has(code.number)) issues.push({ codeId: code.id, message: "Número duplicado." });
    numbers.add(code.number);
    const expectedStart = (code.decan - 1) * 10;
    if (code.startDegreeInclusive !== expectedStart || code.endDegreeExclusive !== expectedStart + 10) {
      issues.push({ codeId: code.id, message: "A faixa de graus não é [0,10), [10,20) ou [20,30)." });
    }
    if (!code.archetype || !code.keyword || !code.decanRuler || !code.light || !code.shadow) {
      issues.push({ codeId: code.id, message: "Campo textual obrigatório vazio." });
    }
  }

  for (const sign of SIGNS) {
    for (const decan of [1, 2, 3] as const) {
      if (!pairs.has(`${sign.slug}:${decan}`)) {
        issues.push({ codeId: null, message: `Falta ${sign.slug} decanato ${decan}.` });
      }
    }
  }

  return issues;
}

export function fireCardsMissingOilAndTarot(catalog: MissionCode[] = officialCatalog) {
  return catalog.filter(
    (code) =>
      (FIRE_SIGN_SLUGS as readonly string[]).includes(code.signSlug) &&
      code.essentialOil === null &&
      code.tarotMirrorCard === null,
  );
}

/** Aviso editorial. Não altera o texto oficial. */
export function shadowLooksContaminated(code: MissionCode) {
  return code.shadow.includes("Código da Missão");
}
