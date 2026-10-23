# Códigos da Missão — Especificação de produto e arquitetura (v0.4)

**Status:** base de desenvolvimento, com decisões pendentes explicitadas.  
**Origem:** histórico de alinhamento do produto, PDFs “Casas Astrológicas”, “Resumo planetas, kiron, nodos e roda da fortuna” e “Cópia de Val Wilges.pdf”.  
**Produto:** plataforma de autoconhecimento astrológico dirigida principalmente a mulheres, baseada nos 36 Códigos da Missão de Val Wilges.  
**Abordagem:** astrologia simbólica e interpretação reflexiva; não apresentar resultados como diagnóstico, profecia ou destino obrigatório.

## 1. Resumo executivo

A cliente fornece seus dados de nascimento, recebe o cálculo natal tradicional, descobre códigos associados às posições astrológicas, acessa uma amostra gratuita e pode adquirir a leitura integrada. Após compra via **Mercado Pago Checkout Pro** (Pix/cartão), recebe o resultado completo em tela e um **PDF privado por e-mail**. A administradora mantém o catálogo autoral de 36 códigos, textos-base sobre casas/planetas, regras, conteúdo editorial, visual, vendas e métricas. Uma IA cria a interpretação a partir do resultado calculado e de uma base editorial controlada; ela **não calcula posições astrais nem escolhe arbitrariamente o código**.

**Fluxo:** landing → formulário → cálculo natal → ativação determinística → prévia gratuita → checkout Mercado Pago → pagamento aprovado por webhook → interpretação integrada pela IA → PDF → e-mail.

## 2. Stack e serviços

- Next.js (App Router) e TypeScript: frontend, rotas do servidor, painel admin e endpoints.
- Tailwind CSS, shadcn/ui e componentes acessíveis: apresentação, formulários e dashboard.
- Vercel: hospedagem da aplicação.
- Supabase PostgreSQL: dados do domínio, catálogo, pedidos, registros de processamento e logs.
- Supabase Auth: login administrativo, superadmin criando/gerindo administradores. No MVP, **cliente sem cadastro/senha obrigatórios**.
- Supabase Storage: artes, anexos e PDFs em buckets privados; downloads por URL assinada de curto prazo.
- Mercado Pago Checkout Pro: checkout hospedado; Pix e cartão conforme opções habilitadas para a conta.
- Serviço de e-mail transacional: Resend ou equivalente, a definir/configurar.
- Serviço de IA: integração server-side parametrizável, provedor/modelo a definir. Usar saídas estruturadas e versionamento de prompts.
- Motor de efemérides: biblioteca/provider astro com cálculos verificáveis. A adoção de Swiss Ephemeris requer resolver **licença comercial vs. AGPL** e compatibilidade de runtime com a Vercel antes de ativação pública.
- Processamento durável: fila/outbox com retentativas e idempotência para análises, PDFs e e-mails.

## 3. Regras ASTRAIS e 36 códigos — o que está confirmado

### 3.1 Estrutura dos códigos

O PDF autoral contém **36 arquétipos: 3 decanatos × 12 signos**; os graus em cada signo dividem-se em faixas:

- Decanato 1: `0° <= grau < 10°`.
- Decanato 2: `10° <= grau < 20°`.
- Decanato 3: `20° <= grau < 30°`.

Essa regra deve ser calculada usando o grau REAL do ponto dentro do signo, sem arredondar para decidir a faixa. Cada combinação signo+decanato identifica exatamente um código. Cada ficha tem **arquétipo feminino**, **palavra-chave (ação)**, **regente do decanato**, **expressão de luz**, **expressão de sombra** e, quando informado, **óleo essencial** e **carta de Tarô Espelho**.

**Importante:** `regente_do_decanato` é uma propriedade do código e não deve ser confundida com o planeta/ponto natal que está ativando esse código. Palavras-chave **se repetem** em códigos distintos; não utilizá-las como chave primária. O catálogo de referência integral está no arquivo `03_catalogo_36_codigos.json`, transcrito das páginas 13–48 do PDF. Os resumos base das casas e dos pontos para publicação editorial estão em `06_base_conhecimento_astrologico.json` (**rascunho, exige revisão e aprovação**). Os dados opcionais não informados no PDF foram preservados como `null` — nunca inventar valores.

