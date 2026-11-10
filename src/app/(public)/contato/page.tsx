import { PageShell } from "@/components/site/chrome";

export const metadata = { title: "Contato" };

export default function ContactPage() {
  return (
    <PageShell>
      <article className="mx-auto grid max-w-2xl gap-4 px-4 py-12">
        <h1 className="font-display text-4xl">Contato</h1>
        <div className="hairline" />
        <p className="text-lead text-muted">O canal público de contato ainda será definido pela operação. Enquanto isso, pedidos sobre dados pessoais devem aguardar o endereço publicado nesta página.</p>
      </article>
    </PageShell>
  );
}
