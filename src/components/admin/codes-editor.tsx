"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, X } from "lucide-react";
import { CodeArtField } from "@/components/admin/code-art-field";
import { Input, TextArea } from "@/components/ui/input";
import { updateCode } from "@/server/actions/admin";

export type AdminCodeRow = {
  id: string;
  sign: string;
  decan: number;
  archetype: string;
  keyword: string;
  decanRuler: string;
  light: string;
  shadow: string;
  essentialOil: string;
  tarot: string;
  imageSrc: string | null;
  warning: boolean;
  canSave: boolean;
};

export function CodesEditor({
  rows,
  initialId,
}: {
  rows: AdminCodeRow[];
  initialId?: string;
}) {
  const [openId, setOpenId] = useState(initialId ?? null);
  const selected = rows.find((row) => row.id === openId) ?? null;

  useEffect(() => {
    setOpenId(initialId ?? null);
  }, [initialId]);

  function syncUrl(id: string | null) {
    const url = id ? `/admin/codigos?editar=${id}` : "/admin/codigos";
    window.history.replaceState(null, "", url);
  }

  function openCode(id: string) {
    setOpenId(id);
    syncUrl(id);
  }

  function closeDrawer() {
    setOpenId(null);
    syncUrl(null);
  }

  return (
    <>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-160 border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="w-12 py-2">
                <span className="sr-only">Editar</span>
              </th>
              <th>Signo</th>
              <th>Decanato</th>
              <th>Arquétipo</th>
              <th>Palavra-chave</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-border hover:bg-gold-soft/70"
                tabIndex={0}
                aria-label={`Editar ${row.archetype}`}
                data-open={row.id === openId ? "true" : undefined}
                onClick={() => openCode(row.id)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openCode(row.id);
                  }
                }}
              >
                <td className="py-2">
                  <button
                    type="button"
                    className="grid size-10 place-items-center rounded-lg text-wine hover:bg-gold-soft"
                    aria-label={`Editar ${row.archetype}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      openCode(row.id);
                    }}
                  >
                    <Pencil className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </td>
                <td>{row.sign}</td>
                <td>{row.decan}</td>
                <td>
                  {row.archetype}
                  {row.warning ? <span className="ml-2 text-xs text-danger">conferir PDF</span> : null}
                </td>
                <td>{row.keyword}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog.Root
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
          {selected ? (
            <Dialog.Content className="admin-drawer fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-lg flex-col bg-surface shadow-[-16px_0_40px_rgba(36,29,34,0.08)]">
              <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
                <div>
                  <Dialog.Title className="font-display text-3xl">{selected.archetype}</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-muted">
                    {selected.sign} · decanato {selected.decan}. O par signo/decanato não é editável.
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  className="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-gold-soft hover:text-ink"
                  aria-label="Fechar edição"
                >
                  <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
                </Dialog.Close>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {selected.warning ? (
                  <p className="mb-4 rounded-xl bg-gold-soft p-3 text-sm">
                    O campo de sombra contém o texto “Código da Missão”, o que parece resíduo de extração. O valor oficial foi
                    preservado. Confira a ficha no PDF antes de publicar.
                  </p>
                ) : null}
                <form action={updateCode.bind(null, selected.id)} className="grid gap-3" key={selected.id}>
                  <CodeArtField currentSrc={selected.imageSrc} archetype={selected.archetype} />
                  <label className="grid gap-1 text-sm">
                    Arquétipo
                    <Input name="archetype" defaultValue={selected.archetype} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Palavra-chave
                    <Input name="keyword" defaultValue={selected.keyword} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Regente do decanato
                    <Input name="decanRuler" defaultValue={selected.decanRuler} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Luz
                    <TextArea name="light" defaultValue={selected.light} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Sombra
                    <TextArea name="shadow" defaultValue={selected.shadow} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Óleo essencial
                    <Input
                      name="essentialOil"
                      defaultValue={selected.essentialOil}
                      placeholder="Vazio se o PDF não informou"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Tarô espelho
                    <Input
                      name="tarotMirrorCard"
                      defaultValue={selected.tarot}
                      placeholder="Vazio se o PDF não informou"
                    />
                  </label>
                  <button className="min-h-11 rounded-xl bg-wine text-white" type="submit" disabled={!selected.canSave}>
                    Salvar rascunho
                  </button>
                </form>
              </div>
            </Dialog.Content>
          ) : null}
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