### 3.2 Objetos natais usados na ativação

O escopo fornecido contempla 14 posições:

**Sol, Lua, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno, Plutão, Quíron, Roda da Fortuna, Nodo Sul e Nodo Norte.**

Para cada ponto, registrar longitude eclíptica, signo, grau dentro do signo, minuto/segundo quando relevante, número da casa (1–12) e estado retrógrado se aplicável. Calcular também Ascendente, Meio do Céu e cúspides por serem necessários para cartas/casas e para a Roda da Fortuna, mas **a ativação pelo Ascendente permanece uma decisão aberta**: o material autoral recomenda começar Sol/Lua/Ascendente/Nodo Norte, enquanto a lista posterior descreve especificamente os 14 pontos, sem Ascendente.

Não há garantia de 36 códigos **diferentes** ativados por cliente. O processo gera uma **ativação por ponto selecionado**; o mesmo código pode aparecer repetido para pontos diferentes. A tela deve diferenciar “36 códigos existentes no catálogo” de “códigos efetivamente presentes no seu mapa”.

### 3.3 Regras ainda não formalizadas

- Zodíaco **tropical** (default proposto) versus sideral; **Placidus** (default proposto) versus Whole Sign/outro. Devem ficar como configurações explícitas e versionadas, não decisões ocultas no código.
- Fórmula da Roda da Fortuna para mapas diurnos/noturnos; verdadeiro/médio Nodo; definição de Quíron e efemérides. Precisam ser homologadas pela especialista.
- Critério do código gratuito: **proposta inicial é Sol**, por ser objetivo e coerente com o funil. O Admin deve permitir configurar o ponto gratuito sem atualizar código.
- O Ascendente ativa código próprio? Proposta do MVP: calcular/exibir, mas não incluí-lo nas 14 ativações até aprovação.
- Conteúdo dos 12 signos como glossário autônomo (os PDFs cobrem signos no contexto dos decanatos, mas não fornecem um glossário completo separado).
- Uso de aspectos planetários, pesos, hierarquias e critérios de predominância. **Não inferir uma pontuação proprietária inexistente.**

## 4. Como a IA interpreta

**Entrada confiável estruturada** (`interpretation_context`), construída no servidor a partir dos dados calculados e conteúdos aprovados:

1. Perfil anônimo/pseudonimizado e elementos de carta relevantes, sem nome/e-mail/data completa desnecessários.
2. Para cada ativação: ID do ponto, signo, grau, casa, ID do código, arquétipo, palavra-chave, luz/sombra, regente do decanato e textos-base aprovados do planeta e da casa.
3. Lista de **padrões calculados por regras determinísticas**, como códigos repetidos, casas com múltiplas ativações, temas recorrentes ou pares Nodo Sul/Norte. A IA pode sugerir relações interpretativas, mas deve indicar quais ativações as sustentam.
4. Instruções editoriais: texto acolhedor e autoral; leitura simbólica, não determinista; integrar luz/sombra sem julgamento; linguagem feminina conforme público; não atribuir diagnósticos, fatos íntimos, traumas concretos ou certezas sobre a vida pessoal.

**Saída validada (estrutura lógica):** `individual_readings[]` (activation_id, headline, interpretation, light_expression, shadow_expression, reflective_question), `patterns[]` (theme, activation_ids, insight), `overall_synthesis` (narrativa), `closing_reflection` e `sources/versions` no metadata interno. Só exibir descrições que tenham relação demonstrável com alguma ativação. É proibido inventar código, signo, casa ou posição; a IA recebe os cálculos prontos.

O material autoral explicitamente afirma que os símbolos não são inerentemente positivos ou negativos, luz/sombra descrevem modos de manifestação e nenhum código determina o destino. Essa diretriz deverá reger copy, geração por IA e avisos legais.

