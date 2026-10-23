import { PageShell } from "@/components/site/chrome";

const faqs = [
  ["Preciso saber a hora do nascimento?", "Sim. Sem a hora, casas e Roda da Fortuna não são calculadas e o sistema não completa o horário."],
  ["A inteligência artificial escolhe meus códigos?", "Não. O código é o decanato do signo em que a posição caiu."],
  ["O que é gratuito?", "Uma ativação, com a proposta provisória de usar o Sol. O restante permanece no servidor."],
  ["O pagamento libera a leitura na volta do banco?", "Não. A liberação depende da confirmação da InfinitePay no servidor."],
  ["Isso prevê o que vai acontecer?", "Não. A leitura é simbólica e não descreve destino, saúde ou resultado financeiro."],
];

export const metadata = { title: "Perguntas frequentes" };

export default function FaqPage() {
  return (
    <PageShell>
      <div className="mx-auto grid max-w-3xl gap-4 px-4 py-12">
        <h1 className="font-display text-4xl">Perguntas frequentes</h1>
        {faqs.map(([question, answer]) => (
          <details key={question} className="rounded-2xl border border-border bg-surface p-4" open>
            <summary className="cursor-pointer font-semibold">{question}</summary>
            <p className="mt-2 text-muted">{answer}</p>
          </details>
        ))}
      </div>
    </PageShell>
  );
}
