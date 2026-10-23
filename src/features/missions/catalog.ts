import { z } from "zod";
import catalogFile from "../../../docs/product/03_catalogo_36_codigos.json";
import knowledgeFile from "../../../docs/product/06_base_conhecimento_astrologico.json";

const rawCodeSchema = z.object({
  id: z.string().min(1),
  numero: z.number().int(),
  signo: z.string().min(1),
  signo_slug: z.string().min(1),
  decanato: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  grau_inicio_inclusivo: z.number(),
  grau_fim_exclusivo: z.number(),
  arquetipo_feminino: z.string().min(1),
  palavra_chave: z.string().min(1),
  regente_do_decanato: z.string().min(1),
  luz: z.string().min(1),
  sombra: z.string().min(1),
  oleo_essencial: z.string().nullable(),
  carta_taro_espelho: z.string().nullable(),
  arte_imagem: z.string().nullable(),
  pagina_origem_pdf: z.number().int(),
});

export type MissionCode = {
  id: string;
  number: number;
  signName: string;
  signSlug: string;
  decan: 1 | 2 | 3;
  startDegreeInclusive: number;
  endDegreeExclusive: number;
  archetype: string;
  keyword: string;
  decanRuler: string;
  light: string;
  shadow: string;
  essentialOil: string | null;
  tarotMirrorCard: string | null;
  imageUrl: string | null;
  sourcePage: number;
};

const rawCatalogSchema = z.object({
  fonte: z.string(),
  quantidade: z.literal(36),
  descricao: z.string(),
  codigos: z.array(rawCodeSchema).length(36),
});

const knowledgeSchema = z.object({
  status: z.string(),
  descricao: z.string(),
  casas: z.array(
    z.object({
      numero: z.number().int().min(1).max(12),
      titulo: z.string(),
      resumo: z.string(),
      palavras_chave: z.array(z.string()),
      fonte: z.string(),
      paginas_fonte: z.string(),
    }),
  ),
  pontos: z.array(
    z.object({
      id: z.string(),
      nome: z.string(),
      resumo: z.string(),
      palavras_chave: z.array(z.string()),
      fonte: z.string(),
      paginas_fonte: z.string(),
    }),
  ),
  signos: z.array(
    z.object({
      id: z.string(),
      nome: z.string(),
      elemento: z.string(),
      significado_editorial: z.string().nullable(),
      status: z.string(),
    }),
  ),
  orientacoes: z.array(z.string()),
});

function toMissionCode(raw: z.infer<typeof rawCodeSchema>): MissionCode {
  return {
    id: raw.id,
    number: raw.numero,
    signName: raw.signo,
    signSlug: raw.signo_slug,
    decan: raw.decanato,
    startDegreeInclusive: raw.grau_inicio_inclusivo,
    endDegreeExclusive: raw.grau_fim_exclusivo,
    archetype: raw.arquetipo_feminino,
    keyword: raw.palavra_chave,
    decanRuler: raw.regente_do_decanato,
    light: raw.luz,
    shadow: raw.sombra,
    essentialOil: raw.oleo_essencial,
    tarotMirrorCard: raw.carta_taro_espelho,
    imageUrl: raw.arte_imagem,
    sourcePage: raw.pagina_origem_pdf,
  };
}

const parsedCatalog = rawCatalogSchema.parse(catalogFile);
export const officialCatalog: MissionCode[] = parsedCatalog.codigos.map(toMissionCode);
export const officialCatalogSource = parsedCatalog.fonte;

export const editorialKnowledge = knowledgeSchema.parse(knowledgeFile);

export function codeById(id: string, catalog: MissionCode[] = officialCatalog) {
  return catalog.find((code) => code.id === id) ?? null;
}

export function codeForSignDecan(
  signSlug: string,
  decan: 1 | 2 | 3,
  catalog: MissionCode[] = officialCatalog,
) {
  return catalog.find((code) => code.signSlug === signSlug && code.decan === decan) ?? null;
}
