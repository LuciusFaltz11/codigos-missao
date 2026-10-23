# Motor astronômico

O cálculo segue quatro etapas, cada uma com uma responsabilidade só.

1. **Caelus** devolve posições aparentes, cúspides, Ascendente e Meio do Céu. A versão usada é a 0.25.0, licença MIT, pacote `caelus`, dados embutidos. Ele não escolhe o Código da Missão.
2. **O motor deste projeto** transforma longitude em signo e grau no intervalo `[0, 30)`, depois em decanato `[0, 10)`, `[10, 20)` ou `[20, 30)`, e só então no código oficial. A casa de cada ponto sai das cúspides recebidas.
3. **A inteligência artificial** recebe código, ponto, casa e padrões já calculados. Ela não recalcula o céu e não troca o arquétipo.
4. **A leitura** mostra a prévia gratuita e, depois do pagamento confirmado, o relatório completo.

## Como ligar

O padrão é o Caelus. Para desligar o cálculo:

```dotenv
ASTROLOGY_ENGINE=none
```

O worker do Swiss Ephemeris continua disponível só com licença profissional confirmada:

```dotenv
ASTROLOGY_ENGINE=swiss_worker
ASTROLOGY_LICENSE_CONFIRMED=true
ASTROLOGY_WORKER_URL=https://worker.example.com/natal
ASTROLOGY_WORKER_SECRET=
```

Sem essa confirmação, o worker permanece em `license_unconfirmed` e não é chamado.

## Regras que o adaptador preserva

- O instante enviado ao Caelus já está em UT, resolvido pelo fuso histórico do nascimento.
- O nodo usado é o da metodologia (`true` ou `mean`). O Nodo Sul é o Nodo Norte mais 180°, e essa derivação fica na versão do cálculo.
- A Roda da Fortuna só entra quando a regra deixa de ser `pending_approval`. A fórmula usada nesse caso é a do lote da fortuna do Caelus, dia e noite.
- Se Placidus não existe na latitude, o mapa falha com `house_system_unavailable`. O sistema não é trocado em silêncio para signo inteiro.
- Zodíaco sideral falha com `sidereal_ayanamsa_unconfigured` até existir um ayanamsa escolhido na metodologia.
- Ponto ausente ou fora da faixa validada falha o mapa. Nenhuma posição é completada por aproximação.
