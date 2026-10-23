import Link from "next/link";
import { SiteMenu } from "@/components/site/site-menu";

const links = [
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/metodologia", label: "Sobre a metodologia" },
  { href: "/perguntas", label: "Perguntas frequentes" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="shrink-0 font-display text-xl text-wine">
          Códigos da Missão
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted lg:flex" aria-label="Principal">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <SiteMenu />
          <Link href="/mapa" className="ui-button rounded-xl bg-wine px-4 py-2 text-sm font-semibold text-white">
            Começar
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-wine-deep text-gold-soft">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm md:grid-cols-3">
        <div>
          <p className="font-display text-2xl text-white">Códigos da Missão</p>
          <p className="mt-2 max-w-xs">Leitura simbólica. Não é diagnóstico, previsão ou destino.</p>
        </div>
        <nav className="grid gap-2" aria-label="Rodapé">
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos</Link>
          <Link href="/contato">Contato</Link>
        </nav>
        <p>Metodologia autoral de Val Wilges. As artes originais das cartas ainda não foram publicadas neste ambiente.</p>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