**Qualidade:** salvar versão de modelo, prompt, catálogo e cálculo; validar JSON; aplicar restrições; testes automatizados contra citações astrológicas inexistentes; reprocessamento controlado pelo admin; opção de aprovação editorial amostral antes do lançamento. Conteúdo produzido por IA poderá variar conforme modelo e prompt, mas um PDF entregue permanecerá como snapshot imutável.

## 5. Jornada pública — MVP

### `/` — Landing page

Hero editorial com CTA “Descubra seus Códigos da Missão”; apresentação curta do método e da criadora, seção como funciona, exemplos de cartas (com uso autorizado), benefícios, perguntas frequentes, disclaimers e CTA persistente em mobile. Prevenir tom de promessa de cura, destino ou resultado financeiro.

### `/mapa` — Formulário

Nome, e-mail, data de nascimento, hora exata, cidade/país com autocomplete geográfico; cidade convertida em latitude/longitude e fuso IANA históricos. Capturar origem UTM. Validar datas, horas, geocodificação e consentimentos. Separar aceite de privacidade/termos de opt-in opcional de marketing. Por padrão, exigir hora exata porque casas e Roda da Fortuna dependem dela; oferecer orientação a quem não conhece o horário, sem inventar dados.

### `/mapa/resultado/[token]` — Prévia gratuita

Resumo astral não sensível, mensagem personalizada, uma ativação gratuita completa ou resumida conforme regra editorial, prévia visual dos demais arquétipos, proposta de valor do relatório e CTA de compra. O `token` não deve permitir enumeração nem expor registros de terceiros. **Não enviar conteúdo pago oculto no HTML ou JSON público.** Se gerar IA para prévia, controlar custo; opção editorial estática inicial.

### `/checkout/[id]` — Compra

Apresentar o produto, valor configurado, o que inclui, indicação de pagamento seguro. Criar pedido `pending`, gerar preferência no Mercado Pago no backend usando `external_reference` e idempotência. Redirecionar a URL oficial do Checkout Pro; não coletar dados do cartão no Next.js.

### `/pagamento/retorno` — Retorno visual

Informar “Estamos confirmando seu pagamento”, “Aprovado”, “Pendente” ou “Não aprovado”. O retorno **não libera o conteúdo**. O webhook assinado e a consulta ao recurso de pagamento no Mercado Pago determinam o estado confirmado.

### `/mapa/completo/[token]` — Resultado pago

Liberar somente se houver entitlement/pedido pago associado; exibir leituras por ativação e síntese integrada; botão de download com URL assinada e botão “Reenviar e-mail” com limite e autenticação de posse.

### E-mail / PDF

Relatório bonito com capa, dados natais, mapa visual, explicação da metodologia, ativações, padrões, síntese e nota sobre caráter simbólico. Disponibilizar link privado (e anexo somente se apropriado ao tamanho/limite do serviço). A geração e o envio devem ser idempotentes e possuir retentativas rastreáveis.

## 6. Área administrativa — MVP

Autenticação com Supabase Auth, controle de acesso servidor + RLS. Perfis `super_admin`, `admin`, `editor`, `support`; apenas `super_admin` cria usuários e altera permissões.

