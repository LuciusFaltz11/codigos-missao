# PROMPT MESTRE PARA CURSOR — CÓDIGOS DA MISSÃO

> Copie todo o conteúdo deste arquivo no Cursor (idealmente no modo Agent). Antes, copie `01_especificacao_completa.md`, `03_catalogo_36_codigos.json`, `04_guia_visual.md`, `05_prompt_ia.md`, `06_base_conhecimento_astrologico.json` e `07_decisoes_e_validacoes.md` para `docs/product/` do repositório. Se disponíveis, copie também os três PDFs de referência para `docs/references/`. O catálogo JSON é obrigatório para o seed; **não dependa do agente extrair novamente o conteúdo do PDF**.

---

Você é o engenheiro de software principal e arquiteto responsável por construir a primeira versão comercial da plataforma **Códigos da Missão**, um produto de leitura de mapa astral tradicional cruzado com 36 arquétipos femininos autorais da metodologia de Val Wilges.

## Sua missão

Criar uma aplicação **real, funcional, testável e pronta para evoluir**, usando:
- Next.js App Router + TypeScript;
- Tailwind CSS + shadcn/ui;
- Vercel como destino de deploy;
- Supabase PostgreSQL + Supabase Auth + Supabase Storage;
- Mercado Pago **Checkout Pro** (checkout hospedado, Pix e cartão de crédito habilitados pelo provedor);
- motor astronômico integrado por adaptador específico e validado;
- provedor LLM configurável para leitura astrológica em duas etapas;
- geração de relatório PDF e e-mail transacional;
- área pública, resultado gratuito, paywall real e admin com RBAC.

Leia **inteiramente** os sete documentos numerados em `docs/product/` e os PDFs de referência (se presentes). Eles são a fonte de verdade do projeto, inclusive textos e design. Não substitua conteúdos autorais por texto genérico gerado por IA.

## Regras inegociáveis

1. **NÃO INVENTE POSIÇÕES ASTRAIS.** O cálculo natal deve usar efemérides reais, geolocalização, fuso histórico, hora de nascimento, sistema de casas e parâmetros explicitamente configurados. Se não houver biblioteca válida/licença confirmada, crie uma interface + um adaptador com estado `not_configured`, documentação de setup e testes com fixtures somente em ambiente de teste; **jamais** apresente uma posição falsa em produção.
2. **NÃO USE LLM PARA ATRIBUIR OS CÓDIGOS.** Código é determinado exclusivamente por `(signo, grau no signo)` e faixas de decanato: `[0,10)`, `[10,20)`, `[20,30)`.
3. A IA **interpreta**, mas não recalcula dados. Entradas são estruturadas, auditáveis e versionadas: `Código/arquétipo/palavra-chave/luz/sombra + Planeta ou Ponto + Casa`, com textos-base de astrologia aprovados. A IA não deve afirmar acontecimentos reais, diagnósticos, certezas sobre a pessoa ou destino fixo.
4. **Preserve integralmente os 36 registros do JSON oficial**. Os valores `null` indicam que o PDF não informou óleo/Tarô; não preencha por aproximação. Não usar palavra-chave como ID, pois há duplicatas. Preserve regente do decanato separado do planeta natal ativador.
5. Cada uma das 14 posições explicitamente selecionadas (Sol, Lua, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno, Plutão, Quíron, Roda da Fortuna, Nodo Sul, Nodo Norte) deve gerar registro de ativação `ponto + código + casa + signo + grau`, quando o mapa for válido. O **Ascendente deve ser calculado**, mas sua ativação deve ser flag configurável (`false` por default provisório até decisão da especialista).
6. **NÃO CONFIRME PAGAMENTO PELO FRONTEND.** Usar assinatura do webhook Mercado Pago, checar o recurso na API do provedor, deduplicar eventos e confirmar relação com pedido. Só liberar entitlement se pagamento realmente aprovado.
7. **NÃO COLOQUE RESULTADO PAGO EM JSON PÚBLICO**, SSR do guest, payload do HTML, localStorage nem apenas `display:none`. Resultado premium sempre protegido por autorização server-side e storage privado.
8. Guardar versões de parâmetros do mapa, 36 códigos, metodologia, textos, prompts, modelo LLM, resultado interpretativo e PDF gerado. Mudanças editoriais não devem mutar PDFs antigos.
9. Padrão visual premium, místico e minimalista. Inspirar-se na clareza Apple/Airbnb sem copiar layouts/logos. As imagens das cartas devem ser o grande destaque; restante da UI precisa ser clean.
10. Aplicar boas práticas de segurança/LGPD, acessibilidade, responsividade, tratamento de erros, testes e logging minimizado desde o início.

