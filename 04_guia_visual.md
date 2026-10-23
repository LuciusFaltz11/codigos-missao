# Guia visual e de experiência — Códigos da Missão (v1.0)

> Fonte de inspiração: **Cópia de Val Wilges.pdf**, especialmente capa (p. 1), apresentação (pp. 2–12), 36 cartas (pp. 13–48) e apresentação da autora (pp. 49–50). Trata-se de uma **direção de design sugerida**, não de uma identidade oficial já aprovada. A referência a Apple/Airbnb vale para qualidade de interface, não para reprodução visual de marcas.

## 1. Conceito de marca

**Misticismo editorial premium + clareza de um produto digital contemporâneo.** O universo narrativo contém fogo, terra, ar, água, constelações, signos, feminino arquetípico, símbolos sutis e dourado. A interface permite que essa arte respire: ela não deve competir com cada carta. Adotar a lógica de uma galeria de arte: paredes visualmente discretas, obras ricas e hierarquia evidente.

Princípios:
1. **Revelação sem ruído:** entrada curta, progressiva, linguagem humana e animação contida.
2. **Profundidade acessível:** interpretação densa em blocos escaneáveis, com expansão opcional.
3. **Identidade própria:** cartas são protagonistas; nunca enfeitar a tela com múltiplos zodiacais em cada canto.
4. **Acolhimento sem julgamento:** luz e sombra como potenciais interpretativos, não como defeitos/diagnósticos.
5. **Confiança e transparência:** esclarecer o que é grátis, o que é pago, a existência de IA e a natureza simbólica da leitura.

## 2. Paleta proposta para protótipo

| Token | Hex | Uso |
|---|---|---|
| `--background` | `#F8F6F1` | páginas públicas, tons marfim |
| `--surface` | `#FFFFFF` | formulários, blocos de texto, cards |
| `--ink` | `#241D22` | texto, ícones funcionais |
| `--muted` | `#706772` | texto secundário |
| `--border` | `#E7E2DA` | divisores e bordas finas |
| `--wine` | `#482931` | CTA premium, hero escuro, footer |
| `--wine-deep` | `#2B1924` | sobreposições/esquema escuro |
| `--gold` | `#B99B62` | detalhes, bordas de arte, ornamentos |
| `--gold-soft` | `#E8DCC6` | fundos de tags suaves |
| `--fire` | `#B96A42` | identidade de elemento fogo |
| `--earth` | `#687B59` | identidade de elemento terra |
| `--air` | `#7283B1` | identidade de elemento ar |
| `--water` | `#4E8390` | identidade de elemento água |

Não usar dourado como texto pequeno sobre branco. Garantir contraste WCAG AA em texto e controles. Estados de sucesso/erro não dependem exclusivamente de cor.

## 3. Tipografia, grid e acabamento

- **Títulos:** serif editorial (sugestões de famílias com licença aberta: Cormorant Garamond, Fraunces ou equivalente). Evitar ornamentação excessiva e texto com espaçamento ilegível.
- **Interface:** sans legível (Inter, Manrope ou equivalente) em formulários, tabelas, valores e dashboard.
- Escala sugerida: hero 48–68 desktop / 36–44 mobile; H1 interno 36/30; H2 28/24; texto 16–18; labels 14–16.
- Container máximo 1200–1280 px; largura ideal do texto explicativo 620–760 px; espaçamento em sistema 4/8 px; radios 10–16 px em cards, 16–24 px em painéis.
- Sombras suaves e fundos de superfície, sem glassmorphism indiscriminado. Microinterações entre 120–240 ms; honrar `prefers-reduced-motion`.

## 4. Telas prioritárias e composição

### Página inicial `/`
- Header: logotipo, “Como funciona”, “Sobre a metodologia”, “Perguntas frequentes”, CTA principal.
- Hero: fundo marfim ou vinho; frase editorial clara; 1–3 cartas em destaque com bastante espaço. CTA “Descobrir meus Códigos da Missão”.
- Seção “Como funciona” em 3 passos simples: dados de nascimento → leitura gratuita → aprofundamento.
- Seção autoral: apresentar a metodologia e a criadora apenas com afirmações fundamentadas nos materiais e aprovadas editorialmente.
- Amostra visual de arquétipos; **não afirmar que todas as 36 missões se ativam em uma mesma pessoa**.
- Benefícios, FAQ, footer com páginas legais e contato.

### Entrada `/mapa`
- Formulário em 3 passos: dados pessoais mínimos, nascimento/local e concordâncias.
- Autocomplete de cidade com confirmação do fuso histórico. Explicar por que a hora importa; não oferecer cálculo preciso de casas sem hora conhecida.
- Indicador de progresso discreto, validações claras, teclado acessível, foco previsível.

