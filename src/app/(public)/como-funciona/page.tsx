import { PageShell } from "@/components/site/chrome";

export const metadata = { title: "Como funciona" };

export default function HowPage() {
  return (
    <PageShell>
      <article className="mx-auto grid max-w-3xl gap-4 px-4 py-12 leading-8">
        <h1 className="font-display text-4xl">Como funciona</h1>
        <p>Você informa nome, e-mail, data, hora e uma cidade escolhida na busca. A cidade vira coordenada e fuso IANA no servidor. Horários ambíguos ou inexistentes por causa do horário de verão pedem uma decisão, em vez de serem ajustados em silêncio.</p>
        <p>O mapa só recebe posições de um motor de efemérides configurado e licenciado. Sem isso, a tela explica a pendência e não mostra graus fictícios.</p>
        <p>Cada posição válida vira signo, grau dentro do signo e decanato. O catálogo devolve um único código. A prévia mostra apenas o ponto gratuito configurado.</p>
        <p>A compra abre o checkout hospedado da InfinitePay. O retorno do navegador não libera a leitura. A liberação acontece quando o servidor consulta o pagamento na InfinitePay e confirma o valor.</p>
      </article>
    </PageShell>
  );
}