- **Dashboard:** visitas, início/conclusão de formulário, leads, geração gratuita, checkouts iniciados, pagamentos aprovados, receita, taxa de conversão, falhas de cálculo/IA/PDF/e-mail (respeitando consentimento e configuração de analytics).
- **Códigos:** CRUD dos 36 arquétipos, três por signo, decanato, regente, palavra-chave, luz, sombra, arte e campos opcionais óleo/Tarô. Únicos por signo+decanato; não permitir publicar coleção com gaps ou intervalos sobrepostos.
- **Conhecimento astrológico:** CRUD versionado das 12 casas, 14 pontos/planetas e glossário de signos. Importação editorial dos dois PDFs-base, com revisão humana antes de publicar.
- **Configuração de metodologia:** catálogo publicado, sistema de casas, zodíaco, fórmula de Roda da Fortuna, seleção de pontos para ativação, código gratuito, modelo/prompt da IA; mudanças publicadas em versões imutáveis com logs.
- **Simulador:** data/hora/local → posições, casas → ativações com trilha `ponto -> signo -> grau -> decanato -> código` → entrada da IA → resultado. Disponibilizar testes para limites de decanato.
- **Leads/mapas:** buscas, status, origem UTM, dados necessários para suporte e opções de exclusão. Aplicar minimização/masking e políticas de acesso.
- **Pedidos/pagamentos:** busca, referência Mercado Pago, estados, histórico de notificações, reembolsos identificados, erros e reprocessamentos seguros.
- **Relatórios/e-mails:** visualizar status, reprocessar falhas, reenviar, consultar storage privado.
- **CMS simples:** textos da landing, FAQs, banners, preço do produto, textos transacionais; agendamento/publicação opcionais.
- **Permissões/auditoria:** registro de quem criou, alterou, publicou regras e visualizou dados sensíveis.

## 7. Dados principais (visão de domínio)

- `admin_users` / `profiles` — administradores, roles e clientes facultativos.
- `leads` — nome, e-mail, origem, consentimentos e datas.
- `birth_records` — data/hora/local/fuso/coordenadas, com controle de acesso rigoroso.
- `natal_charts` — dados astrais estruturados, parâmetros, versão e hash do cálculo.
- `astrological_points`, `house_meanings`, `sign_meanings` — glossário editorial e versões.
- `mission_codes` — catálogo autoral importado; `mission_code_versions` seções publicadas.
- `mission_activations` — uma linha por ponto natal considerado, referência ao código, casa, signo e grau.
- `methodology_versions` / `interpretation_prompts` — regras e linguagem publicadas.
- `readings` — saídas IA, individual e global, modelo/prompt, status e custo/cotas se necessário.
- `products`, `orders`, `payments`, `payment_webhook_events`, `entitlements` — compra e direitos de acesso.
- `reports`, `email_deliveries`, `jobs` — geração e entrega, estados e idempotência.
- `consent_records`, `privacy_policy_versions`, `audit_logs`, `analytics_events` — governança e mensuração.

Preferir esquema relacional para entidades essenciais e JSONB tipado/versionado para snapshots do mapa e da saída da IA. Evitar dados pessoais em logs técnicos e prompts desnecessariamente.

## 8. Estados e recuperação de falhas

**Cálculo:** `pending -> calculating -> complete / failed`.  
**Pagamento:** `pending -> approved / rejected / cancelled / refunded` (estados externos mapeados, sem supor irreversibilidade).  
**Leitura:** `queued -> processing -> completed / retryable_failed / permanent_failed`.  
**PDF/e-mail:** estados separados, com registros de tentativa.

Eventos podem chegar duplicados ou fora de ordem. Webhook: validar `x-signature`, registrar/deduplicar, consultar estado no MP, verificar correspondência do pedido, processar transição sob trava/transação e responder prontamente. A aprovação libera entitlement uma única vez. Em reembolso, definir política de revogação/retensão antes de produção.

## 9. Privacidade e proteção

A solução trata dados pessoais como nome, e-mail, data/hora/local de nascimento e inferências geradas. Informar finalidades, bases legais aplicáveis, tempo de retenção, compartilhamento com fornecedores de IA/pagamento/e-mail, canal para exercício de direitos, e se há transferência internacional. A política precisa de revisão jurídica de acordo com a LGPD.

- Opt-in de marketing separado e desmarcado por padrão; não condicionar o serviço ao marketing.
- Minimize dados enviados ao modelo; nenhuma chave privada no browser.
- Storage privado, URLs assinadas de curta duração, RLS, rate limiting, anti-bot, auditoria.
- Admin com MFA recomendado, permissões mínimas e trilha de ações.
- Não expor mapa pago apenas escondendo CSS; verificar autorização em todo endpoint.
- Procedimento para download, correção, exclusão e revogação quando cabível.
- Disclaimer: experiência simbólica de autoconhecimento, não substitui cuidados médicos/psicológicos e não pode prometer diagnóstico ou resultados objetivos.

