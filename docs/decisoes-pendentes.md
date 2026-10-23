# Decisões provisórias — não homologadas

Estas escolhas existem para o código ter um comportamento explícito. Elas **não** são uma validação da especialista e podem ser alteradas no admin, na metodologia em rascunho, antes de qualquer publicação.

| Tema | Valor provisório | Onde alterar |
|---|---|---|
| Zodíaco | tropical | `/admin/metodologia` |
| Casas | Placidus | `/admin/metodologia` |
| Ponto da prévia gratuita | Sol | `/admin/metodologia` |
| Ascendente | calculado e exibido; não ativa código | flag `activate_ascendant`, default falso |
| Nodo | verdadeiro | `/admin/metodologia` |
| Roda da Fortuna | regra `pending_approval`: o ponto não é ativado e nenhuma longitude é inventada | `/admin/metodologia` |
| Preço | ausente e produto inativo até configuração | `/admin/configuracoes` |
| Glossário de signos | pendente; os PDFs não trazem um verbete autônomo | `/admin/astrologia` |
| Textos de casas e pontos | rascunho importado de `06_base_conhecimento_astrologico.json`; não vão para a IA até a publicação | `/admin/astrologia` e publicação da metodologia |
| Motor astronômico | Caelus 0.25.0, MIT, dados embutidos. Swiss Ephemeris só via worker com licença confirmada | `docs/deployment/astronomia.md` |
| Reembolso | o pagamento é marcado e o acesso não é revogado automaticamente | política ainda aberta |

## Conferência editorial do catálogo

O seed preserva os 36 registros de `docs/product/03_catalogo_36_codigos.json`, inclusive `null` de óleo e Tarô nas nove fichas de Áries, Leão e Sagitário, a grafia “Xamà das profundezas” e as palavras-chave repetidas.

O campo `sombra` de `escorpiao-3` contém o trecho “Código da Missão” e repete rótulos da ficha. Isso foi mantido de propósito. A tela do código no admin pede conferência com a página 36 do PDF antes da publicação. Não houve correção automática.

## O que a venda exige

A compra só abre quando, ao mesmo tempo:

- o mapa daquele token está com cálculo concluído;
- a metodologia publicada está homologada (`rules_validated`) e associada ao mapa;
- casas e pontos usados estão publicados;
- há preço ativo;
- InfinitePay, LLM e e-mail estão configurados. O checkout usa o Checkout Integrado da InfinitePay no lugar do Mercado Pago.

Sem essas condições a prévia pode existir, mas o checkout explica o bloqueio e não cobra.
