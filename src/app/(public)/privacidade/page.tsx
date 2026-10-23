import { PageShell } from "@/components/site/chrome";

export const metadata = { title: "Privacidade" };

export default function PrivacyPage() {
  return (
    <PageShell>
      <article className="mx-auto grid max-w-3xl gap-4 px-4 py-12 leading-8">
        <p className="text-sm font-semibold text-wine">Minuta pendente de revisão jurídica</p>
        <h1 className="font-display text-4xl">Privacidade</h1>
        <p>Esta página descreve a operação prevista para que a assessoria jurídica possa revisá-la. Ela ainda não é uma política publicada.</p>
        <p>Os dados tratados são nome, e-mail, data, hora e local de nascimento, consentimentos e a leitura gerada. A finalidade é calcular o mapa, entregar a prévia, processar a compra e enviar o relatório.</p>
        <p>O pagamento é feito pela InfinitePay. O e-mail transacional usa um provedor configurável, inicialmente Resend. A interpretação, quando habilitada, envia ao modelo apenas código, ponto, casa e textos editoriais, sem nome, e-mail ou cidade.</p>
        <p>O aceite de marketing é separado e não é condição para o serviço. Pedidos de acesso, correção e exclusão podem ser feitos pelo contato publicado no site, depois da definição do canal operacional.</p>
      </article>
    </PageShell>
  );
}