## 10. Design visual e UX

**Conceito:** “misticismo editorial premium”. Acessibilidade e clareza das interfaces de produto de alta qualidade combinadas com profundidade ilustrativa das cartas do PDF. Inspirar-se em princípios gerais de Apple/Airbnb (hierarquia, simplicidade, legibilidade, consistência), sem copiar interfaces ou identidades dessas marcas.

**Regra 80/20:** a UI do site e admin é majoritariamente limpa, clara, com espaço negativo e pouca decoração. Ilustrações detalhadas, dourado, estrelas e círculos zodiacais ficam concentrados em hero, cartas, detalhes de resultados e PDF. Não usar a tabela escura e densa do PDF como padrão de tabelas do admin.

**Paleta proposta:**

- `background: #F8F6F1` — marfim neutro;
- `surface: #FFFFFF` — cards claros;
- `text: #241D22` — texto primário;
- `muted: #706772` — texto de apoio;
- `wine: #482931` — vinho profundo;
- `gold: #B99B62` — dourado elegante, sobretudo decorativo (não usar como texto pequeno sobre branco);
- `border: #E7E2DA` — bordas leves;
- fogo `#B96A42`, terra `#687B59`, ar `#7283B1`, água `#4E8390` — cores temáticas dos signos e cards.

**Tipografia:** serif elegante para títulos e identidade; sans de alto contraste e boa legibilidade para formulários, UX e admin. Selecionar fontes públicas licenciadas; nunca usar fontes particulares das marcas de referência.

**Componentes:** header simples, wizard de nascimento, autocomplete acessível, calendário/data, CTA forte, estados de progresso, skeleton com feedback honesto, cartas ilustradas em grid responsivo, modo de leitura, accordion FAQ, checkout summary, cards de KPI e tabelas no admin.

**Mobile-first:** botões com área de toque confortável; formulários divididos em poucos passos; sem carrosséis confusos, contraste AA, navegação por teclado e respeito a `prefers-reduced-motion`.

**As 36 artes do PDF** podem guiar a identidade. Para produção, ideal obter arquivos originais em alta resolução/licenciados e disponibilizá-los em storage. Evitar extrair imagens de baixa resolução do PDF como assets finais; criar placeholder sem distorcer layout.

## 11. Backlog por fases

### Fase 0 — Bases, decisões e dados
1. Importar 36 códigos do JSON e revisá-los (inclusive campos repetidos/ausentes).
2. Validar licença do motor de efemérides e confirmar sistema de casas/zodíaco/fórmulas.
3. Consolidar textos das 12 casas e 14 pontos em formato editorial revisado.
4. Aprovar escopo da ativação pelo Ascendente e regra do resultado gratuito.
5. Autorizar artes, logotipo, identidade, documentos legais e contas de produção.

### Fase 1 — Produto básico
1. Next.js, Tailwind, Supabase, auth admin, migrations e RLS.
2. Landing + wizard de nascimento e geocodificação/fuso.
3. Cálculo astral testado + ativação determinística do catálogo.
4. Resultado gratuito e bloqueio real do conteúdo completo.
5. Admin mínimo: códigos, glossário, simulador e leads.

### Fase 2 — Venda e entrega
1. Produto/preço, checkout Mercado Pago, webhook assinado e entitlement.
2. Interpretação IA individual + síntese com revisão de segurança/qualidade.
3. PDF com branding e report snapshot; storage privado; e-mail.
4. Dashboard, painel de pedidos, retentativas, auditoria e suporte.

### Fase 3 — Consolidação
1. UX/polimento, testes E2E, SEO, analytics e funil.
2. Monitoramento de custos LLM e processamento.
3. Produção com backups, rollback, incidentes e documentação.

## 12. Critérios de aceite essenciais