## Decisões provisórias: explícitas e fáceis de alterar

- Zodíaco tropical; casas Placidus. **Não apresentar como decisão validada:** habilitar configuração admin/versionamento e colocar aviso em `docs/decisoes-pendentes.md`.
- Missão gratuita: ativação do Sol (uma apenas); permitir trocar por configuração de negócio no admin sem deploy.
- Cliente não precisa de conta no MVP; acesso via token seguro não enumerável e protegido por regras de posse. Uso de login por e-mail/magic link é opcional futura etapa.
- Idioma inicial pt-BR; moeda BRL; um produto digital com preço configurável.
- Serviço de e-mail: começar por Resend, mas isolar no adaptador `EmailProvider`.
- Serviço LLM: começar com `InterpretationProvider` e implementação por API definida por env; isolar modelo para permitir troca e controlar custos.
- Visual: usar tokens propostos em `04_guia_visual.md`; imagens reais estarão em `/public/cards/` ou bucket administrável quando fornecidas. Sem assets, usar placeholders elegantes, nunca desenhos falsamente atribuídos à autora.

## Sequência de execução obrigatória

Trabalhe em **fases curtas** e implementáveis. Ao terminar cada fase, rode instalação, lint, TS e testes pertinentes; reporte o que funciona, o que precisa de credencial e o que ainda não foi implementado. Não diga “pronto” se foi entregue só scaffold. Se o ambiente não fornecer chaves, implemente a integração plenamente com variáveis de ambiente e estado de setup claro. Não invoque APIs reais sem credenciais.

### Fase A — Bootstrap e design system

1. Inspecionar repositório existente e não apagar código não relacionado. Se vazio, iniciar projeto Next.js + TypeScript + Tailwind, com pacote de UI e diretórios organizados.
2. Instalar dependências estáveis, compatíveis e justificadas. Consultar APIs oficiais vigentes; não supor que SDK antigo ainda funciona.
3. Criar sistema visual e layout geral (tipografia, tokens, container, modo mobile, botões, inputs, cards, toast, modal, breadcrumbs, tabela). Evitar efeitos excessivos; garantir contraste AA.
4. Criar landing `/`, formulário `/mapa`, resultado gratuito visual `/mapa/resultado/[token]`, retorno de pagamento e layout do `/admin` com dados de demonstração claramente **visuais**, sem inventar cálculos.
5. Criar README, `.env.example`, scripts npm e pasta `docs/`.

### Fase B — Supabase e modelo de dados

1. Criar migrations SQL em `supabase/migrations/` para domínio: admins e roles, leads, consentimentos, birth records, natal charts, glossários de casas/signos/planetas, mission codes, code versions, methodology configs, activations, readings, products, orders, payments, entitlements, payment events, reports, email deliveries, jobs, audit logs, analytics events.
2. Tipar client/server Supabase; serviço privilegiado **somente** no servidor. RLS para tudo exposto ao cliente; consultar DB privado via operações server-side estritamente autorizadas.
3. Seed de `03_catalogo_36_codigos.json` com todos os 36. Confirmar chave única `(signo_slug, decanato)`, nenhuma faixa faltante, regentes e campos de texto, 9 fichas de fogo com óleo/Tarô ausentes no PDF.
4. Versionamento: rascunho/publicação da metodologia e do conteúdo; não editar publicação imutável. Registro de auditoria para alterações.
5. Supabase Auth com `super_admin` e fluxo de convite/criação restrito ao superadmin; RBAC verificável no servidor. Evitar armazenar role apenas em dados mutáveis pelo cliente.

### Fase C — Dados natais, efemérides e missão

