# Playbook Brasil — o que é específico daqui

## Por que "o tradicional" parou de funcionar
O modelo clássico de cold outbound (spray-and-pray, alto volume, sequência genérica de 5 emails "evoluindo no funil") foi:
1. **Comoditizado** — todo mundo faz igual; as caixas dos decisores estão saturadas de emails iguais.
2. **Penalizado** — desde as regras de Google/Yahoo (fev/2024), volume frio sem infra impecável = spam.
3. **Importado sem tradução** — táticas dos EUA aplicadas cruas ao Brasil, ignorando canal (WhatsApp), cultura de compra e LGPD.

Quando o cliente diz "o tradicional não funciona mais", quase sempre é a combinação **entregabilidade + saturação + falta de tradução local**. Considere isso antes de culpar o copy.

## LGPD — cold outbound legal no Brasil
- Base legal usual pra cold B2B: **legítimo interesse**. Mas exige: dado de fonte legítima, pertinência com o negócio do destinatário e **opt-out fácil** em todo disparo.
- Dado de fonte pública (gov.br etc.) **≠ consentimento**. Não trate como se fosse.
- Todo email precisa de forma clara de descadastro; todo WhatsApp precisa respeitar pedido de parada.
- Isso não é só compliance: descadastro fácil e segmentação boa também **protegem sua reputação de envio**.

## WhatsApp no Brasil — canal quente, não frio
- WhatsApp é o canal de maior conversão do Brasil — MAS como canal de **relacionamento/morno**, não de prospecção fria.
- **Cold WhatsApp em lista comprada = número banido rápido pela Meta + quebra de confiança + risco LGPD.** Não escale isso.
- Uso correto: WhatsApp **depois de um sinal** (respondeu email, baixou material, agendou, deu opt-in). Aí ele voa.
- **API oficial** (WhatsApp Business API, templates aprovados) vs. **não-oficial** (chip + automação): a não-oficial derruba número. Se a operação depende de WhatsApp frio via chip, isso é um **risco estrutural** — sinalize com destaque.

## Entregabilidade no Brasil
- Reputação de domínio e IP conta. Domínios `.com.br` novos precisam de warmup como qualquer outro.
- Provedores locais (UOL, Terra, BOL, além de Gmail/Outlook corporativo) têm filtros próprios — teste entregabilidade em várias caixas, não só no seu Gmail.
- Texto puro, poucos links, sem imagem pesada: regra de ouro pra caixa de entrada aqui também.

## Cultura de compra B2B brasileira
- Relacionamento e confiança pesam mais, e o ciclo tende a ser mais lento. Pedir reunião de 45 min no primeiro toque a frio tem baixa conversão.
- **Micro-compromissos** funcionam melhor: uma pergunta simples, um material, um "faz sentido pra vocês?".
- **Prova social local** importa muito — o lead confia em quem já atende empresas parecidas com a dele, no Brasil.
- Formalidade varia por setor (jurídico/indústria mais formais; tech/varejo mais próximos). O tom precisa casar com o **setor do lead**, não com o gosto de quem escreve.

## Mapa sintoma → camada (use pra direcionar o diagnóstico)
Se você observar qualquer um destes, priorize a camada indicada ACIMA de qualquer ajuste de texto:
- **"Nada funciona" em vários clientes + sem dados de infra** → suspeite fortemente de **entregabilidade/reputação** (camada 1).
- **Taxa de resposta ≈ 0 em volume alto** → quase sempre **entregabilidade** (camada 1). Copy ruim ainda arranca alguma resposta; spam arranca zero.
- **Abre muito e responde nada** → **oferta/CTA fracos** ou match ruim (camadas 3/4), não entregabilidade.
- **Responde e não agenda** → **LP / fricção de agendamento** ou oferta (camadas 5/3).
- **Agenda e não fecha** → fora do escopo da prospecção, mas sinalize: qualificação/ICP (camada 2) ou proposta comercial.
