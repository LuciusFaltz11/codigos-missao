# Códigos da Missão

Plataforma de leitura simbólica do mapa natal com os 36 Códigos da Missão de Val Wilges.

O Caelus calcula as posições. O código de cada ponto vem só do signo e do grau. A inteligência artificial interpreta essa combinação com a casa; ela não calcula o céu e não escolhe o arquétipo. Sem pagamento confirmado pela InfinitePay, o resultado completo não sai do servidor.

A especificação, o catálogo e os prompts estão em `docs/product/`. As decisões ainda abertas estão em `docs/decisoes-pendentes.md`.

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, Supabase (Postgres, Auth e Storage), InfinitePay Checkout Integrado, adaptadores para e-mail (Resend), LLM e um worker astronômico opcional.

Node 22 ou superior.

## Começar

```bash
nvm use
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`. Sem as chaves do `.env.example`, as telas explicam o que falta.

```bash
npm run lint
npm run typecheck
npm test
```

Migrations, seed, admin inicial, cron e o checklist de produção estão em `docs/deployment/README.md`. O motor astronômico está em `docs/deployment/astronomia.md`.

## O que já funciona sem credencial

- Landing, metodologia, perguntas e minutas legais.
- Formulário em passos, com validação.
- Cálculo astral com Caelus e classificação determinística dos 36 códigos, testada nas fronteiras de decanato.
- Resolução de horário local ambíguo e inexistente a partir de um fuso IANA.
- Admin com estado vazio, sem métrica inventada.
- Checkout, webhook, leitura, PDF e e-mail implementados e inativos até as chaves existirem.

## O que depende de configuração

- Geocodificação Geoapify (`GEOCODING_PROVIDER=geoapify` e `GEOCODING_API_KEY`).
- Supabase para gravar lead, mapa, pedido e papel administrativo.
- Worker do Swiss Ephemeris, se o Caelus for substituído e a licença profissional estiver confirmada.
- InfinitePay Checkout Integrado (`INFINITEPAY_HANDLE` e `INFINITEPAY_API_KEY`).
- Provedor de LLM e Resend.
- Publicação editorial da metodologia, do glossário e do preço.

Os PDFs de referência da autora não estavam no pacote. Se forem autorizados, o lugar deles é `docs/references/`.
