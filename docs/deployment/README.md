# Deploy

## Local

Requer Node 22 (`nvm use`).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Sem chaves, a interface abre, o formulário explica o que falta e nenhum mapa, pagamento ou leitura é simulado como real.

```bash
npm run lint
npm run typecheck
npm test
```

O teste de ponta a ponta sobe o servidor e precisa do Chromium do Playwright:

```bash
npx playwright install chromium
npm run test:e2e
```

## Banco

Aplicar, nesta ordem, no SQL editor do Supabase ou com `psql "$SUPABASE_DB_URL"`:

1. `supabase/migrations/20261022000000_init.sql`
2. `supabase/migrations/20261022000001_storage.sql`

Depois:

```bash
npm run seed
ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run admin:create
```

O seed grava os 36 códigos, o glossário como rascunho e um produto sem preço. Não publica a metodologia.

## Variáveis

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_APP_URL` | URL pública, retornos e links de e-mail |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth do admin no browser e no servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Somente servidor. Também deriva a chave que sela o token de acesso |
| `SUPABASE_DB_URL` | Aplicar migrations com psql. O app não usa essa URL em runtime |
| `INFINITEPAY_HANDLE` | InfiniteTag da conta, sem o `$` inicial |
| `INFINITEPAY_API_KEY` | Chave do Checkout Integrado, somente no servidor. Aparece uma vez na criação, no app da InfinitePay |
| `RESEND_API_KEY` / `EMAIL_FROM` | Adaptador de e-mail |
| `LLM_PROVIDER` | `openai`, `anthropic` ou outro nome tratado como API compatível com OpenAI |
| `LLM_API_KEY` / `LLM_MODEL` / `LLM_API_BASE` | Modelo. `LLM_API_BASE` só é necessário fora da OpenAI |
| `ASTROLOGY_ENGINE` | `caelus` (padrão), `none` ou `swiss_worker` |
| `ASTROLOGY_LICENSE_CONFIRMED` | precisa ser `true` para chamar o worker do Swiss Ephemeris. O Caelus não usa essa chave |
| `GEOCODING_PROVIDER` | `geoapify`. `opencage` e `mapbox` continuam no código |
| `GEOCODING_API_KEY` | Chave da Geoapify, somente no servidor. No painel da Geoapify, não restrinja a chave só pelo domínio do site: a busca parte do servidor. O autocomplete chama `/api/geo/search` e recebe apenas o nome |
| `CRON_SECRET` | protege `GET/POST /api/jobs/run` |

Nenhuma chave de serviço, pagamento ou modelo usa prefixo `NEXT_PUBLIC_`.

## Vercel

- Runtime Node, não Edge, nas rotas de mapa, webhook, PDF e jobs.
- Cron em `vercel.json` chama `/api/jobs/run` a cada cinco minutos. A Vercel precisa enviar `Authorization: Bearer $CRON_SECRET`.
- Webhook da InfinitePay: `https://SEU_DOMINIO/api/webhooks/infinitepay`. Em localhost a URL de webhook não é enviada, porque o provedor não alcança a máquina.
- Habilite o Checkout Integrado no app da InfinitePay e confirme Pix e cartão. O app não desenha um checkout de cartão. A volta do navegador e o webhook não liberam a leitura sozinhos: o servidor consulta `payment_check`.

## Checklist antes de produção

- [ ] Conferir os 36 códigos, em especial a sombra de Escorpião 3 e a grafia Xamà, contra o PDF.
- [ ] Homologar zodíaco, casas, nodo, Fortuna e o ponto gratuito; só então marcar a metodologia como validada e publicar.
- [ ] Revisar e publicar os textos das 12 casas e dos 14 pontos. O glossário dos signos continua pendente de redação.
- [ ] Autorizar e enviar as artes para o admin. Os espaços vazios são placeholders, não ilustrações da autora.
- [ ] Definir o preço.
- [ ] Testar pagamento sandbox, webhook repetido, valor divergente e reembolso.
- [ ] Revisar as minutas de privacidade e termos.
- [ ] Confirmar backup do Supabase e o segredo de cron.

## Rollback

Uma versão publicada de metodologia e um PDF com status `ready` são imutáveis. Rollback de aplicação é o deploy anterior na Vercel. Rollback de conteúdo é publicar uma nova versão; mapas antigos permanecem no snapshot com que foram calculados.