### Resultado gratuito `/mapa/resultado/[token]`
- Título intimista, pequeno resumo dos pontos principais e carta referente à ativação grátis (por padrão provisório Sol).
- Colocar a carta em primeiro plano; exibir arquétipo, código, signo/decanato, planeta/ponto e casa; texto integrado de amostra, não mera colagem de definições.
- Seção “Você pode aprofundar sua leitura” com visualização do que será entregue e CTA.
- Bloquear material pago **no servidor**, não só com desfoque em texto carregado no HTML.

### Compra e pós-pagamento
- Antes do redirecionamento: resumo do produto, preço real em BRL, transparência sobre entrega, Pix/cartão disponíveis conforme conta Mercado Pago.
- Checkout é do **Mercado Pago**; não construir falsa tela de cartão. No retorno: estados claro/pending/approved/failed e informação de entrega.

### Leitura paga `/mapa/completo/[token]`
- Navegação organizada por leitura individual, temas recorrentes e síntese geral.
- Ativações agrupáveis por ponto ou tema; separar as cartas diferentes dos **códigos repetidos**.
- Botão Download PDF e reenvio via mecanismo autenticado/restrito. Oferecer menu lateral de capítulos em desktop e sumário simples no mobile.

### Admin `/admin`
- Fundo neutro, sidebar leve, tabelas com filtro, paginação e ações evidentes.
- CRUD dos 36 códigos (signo, decanato, palavra-chave, arquétipo, luz, sombra, regente, campos extras, imagem).
- Painéis de leads, vendas, relatórios, logs, versão da metodologia, simulador de ativações e estado dos jobs.
- Evitar background com céu estrelado na área operacional.

## 5. Componentes de UI

`Header`, `Footer`, `Button`, `TextField`, `PlaceAutocomplete`, `BirthDateInput`, `BirthTimeInput`, `Stepper`, `ConsentCheckbox`, `StatusBanner`, `MissionCard`, `MissionActivation`, `ChartSummary`, `PatternSection`, `ReadingAccordion`, `PaywallSummary`, `PaymentStatus`, `DownloadReport`, `AdminDataTable`, `KpiCard`, `AuditTimeline`, `LoadingState`, `ErrorState`, `EmptyState`.

**MissionCard:** suportar imagem vertical 2:3 (ou proporção original do asset), símbolo zodiacal, nome do arquétipo, verbo-chave, chip opcional do elemento e expansão de luz/sombra. Card pode exibir informações variáveis sem quebrar layout; tooltip não pode conter informação indispensável.

## 6. Direção das ilustrações

- O PDF apresenta cartas femininas ornamentadas por signo com dourado e paletas elementais. Preservar essa diferença na UI.
- Obter **arquivos originais, com resolução e autorização de publicação**. As páginas do PDF são somente material de referência até liberação de assets definitivos.
- O JSON do catálogo contém `arte_imagem: null` por enquanto; na implementação, o campo pode ser preenchido pelo admin com asset da imagem correspondente.
- Nunca gerar ou trocar aleatoriamente as artes da metodologia nem atribuir ilustração artificial à autora como se fosse original.
- Imagens com `alt` útil; decorar como `aria-hidden` quando ornamento não carrega informação.

## 7. PDF pago

- Formato A4 com margens confortáveis, capa escura editorial e miolo com predominância de marfim/branco.
- Resumo natal + referência sobre natureza interpretativa + capítulos individuais + padrões e conexões + síntese + fechamento.
- Uma carta em destaque por bloco relevante, não uma página ornamentada para cada frase.
- Cabeçalho/rodapé sutis, número de página, controle de viúvas/órfãs e quebras.
- PDF com título e informações da cliente, data de geração e versão do método em metadados internos. Imagens licenciadas e acesso privado.

## 8. Critérios visuais de aceite

1. A landing continua elegante sem artes finais (placeholders explícitos).
2. As cartas são protagonistas, mas formulários e navegação são simples e funcionais.
3. Tipografia e contraste são legíveis no mobile de 320–390 px e em desktop amplo.
4. Botões de foco, mensagem de erro e labels acessíveis; sem hover como único canal de informação.
5. Tabelas administrativas funcionam com grandes volumes e não replicam tabelas densas do PDF.
6. Gráficos e KPIs usam números reais; estado vazio é tratado corretamente.
7. PDF de amostra passa por inspeção visual de todas as páginas, com fontes e imagens carregadas.

## 9. Referências internas

- Visual e posicionamento: `Cópia de Val Wilges.pdf` (p. 1, 4–5, 8–10, 13–48).
- Arquitetura e requisitos: `01_especificacao_completa.md`.
- Seed do catálogo: `03_catalogo_36_codigos.json`.
