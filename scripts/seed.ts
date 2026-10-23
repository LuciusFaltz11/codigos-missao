import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_ACTIVATION_POINTS, PROVISIONAL_ASTROLOGY_NOTICE } from "../src/lib/constants/astrology";
import { editorialKnowledge, officialCatalog } from "../src/features/missions/catalog";
import { inspectCatalog } from "../src/features/missions/integrity";
import { INDIVIDUAL_SYSTEM_PROMPT, PROMPT_VERSION, SYNTHESIS_SYSTEM_PROMPT } from "../src/features/interpretation/prompts";

function loadLocalEnv() {
  const file = resolve(process.cwd(), ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function requireNode22() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 22) {
    console.error(`Use Node 22 (nvm use). Esta sessão está em ${process.versions.node}.`);
    process.exit(1);
  }
}

async function main() {
  requireNode22();
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Supabase não configurado. Nada foi semeado.");
    process.exit(1);
  }

  const issues = inspectCatalog(officialCatalog);
  if (issues.length > 0) {
    console.error(issues);
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const codes = officialCatalog.map((code) => ({
    id: code.id,
    number: code.number,
    sign_slug: code.signSlug,
    sign_name: code.signName,
    decan: code.decan,
    start_degree: code.startDegreeInclusive,
    end_degree: code.endDegreeExclusive,
    archetype: code.archetype,
    keyword: code.keyword,
    decan_ruler: code.decanRuler,
    light: code.light,
    shadow: code.shadow,
    essential_oil: code.essentialOil,
    tarot_mirror_card: code.tarotMirrorCard,
    image_url: code.imageUrl,
    source_page: code.sourcePage,
  }));

  const { error: codeError } = await supabase.from("mission_codes").upsert(codes);
  if (codeError) throw codeError;

  const { error: houseError } = await supabase.from("house_meanings").upsert(
    editorialKnowledge.casas.map((house) => ({
      house_number: house.numero,
      title: house.titulo,
      summary: house.resumo,
      keywords: house.palavras_chave,
      source: house.fonte,
      published: false,
    })),
  );
  if (houseError) throw houseError;

  const { error: pointError } = await supabase.from("point_meanings").upsert(
    editorialKnowledge.pontos.map((point) => ({
      id: point.id,
      name: point.nome,
      summary: point.resumo,
      keywords: point.palavras_chave,
      source: point.fonte,
      published: false,
    })),
  );
  if (pointError) throw pointError;

  const { error: signError } = await supabase.from("sign_meanings").upsert(
    editorialKnowledge.signos.map((sign) => ({
      id: sign.id,
      name: sign.nome,
      element: sign.elemento,
      summary: sign.significado_editorial,
      status: sign.status,
    })),
  );
  if (signError) throw signError;

  const existingDraft = await supabase.from("methodology_versions").select("id").eq("status", "draft").maybeSingle();
  if (!existingDraft.data) {
    const { error } = await supabase.from("methodology_versions").insert({
      label: "rascunho",
      status: "draft",
      activation_points: DEFAULT_ACTIVATION_POINTS,
      rules_validated: false,
      rules_note: PROVISIONAL_ASTROLOGY_NOTICE,
    });
    if (error) throw error;
  }

  const { error: productError } = await supabase.from("products").upsert(
    {
      slug: "leitura-completa",
      name: "Leitura completa dos Códigos da Missão",
      description: "Ativações calculadas, padrões objetivos, síntese, PDF e e-mail. O preço precisa ser definido pela operação.",
      price_cents: null,
      currency: "BRL",
      active: false,
    },
    { onConflict: "slug" },
  );
  if (productError) throw productError;

  const { error: promptError } = await supabase.from("interpretation_prompts").upsert(
    [
      { kind: "individual", version: PROMPT_VERSION, body: INDIVIDUAL_SYSTEM_PROMPT, status: "published" },
      { kind: "synthesis", version: PROMPT_VERSION, body: SYNTHESIS_SYSTEM_PROMPT, status: "published" },
    ],
    { onConflict: "kind,version" },
  );
  if (promptError) throw promptError;

  console.log("Seed concluído: 36 códigos, glossário em rascunho, produto sem preço e metodologia provisória não publicada.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Seed falhou.");
  process.exit(1);
});
