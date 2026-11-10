"use client";

import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";

const links = [
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/metodologia", label: "Sobre a metodologia" },
  { href: "/perguntas", label: "Perguntas frequentes" },
];

export function SiteMenu() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="rounded border border-line px-3 py-2 text-sm lg:hidden">Menu</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 data-[state=open]:animate-[admin-drawer-in_160ms_ease-out]" />
        <Dialog.Content className="fixed top-0 right-0 z-50 flex h-full w-72 flex-col gap-2 overflow-y-auto overscroll-contain bg-surface p-6 data-[state=open]:animate-[admin-drawer-in_180ms_ease-out]">
          <Dialog.Title className="font-display text-2xl text-wine">Menu</Dialog.Title>
          <Dialog.Description className="sr-only">Navegação do site</Dialog.Description>
          <nav className="mt-4 grid gap-1" aria-label="Principal">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="rounded px-2 py-3 text-sm hover:bg-canvas">
                {link.label}
              </Link>
            ))}
          </nav>
          <Dialog.Close className="mt-auto text-left text-sm text-muted">Fechar</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
