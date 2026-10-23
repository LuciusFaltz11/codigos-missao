import { PageShell } from "@/components/site/chrome";

export const metadata = { title: "Termos" };

export default function TermsPage() {
  return (
    <PageShell>
      <article className="mx-auto grid max-w-3xl gap-4 px-4 py-12 leading-8">
        <p className="text-sm font-semibold text-wine">Minuta pendente de revisão jurídica</p>
        <h1 className="font-display text-4xl">Termos de uso</h1>
        <p>A leitura é uma experiência simbólica de autoconhecimento. Ela não é serviço médico, psicológico, jurídico ou financeiro e não promete eventos futuros.</p>
        <p>O acesso completo depende da confirmação do pagamento pela InfinitePay. Reembolso e manutenção do acesso após reembolso aguardam regra de negócio e não são aplicados automaticamente.</p>
        <p>O preço vigente é o configurado no servidor no momento do pedido. O valor enviado pelo navegador não é usado.</p>
      </article>
    </PageShell>
  );
}