1. Criar formulário em wizard acessível (nome/e-mail → data/hora → cidade → consentimentos → gerar).
2. Implementar geocodificação por `GeoProvider` e timezone IANA histórico. Nunca tratar somente GMT atual; tratar horários de verão históricos e horários ambíguos, normalização por ISO e timezone.
3. Criar interface `AstronomyProvider.calculateNatalChart(input, config)` com retorno tipado de posições, cúspides, Ascendente/MC e dados de auditoria. Definir opção de cálculo para Fortuna e nodo; documentar escolhas pendentes.
4. Avaliar biblioteca Swiss Ephemeris e licença profissional vs AGPL **antes** de incluir bundle em produto fechado; avaliar suporte de módulos nativos na Vercel Node runtime. Não usar em Edge sem compatibilidade. Se necessário, isolar worker Node de cálculo separado.
5. Criar `MissionActivationService` determinístico: posição → signo (0..11) → grau fracionário `[0,30)` → decanato `[1,2,3]` → registro de código único. Não arredondar para derivar decanato.
6. Salvar ativação por planeta/ponto, incluir referência da casa, signo, grau e versão de metodologia, bem como contagem/repetições por código.
7. Admin simulador com trilha de cálculo; exportar JSON explicativo para depuração.
8. Tests de fronteira `0°,9.9999°,10°,19.9999°,20°,29.9999°`, mudança do signo em longitude múltipla de 30°, longitude 359.999→0 e cenários de fuso histórico.

### Fase D — Resultado gratuito e admin editorial

1. Gerar prévia gratuita baseada no ponto indicado em config (Sol por default), mostrando signo, casa, nome da carta, palavra-chave, luz/sombra com limites editoriais.
2. Nunca retornar o conteúdo pago até confirmação da compra.
3. CRUD dos 36 códigos com arte, arquétipo, regente e conteúdo; CRUD dos textos de 12 casas, 14 pontos e signos. Importar `06_base_conhecimento_astrologico.json` como rascunho editorial, manter o glossário dos signos pendente e requerer revisão humana antes de publicar.
4. Tela do admin: `/admin`, `/admin/codigos`, `/admin/codigos/[id]`, `/admin/astrologia`, `/admin/metodologia`, `/admin/simulador`, `/admin/leads`, `/admin/mapas`, `/admin/pedidos`, `/admin/relatorios`, `/admin/usuarios`, `/admin/auditoria`, `/admin/configuracoes`.
5. Apenas editor/admin autorizado muda conteúdo; apenas superadmin publica metodologia ou convida usuários, conforme matriz documentada.

### Fase E — Mercado Pago (venda real)

1. Usar o SDK oficial de Mercado Pago **vigente** em Node.js ou a API REST documentada para criar preferência Checkout Pro.
2. Gerar `external_reference` único do pedido; valor e produto vêm sempre do backend, nunca do valor enviado pelo browser. Utilizar URLs de sucesso/pendente/falha e `notification_url` quando aplicável.
3. Endpoint `/api/webhooks/mercadopago`: ler headers corretos (`x-signature`, `x-request-id`) e `data.id`, validar usando SDK oficial e secret; guardar evento sem repetir, consultar API do MP para status real, validar referência/valor/moeda, efetuar transições idempotentes e enfileirar processamento pago.
4. O MP pode enviar eventos duplicados e fora de ordem: usar transação e constraints no banco, não criar relatórios adicionais por retry.
5. Fluxo Pix e cartão é do **Checkout Pro**, sujeito às configurações reais do provedor; nunca apresentar campos caseiros de cartão como se fossem checkout oficial.
6. Ambiente de teste com credenciais sandbox; fixtures e mocks isolados. Não cobrar dinheiro real durante testes automatizados.

### Fase F — Interpretação com IA, síntese, PDF e e-mail

1. Implementar `InterpretationContextBuilder` que agrega dados da carta + código + significados do planeta e casa. Excluir nome/e-mail e PII desnecessária antes de chamar o modelo.
2. Pré-computar padrões objetivos: mesmo código em múltiplos pontos; casas com múltiplas ativações; elementos/temas destacados apenas quando deriváveis. Manter relação `pattern -> activation_ids`.
3. Criar `InterpretationProvider` tipado. Usar prompt de `05_prompt_ia.md` e schema validado com Zod ou equivalente. Duas passagens: (i) leitura de cada ativação; (ii) síntese global baseada nas leituras e nos padrões, sem repetir descrições genéricas.
4. Conteúdo profundo, humanizado, coerente; não atribuir diagnóstico ou acontecimento, não reproduzir literalmente blocos extensos do glossário, não prometer cura, prosperidade ou destino.
5. Salvar resultado estruturado, custo/uso de tokens se disponível, versão do prompt/modelo e snapshot editorial.
6. Gerar PDF a partir de template HTML/React ou biblioteca adequada com layout editorial premium, ilustrações licenciadas, quebras limpas, boas margens, fonte licenciada e conteúdo reproduzível.
7. Armazenar PDF em bucket privado; gerar link assinado temporário. Serviço de e-mail transacional com envio contendo acesso seguro; anexo opcional se tamanho couber.
8. Jobs reentrantes/idempotentes com estados separados e retries. Falha da IA ou e-mail não pode fazer o usuário perder direito de acesso.

