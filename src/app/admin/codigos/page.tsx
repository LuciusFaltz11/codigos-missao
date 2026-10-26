import { AdminPanel, Empty } from "@/components/admin/shell";
import { CodesEditor, type AdminCodeRow } from "@/components/admin/codes-editor";
import { cardArtDisplayUrl } from "@/features/missions/card-art";
import { officialCatalog } from "@/features/missions/catalog";
import { shadowLooksContaminated } from "@/features/missions/integrity";
import { tryServiceClient } from "@/server/db/clients";

export const dynamic = "force-dynamic";

function fromCatalog(): AdminCodeRow[] {
  return officialCatalog.map((code) => ({
    id: code.id,
    sign: code.signName,
    decan: code.decan,
    archetype: code.archetype,
    keyword: code.keyword,
    decanRuler: code.decanRuler,
    light: code.light,
    shadow: code.shadow,
    essentialOil: code.essentialOil ?? "",
    tarot: code.tarotMirrorCard ?? "",
    imageSrc: cardArtDisplayUrl(code.id, code.imageUrl),
    warning: shadowLooksContaminated(code),
    canSave: false,
  }));
}

export default async function CodesPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string }>;
}) {
  const notice = await searchParams;
  const service = tryServiceClient();
  const stored = service ? await service.from("mission_codes").select("*").order("number") : null;
  const seeded = Boolean(stored?.data?.length);
  const rows: AdminCodeRow[] = seeded
    ? stored!.data!.map((row) => ({
        id: String(row.id),
        sign: String(row.sign_name),
        decan: Number(row.decan),
        archetype: String(row.archetype),
        keyword: String(row.keyword),
        decanRuler: String(row.decan_ruler),
        light: String(row.light),
        shadow: String(row.shadow),
        essentialOil: (row.essential_oil as string | null) ?? "",
        tarot: (row.tarot_mirror_card as string | null) ?? "",
        imageSrc: cardArtDisplayUrl(
          String(row.id),
          (row.image_url as string | null) ?? null,
          row.updated_at ? String(row.updated_at) : null,
        ),
        warning: String(row.shadow).includes("Código da Missão"),
        canSave: true,
      }))
    : fromCatalog();
  return (
    <AdminPanel>
      <h1 className="font-display text-4xl">36 códigos</h1>
      {!seeded ? <p className="mt-2 text-sm text-muted">Exibindo o arquivo oficial ainda não semeado no banco.</p> : null}
      {rows.length === 0 ? <Empty>Nenhum código.</Empty> : null}
      <CodesEditor rows={rows} initialId={notice.editar} />
    </AdminPanel>
  );
}
