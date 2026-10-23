# Registro de decisões, ambiguidades e verificação editorial (v1.0)

Este arquivo evita que o desenvolvimento confunda **conteúdo confirmado pelos documentos** com **suposições de implementação**.

## Confirmado neste projeto

- Next.js (App Router) + TypeScript + Tailwind CSS, Vercel, Supabase PostgreSQL/Auth/Storage.
- Mercado Pago Checkout Pro, com processamento por Pix/cartão de crédito em ambiente hospedado pelo gateway e direito de acesso apenas após confirmação segura.
- Os **36 códigos** são três decanatos de cada um dos **12 signos**: `[0,10)`, `[10,20)`, `[20,30)` graus dentro do signo.
- Cada ficha contém arquétipo feminino, verbo/palavra-chave, regente, luz e sombra; óleo essencial e carta Tarô Espelho quando o arquivo fornece.
- A jornada propõe uma prévia gratuita e entrega paga com PDF e e-mail.
- Ativadores mencionados explicitamente: Sol, Lua, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno, Plutão, Quíron, Roda da Fortuna, Nodo Sul, Nodo Norte (14).
- IA interpreta **Código + Ponto + Casa** e integra repetições/conexões; não calcula efemérides, signo, casa nem código.
- Área administrativa controla conteúdo, metodologia, vendas, leads, relatórios, auditoria e usuários/roles.

## Pendentes de aprovação da especialista/proprietária

| Item | Proposta temporária de implementação | Necessidade de aprovação |
|---|---|---|
| Zodíaco | Tropical | Validar oficialmente |
| Sistema de casas | Placidus | Validar e definir exceções de latitudes extremas |
| Ponto gratuito | Ativação do Sol | Escolha definitiva ou edição pelo Admin |
| Ascendente | Calcular e exibir, mas não ativar na coleção inicial de 14 | PDF propõe começar por Sol, Lua, Ascendente e Nodo Norte |
| Nodo lunar | Configurável: true/mean | Definir convenção |
| Roda da Fortuna | Motor parametrizado; tratar mapa diurno/noturno conforme fórmula a aprovar | Definir convenção exata |
| Quíron e pontos derivados | Dependem do provedor de efemérides, validar precisão e casas | Homologar exemplos |
| Hora desconhecida | Bloquear cálculo completo dependente de casas, oferecer explicação | Aprovar se haverá versão limitada |
| Conteúdo gratuito | Uma ativação resumida + resumo natal | Definir extensão exata |
| Plano comercial | Um produto, preço configurável | Informar preço, extras, parcelamento |
| Modelo de IA | Adaptador parametrizável | Escolher fornecedor, orçamento, revisão humana |
| Artes | Upload admin de arquivos originais autorizados | Obter/autorizar arquivos e identidade final |
| Dados pessoais | Minimização, política/consentimentos e ciclo de retenção | Consultoria LGPD + termos da operação |
| Reembolso | Status rastreado e política de direito de acesso explícita | Definir experiência e regras |
| Campos de signos | Catálogo de signos separado será editorialmente redigido/revisado | PDFs não contêm glossário completo e independente de signos |

## Divergências e lacunas do PDF dos códigos

- Nomes de palavra-chave **não são únicos**: `Aperfeiçoar` (duas fichas em Virgem), `Harmonizar` (Virgem/Libra) e `Revelar` (Libra/Escorpião). Isso não é erro de banco: uma ficha é identificada por `(signo, decanato)`.
- A ficha do decanato 2 de Câncer aparece como **“Xamà das profundezas”**. Mantivemos a grafia extraída do PDF e recomendamos aprovar eventual correção para “Xamã”.
- As nove cartas de Áries, Leão e Sagitário estão com campos **óleo essencial e carta de Tarô Espelho não informados** no PDF. Mantivemos `null` sem inventar valores.
- O PDF é principalmente um **oráculo autoral** com maneiras intuitivas de escolher códigos. A plataforma proposta associa esses códigos às posições astrológicas por signo/grau; não introduzir regras adicionais a partir dos usos livres do oráculo.
- O material explica que nenhum símbolo é estritamente positivo/negativo e que código não determina destino. Preservar linguagem simbólica.
- O PDF cita **Ascendente** nos pontos sugeridos para começar, mas o briefing final enumera 14 posições sem Ascendente. Não ocultar essa discrepância.
- Usos por tema (prosperidade, relações, rotina, etc.) da página 10 são **sugestões de investigação editorial**, não pesos matemáticos formalizados para o motor.
- Imagens das páginas 13–48 são referências visuais; verificar direitos e resolução antes de usá-las em produção.

## Checklist de homologação antes da produção

- [ ] Conferir registros JSON `03` contra as 36 fichas, incluindo grafia e texto de sombra/luz.
- [ ] Aprovar sistema de casas, zodíaco, Quíron, Nodo e fórmula da Fortuna.
- [ ] Testar engine astronômico contra mapas de referência autenticados.
- [ ] Aprovar regra gratuita e política de preço.
- [ ] Obter chaves de teste e produção do Mercado Pago; confirmar Pix ativo e cartão habilitado.
- [ ] Testar webhook assinado, pagamentos repetidos, reembolso e falhas de rede.
- [ ] Aprovar base editorial das 12 casas e 14 pontos; complementar glossário dos 12 signos.
- [ ] Revisar resultado da IA em múltiplos mapas por especialista para garantir qualidade e tom.
- [ ] Disponibilizar artes originais autorizadas e testar no mobile/PDF.
- [ ] Revisar política de privacidade, retenção e comunicação de IA por assessoria jurídica.

## Conferência automatizada realizada

O JSON foi checado contra o **texto pesquisável** das páginas 13–48 do PDF: 36 registros, 12 signos com 3 decanatos, unicidade de `(signo_slug, decanato)`, e presença textual dos campos `arquetipo_feminino`, `palavra_chave`, `regente_do_decanato`, `luz`, `sombra` e, quando informados, `oleo_essencial` e `carta_taro_espelho`. Nenhuma divergência textual foi encontrada nessa verificação automática. Isso **não substitui a homologação editorial humana** das imagens, grafia e convenções astrológicas.
