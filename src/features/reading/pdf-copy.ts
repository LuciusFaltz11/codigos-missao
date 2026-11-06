import { pointLabel } from "@/lib/constants/astrology";
import type { MissionActivation } from "@/features/missions/activate";
import { joinPt, orderedActivations } from "@/features/reading/pdf-structure";

export const COVER_BRAND = "CÓDIGOS DA MISSÃO";
export const COVER_TAGLINE = "Uma jornada de autoconhecimento através dos seus arquétipos";
export const COVER_KICKER = "Sua leitura pessoal";
export const COVER_RIGHTS = "Direitos reservados. Códigos da Missão.";

export const COVER_WELCOME = [
  "Este é um convite para reconhecer as forças que habitam sua história, observar os caminhos pelos quais elas se expressam e descobrir o que pode emergir quando luz e sombra são acolhidas como partes de um mesmo processo de consciência.",
  "Cada Código abre uma possibilidade de olhar para si. O sentido mais profundo nasce do encontro entre eles, e daquilo que você reconhece nessa jornada.",
];

export const BEFORE_TITLE = "Um mapa, muitos caminhos de descoberta";

export const OVERVIEW_TITLE = "Os Códigos que se revelam no seu mapa";
export const OVERVIEW_TRANSITION =
  "Cada ponto abre uma perspectiva. É no encontro entre essas perspectivas que o seu mapa começa a revelar novas conexões.";

export const DECK_TITLE = "As expressões que atravessam o seu mapa";
export const SYNTHESIS_TITLE = "Quando os Códigos conversam entre si";

export const CARTOGRAPHY_CLOSING =
  "A cartografia simbólica deste mapa convida a um olhar atento sobre como as experiências de dor, valor próprio, criatividade e relação com o outro se entrelaçam, revelando campos de luz e sombra que coexistem e se alimentam mutuamente. O convite não é para buscar perfeição ou respostas definitivas, mas para observar, com delicadeza e coragem, como cada gesto, palavra e silêncio pode ser transformado em fonte de sentido e renovação. Permita-se habitar o espaço entre o que já foi vivido e o que ainda está por ser criado, reconhecendo que a verdadeira força reside na capacidade de integrar vulnerabilidade e potência, presença e transformação. O caminho se revela na atenção aos detalhes e na escuta profunda do próprio ritmo, pois é na dança entre o conhecido e o novo que a missão se desenrola, passo a passo, em direção à autenticidade.";

export const INSPIRATION_TITLE = "PARA INSPIRAR A SUA JORNADA";
export const INSPIRATION_INTRO = "Alguns lembretes para levar da leitura para a vida:";
export const INSPIRATION_NOTES = [
  "Não espere sua vida estar resolvida para começar a agir.",
  "O feito também é sagrado. Permita-se começar antes de tudo estar perfeito.",
  "Tudo é processo. Respeite o tempo de cada transformação.",
  "Onde existe dor, pode existir um convite à consciência e à transformação. Não é preciso romantizar o sofrimento para encontrar aprendizado.",
  "Seu mapa não determina quem você é. Ele revela caminhos para reconhecer potenciais, acolher sombras e relembrar sua essência.",
  "Não existe despertar sem coragem de olhar para dentro.",
  "Você não precisa se tornar outra pessoa para cumprir sua missão. Precisa, muitas vezes, lembrar quem sempre foi.",
];
export const INSPIRATION_IMPACT = "A MAIOR MISSÃO É RELEMBRAR QUEM SOMOS.";
export const INSPIRATION_INVITE =
  "Que esta leitura não seja uma definição sobre você, mas um convite para viver com mais consciência, verdade e liberdade.";
export const INSPIRATION_QUOTE = "Não há despertar da luz sem a coragem de enxergar a própria sombra.";
export const INSPIRATION_SIGNATURE = "Códigos da Missão — Val Wilges";
export const INSPIRATION_RIGHTS = "Direitos reservados.";

export function beforeStartingCopy(activations: readonly MissionActivation[]) {
  const ordered = orderedActivations(activations);
  const count = ordered.length;
  const list = joinPt(ordered.map((item) => pointLabel(item.natalPointId)));
  return [
    "Os Códigos da Missão são um sistema autoral formado por 36 arquétipos, relacionados aos 12 signos zodiacais e aos seus três decanatos. Cada Código traz um verbo central e duas possibilidades simbólicas de expressão: a Luz, que revela sua potência, e a Sombra, que convida a reconhecer seus possíveis excessos ou limitações.",
    `No seu mapa astral, determinados pontos ativam esses Códigos. Nesta leitura, vamos percorrer ${count} ${count === 1 ? "ativação" : "ativações"}: ${list}.`,
    "Cada ativação oferece uma perspectiva diferente. O Sol fala simbolicamente da identidade; a Lua, da experiência emocional; o Ascendente, da maneira de entrar em contato com a vida. Os planetas, Quíron e os pontos matemáticos acrescentam outras dimensões à leitura, conforme suas funções simbólicas.",
    "O signo e o grau da posição identificam o Código ativado. A casa astrológica ajuda a compreender em qual campo da vida essa dinâmica pode encontrar expressão.",
    "Ao longo das páginas, você conhecerá cada ativação e poderá observar sua potência, suas tensões e suas possibilidades de consciência. Ao final, as leituras serão aproximadas para revelar conexões, recorrências e contrastes que talvez não fossem tão visíveis quando observados separadamente.",
    "Esta não é uma sentença sobre quem você é, nem uma previsão do que acontecerá. É uma leitura simbólica para ampliar perguntas, reconhecer possibilidades e construir uma relação mais consciente consigo mesma.",
  ];
}