### Fase G — Operação, testes e deploy

1. Analytics mínimos do funil: visitas, início e término do formulário, prévia, checkout, pagamentos, relatório entregue, perdas e exceções.
2. Admin dashboard por período: leads, checkout, compras, faturamento, conversões e falhas. Nunca apresentar métrica inventada: mostrar `—` ou estado vazio quando não houver dado.
3. SEO técnico na landing, sitemap/robots, OG, metadados e páginas legais com placeholders aprováveis pela equipe jurídica.
4. Testes unitários, de integração e E2E (Playwright ou equivalente): formulário, cálculo determinístico, auth/RBAC, paywall, webhook repetido/sem assinatura, geração assíncrona, relatório privado e responsividade.
5. Healthchecks/observabilidade sem PII, gestão de envs, backup, rollback e checklist de Vercel/Supabase/MP.
6. README de `npm install`, migrations, seed, `.env`, teste local, staging e produção; listar claramente integrações pendentes de credenciais e decisões editoriais.

## Design de domínio sugerido

```ts
// Exemplo de contrato, não copiar cegamente sem ajustar tipos e runtime
interface MissionCode {
  id: string; // "aries-1" etc.
  signSlug: string;
  decan: 1 | 2 | 3;
  startDegreeInclusive: number;
  endDegreeExclusive: number;
  archetype: string;
  keyword: string;
  decanRuler: string;
  light: string;
  shadow: string;
  essentialOil: string | null;
  tarotMirrorCard: string | null;
  imageUrl: string | null;
}

interface MissionActivation {
  natalPointId: string;
  signSlug: string;
  degreeWithinSign: number;
  houseNumber: number;
  missionCodeId: string;
  methodologyVersion: string;
}

interface InterpretationEvidence {
  activationIds: string[];
  codeIds: string[];
}
```

`methodologyVersion` deve identificar conjunto publicado e não ficar atrelado ao update in-place de código. O PDF usa decanato como posição por signo; a função de ativação é determinística e testável sem LLM.

## Estrutura de pastas recomendada

```text
src/
  app/
    (public)/
    (customer)/
    admin/
    api/webhooks/mercadopago/
  components/
    ui/ birth-form/ mission-cards/ chart/ admin/
  features/
    astrology/ missions/ interpretation/ checkout/ reports/ leads/
  server/
    auth/ db/ services/ providers/ jobs/ security/
  lib/
    schemas/ types/ formatters/ constants/
supabase/
  migrations/ seed/
public/
  cards/ brand/
docs/
  product/ references/ decisions/ deployment/
tests/
  unit/ integration/ e2e/
```

## Variáveis de ambiente — placeholders (não inventar secrets)

```dotenv
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
MERCADO_PAGO_ENV=sandbox
RESEND_API_KEY=
EMAIL_FROM=
LLM_PROVIDER=
LLM_API_KEY=
LLM_MODEL=
ASTROLOGY_ENGINE=
GEOCODING_API_KEY=
```

Criar `.env.example` sem valores reais e documentar variáveis que não forem usadas por determinado provider. Não expor `SERVICE_ROLE`, `ACCESS_TOKEN` ou `LLM_API_KEY` como `NEXT_PUBLIC_`.

## Forma de trabalhar e definição de pronto

- Comece lendo arquivos existentes e escrevendo um plano curto por fase, mas avance com implementação sem criar blocos de perguntas sobre dados já fornecidos.
- Quando dependência legal, licença ou credencial faltar, implemente o restante e identifique o bloqueio de forma explícita. Não apresente mocks como cálculos reais ou transações aprovadas.
- Em cada fase, entregue: arquivos alterados, decisões tomadas, migração/testes executados, pendências e próximos passos.
- Ao final, a aplicação precisa permitir o ciclo completo **sob credenciais reais configuradas**, com cálculo verificável, 36 códigos preservados, compra segura, análise com IA, relatório e dashboard.
- Caso o ambiente de Cursor seja limitado, priorize concluir completamente Fase A → B → C e depois D → E → F → G. Não pare no layout se o usuário pediu plataforma completa.

## Primeira ação agora

Leia os sete documentos numerados em `docs/product/`, valide o seed de 36 códigos e inspecione o repositório. Em seguida, implemente a **Fase A** com Next.js/Tailwind/componentes e apresente resultados verificáveis. Não preencha resultados astrológicos com dados fictícios em telas de produção.
