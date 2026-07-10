# Modo RD Station (operação rodando inteira na RD)

O brief pode declarar o **modo de operação: RD Station**. Nesse modo, toda a operação do cliente roda dentro do RD Station: os leads (inclusive de prospecção/cold) **já estão na base**, os disparos são feitos por **emails standalone** e por **fluxos de automação** organizados por estágio de funil (atenção → consideração → decisão), com **lead scoring**.

## Regra de ouro deste modo — NÃO julgue a plataforma
A escolha de operar pela RD Station é uma **decisão dada, não um achado**. NÃO gaste o relatório debatendo se a RD é a ferramenta certa para cold, se a base deveria estar lá, ou se "o ideal seria outra stack". O trabalho é responder: **como extrair o máximo de resultado DENTRO da RD, do jeito que a operação é?** Só mencione uma limitação da plataforma quando ela for a causa direta de um resultado ruim — em uma linha, e sempre acompanhada da mitigação possível dentro da própria RD.

## Camada 1 — Entregabilidade operando pela RD
Fatos de entrega continuam decidindo o jogo (email que não chega não converte) — audite como **operar bem dentro da RD**:
- **Autenticação do domínio na RD:** o domínio de envio está autenticado nas configurações da RD (DKIM/SPF) e com DMARC publicado? Enviar sem autenticar o próprio domínio = entregabilidade de segunda classe.
- **Base importada (leads de prospecção):** os cuidados que protegem a conta: validar os emails ANTES de importar (bounce alto queima a reputação do remetente inteiro), começar os disparos pelos segmentos com maior chance de engajar, escalar volume gradualmente (aquecimento de base), e régua de supressão agressiva (hard bounce fora imediatamente; sem engajamento após N toques → pausa).
- **Sinais para monitorar de perto:** bounce > 2–3% = base precisa de validação; descadastro > 0,3%/envio = atenção; marcação de spam > 0,08% = crítico (risco para a conta RD inteira, que é compartilhada entre todas as campanhas do cliente).
- **Frequência:** cadência regular > rajadas; picos súbitos derrubam reputação. A mesma pessoa recebe standalone + fluxo na mesma semana?
- **Volume/dia e janelas de disparo** adequados ao tamanho e engajamento da base.

## Camada 2 — Base & segmentação
- **Mapeie a base como ela é:** quantos contatos, origem (importados de prospecção, opt-in, eventos…), % engajado (abriu/clicou em 90d). Base de 50k com 3k engajados opera como uma base de 3k.
- **Segmentação dos disparos:** standalone vai para segmentos (perfil, estágio, engajamento) ou para a base inteira? Broadcast constante = fadiga + descadastro + reputação caindo.
- **Fit com o ICP:** os segmentos priorizados batem com o ICP declarado? Importação tem dados suficientes para segmentar e personalizar (cargo, setor, porte)?
- **LGPD operacional:** opt-out fácil em todo disparo e pedido de descadastro respeitado nos fluxos também (não só no standalone). Trate como higiene operacional, sem sermão.

## Camada 3 — Oferta por estágio
Além do método geral: a oferta precisa **casar com o estágio do funil de cada fluxo**. Atenção = valor/conteúdo (baixo compromisso); Consideração = prova/caso/demonstração; Decisão = reunião/proposta/trial. Oferta de decisão empurrada em fluxo de atenção (ou vice-versa) é vazamento clássico — aponte onde acontece.

## Camada 4 — Copy: standalone × emails de fluxo
- **Standalone (campanhas pontuais):** assunto + preheader trabalhados? 1 objetivo por email? Fadiga (frequência sobre o mesmo segmento)? Para base importada de prospecção, o copy conversa como primeiro contato (contexto, relevância imediata) ou presume relacionamento que não existe?
- **Emails de fluxo:** coerentes com o gatilho e o estágio do fluxo? Personalização usa os dados da base? Desatualizados (links, preços, produtos)?
- **A/B nativo da RD:** é usado? Em assunto/CTA? Com volume suficiente para concluir?