- O catálogo possui exatamente 36 pares únicos `(signo, decanato)` e mantém os textos do PDF.
- Pontos em `9.999...`, `10.000...`, `19.999...` e `20.000...` são classificados corretamente sem arredondamentos indevidos.
- O resultado de cada ativação pode ser explicado `ponto -> posição -> casa -> código`.
- O código não é definido pela IA; a IA não inventa posições ou regras.
- PDF e resultado completo não podem ser acessados sem direito de acesso válido.
- Pagamento só aprova mediante confirmação segura do Mercado Pago.
- Webhook repetido não gera segunda venda, segunda análise custosa ou segundo PDF sem necessidade.
- Se a IA falhar, o sistema não perde o pedido aprovado e permite retentativa.
- O conteúdo gratuito gera interesse sem apresentar promessa de destino ou saúde.
- O admin consegue ajustar textos e publicar versões sem alterar mapas entregues anteriormente.
- Usuário consegue entender e exercer os direitos básicos sobre seus dados.
- Fluxo funciona bem em mobile, é acessível e tem loading/erro/vazio/êxito bem definidos.

## 13. Registro de decisões pendentes

| Tema | Proposta para o MVP | Status |
|---|---|---|
| Regra 36 códigos | 12 signos × 3 decanatos [0,10), [10,20), [20,30) | Confirmado por PDF |
| 14 pontos astrológicos | Todos os explicitamente informados | Confirmado |
| Ascendente ativar código | Não no MVP, apenas calcular/exibir | Precisa confirmar |
| Zodíaco | Tropical | Precisa confirmar |
| Casas | Placidus; fallback de latitudes altas a homologar | Precisa confirmar |
| Fortuna/Nodos | Fórmulas documentadas e aprovadas | Precisa confirmar |
| Missão grátis | Código ativado pelo Sol | Precisa confirmar |
| Checkout | Mercado Pago Checkout Pro, Pix e crédito | Confirmado |
| Conta cliente | Não obrigatória no MVP; link seguro | Proposta |
| Texto pago | IA baseada em fatos calculados e editorial versionado | Confirmado |
| IA/LLM provider | Adaptador configurável; fornecedor a definir | Pendente |
| Preço/cupom | Um produto e preço administráveis | Pendente |
| Arte das cartas | Originais em boa resolução sob autorização | Pendente |
| Política de retenção e RGPD/LGPD | Revisão jurídica/operacional | Pendente |

## 14. Documentos complementares de implementação

- `02_prompt_mestre_cursor.md`: prompt mestre por fases para o agente.
- `03_catalogo_36_codigos.json`: 36 códigos oficiais organizados por signo/decanato, com informações opcionais nulas quando não constam do PDF.
- `04_guia_visual.md`: identidade visual e telas.
- `05_prompt_ia.md`: geração individual e síntese global baseada em dados verificáveis.
- `06_base_conhecimento_astrologico.json`: conteúdo base dos significados das 12 casas e dos 14 pontos, em rascunho a aprovar.
- `07_decisoes_e_validacoes.md`: registro de pendências e checklist de homologação.

## 15. Fontes e notas de integridade

- `Cópia de Val Wilges.pdf`, páginas 3–5 (metodologia não determinista), 8–10 (como usar e pontos de entrada), 13–48 (36 fichas de código), 49–50 (criadora e posicionamento). 
- `Casas Astrológicas .pdf`, 28 páginas: referência conceitual dos significados das casas.
- `Resumo planetas, kiron, nodos e roda da fortuna.pdf`, 11 páginas: referência conceitual dos astros e pontos.
- Mercado Pago Checkout Pro: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/overview
- Mercado Pago Webhooks: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications
- Swiss Ephemeris licensing: https://www.astro.com/swisseph/

**Nota editorial:** a ficha “Xamà das profundezas” preserva a grafia encontrada no PDF; revisar se a autora deseja “Xamã”. A palavra-chave “Aperfeiçoar” aparece em dois códigos distintos de Virgem; “Harmonizar” e “Revelar” também aparecem em mais de um código. Não corrigir tais ocorrências automaticamente.
