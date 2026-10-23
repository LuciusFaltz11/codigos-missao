import { PageShell } from "@/components/site/chrome";
import { PROVISIONAL_ASTROLOGY_NOTICE } from "@/lib/constants/astrology";

export const metadata = { title: "Metodologia" };

export default function MethodologyPage() {
  return (
    <PageShell>
      <article className="mx-auto grid max-w-3xl gap-5 px-4 py-12 leading-8">
        <h1 className="font-display text-4xl">Sobre a metodologia</h1>
        <p>
          Os Códigos da Missão reúnem 36 arquétipos, três decanatos para cada um dos 12 signos. As faixas são [0°, 10°), [10°, 20°) e [20°, 30°). A palavra-chave pode se repetir; a identidade do código é o par signo e decanato.
        </p>
        <p>
          A plataforma associa cada posição natal selecionada a um código por essa regra. A inteligência artificial recebe o código, o ponto e a casa já calculados e escreve uma leitura. Ela não recalcula o mapa e não escolhe outro arquétipo.
        </p>
        <p>
          Luz e sombra são modos possíveis da mesma força. Nenhum símbolo é tratado como defeito, diagnóstico ou destino.
        </p>
        <p className="rounded-2xl bg-gold-soft px-4 py-3 text-sm">{PROVISIONAL_ASTROLOGY_NOTICE}</p>
        <p>
          O material autoral também menciona o Ascendente entre os pontos de entrada. Nesta versão ele é calculado e pode ser exibido, mas não ativa um código até a decisão da especialista. A fórmula da Roda da Fortuna e o modo do nodo lunar seguem a mesma lógica: ficam configuráveis e só entram no cálculo quando homologados.
        </p>
        <p>A apresentação biográfica da criadora depende do texto autorizado das páginas finais do material. Ela não é reescrita aqui.</p>
      </article>
    </PageShell>
  );
}