## Camada 4b — Fluxos de automação por estágio (central neste modo)
O brief traz os fluxos separados por estágio (atenção / consideração / decisão) e o **racional da jornada**. Audite o desenho, não só os emails:
- **Racional:** a lógica declarada faz sentido para o ICP e o ciclo de compra? Os critérios de **transição entre estágios** existem e são observáveis (clicou em X, visitou Y, atingiu N pontos) ou o lead muda de estágio por tempo/achismo?
- **Cobertura:** existe fluxo para os três estágios? Onde a jornada tem buraco (ex.: atenção robusta e decisão inexistente — gera lead informado que ninguém converte)?
- **Gatilhos de entrada** claros por fluxo? **Welcome/primeiro contato** para leads recém-importados existe (é o disparo de maior atenção de todos)?
- **Sobreposição:** o mesmo lead pode estar em 2+ fluxos e ser bombardeado? Há regra de exclusão/prioridade entre fluxos e entre fluxo × standalone?
- **Delays e duração:** os intervalos respeitam o ciclo de compra ou foram chutados?
- **Objetivo por fluxo:** cada fluxo tem UMA conversão-alvo definida e medida (não "engajar")?
- **Saída:** o que acontece ao concluir cada fluxo — promove de estágio, entrega para vendas, recicla, morre?
- **Fluxos órfãos:** rodando sem dono, sem métrica olhada, com conteúdo velho.

## Camada 4c — Lead scoring
- **Perfil (fit) × interesse (engajamento) separados** (o modelo da RD) ou misturados num número só (gera MQL falso)?
- **Pontuações justificadas?** Visitar página de preços ≠ abrir newsletter. Os pesos refletem intenção real?
- **Threshold de MQL calibrado com o comercial** ou definido no achismo? Vendas valida os MQLs que recebe?
- **Decaimento:** engajamento antigo expira, ou lead quente de 6 meses atrás segue "quente"?
- **Consumo:** o que ACONTECE quando o lead vira MQL — notificação, dono, SLA de abordagem, entra no fluxo de decisão? **Scoring que ninguém consome é enfeite** — é o defeito mais comum.
- **Scoring ↔ fluxos:** a pontuação alimenta as transições de estágio dos fluxos, ou os dois sistemas vivem separados?

## Camada 5 — LPs e formulários
Método geral, mais: formulários/LPs da RD com campos progressivos, thank-you page com próximo passo, e o formulário alimenta segmentação e scoring corretamente?

## Camada 6 — Métricas (versão RD)
- **Por standalone:** entregues, abertura (ressalva Apple MPP), **cliques, CTOR**, respostas (se cold), descadastro, spam.
- **Por fluxo e por estágio:** conclusão do fluxo, conversão no objetivo, transição atenção→consideração→decisão (onde o funil de nutrição vaza?).
- **Scoring:** MQLs gerados → aceitos por vendas → oportunidades → vendas. Sem essa ponta, o marketing não prova valor — achado prioritário.
- Compare **standalone × fluxo**: qual motor gera mais resultado por email enviado?

## Mapa sintoma → camada (modo RD)
- **Abertura baixa/caindo** → reputação/higiene/autenticação (1) ou assunto (4). Base importada sem validação vem primeiro.
- **Abre e não clica** → conteúdo/CTA (4) ou oferta errada para o estágio (3).
- **Clica e não converte** → LP/formulário (5) ou oferta (3).
- **Descadastro/spam subindo** → frequência/segmentação/sobreposição de fluxos (1/2/4b).
- **Leads presos num estágio** → critérios de transição/racional da jornada (4b).
- **MQLs que vendas ignora** → scoring descalibrado ou handoff sem processo (4c).

## Pré-voo neste modo
Valida um standalone ou um fluxo ANTES de ativar: mesmos 7 blocos, com varredura adaptada — autenticação do domínio na RD, validação da base/segmento alvo, frequência acumulada sobre o mesmo público, sobreposição com fluxos ativos, coerência oferta×estágio, links/UTMs.
