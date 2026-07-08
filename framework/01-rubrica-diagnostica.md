# Rubrica diagnóstica — o que checar em cada camada

Para cada camada, produza: um **status** (🔴 crítico / 🟡 atenção / 🟢 ok / ❓ sem dado), **o que você observou** (com evidência), a **causa-raiz** provável e a **correção** concreta. Cruze o quantitativo com o qualitativo sempre que possível.

## 1. Infraestrutura & entregabilidade — o assassino silencioso nº 1
Se o email não chega, nada mais importa. Cheque:
- **Domínio de envio:** está usando o domínio principal da empresa? (perigo — queima a reputação do domínio corporativo). O correto é domínios secundários dedicados ao outbound, redirecionando pro principal.
- **Autenticação:** SPF, DKIM e DMARC configurados e alinhados? Sem os três, Google/Yahoo (regras de fev/2024) mandam pra spam por padrão.
- **Warmup:** as caixas foram aquecidas antes do volume? Caixa nova + volume alto = spam imediato.
- **Volume por caixa/dia:** cold outbound sustentável fica em ~20–50 envios/dia por caixa. Acima disso a reputação despenca. Cruze com o volume total que ele reporta.
- **Ferramenta de envio:** usa ferramenta de cold (Instantly, Smartlead, lemlist, Reachinbox…) ou uma plataforma de e-mail marketing/newsletter (Mailchimp, RD Station, Brevo…)? Plataforma de newsletter para cold = morte por spam/aba Promoções.
- **Bounce e spam:** bounce > 3–5% ou reclamação de spam > 0,3% = reputação em queda. Se houver esses números, use-os.
- **Sinais de spam no conteúdo:** excesso de links, imagens, pixel de rastreamento, HTML pesado, palavras-gatilho, botão de descadastro chamativo. Cold email que chega na caixa é quase sempre texto puro, com 0 ou 1 link.
- **Verificação DNS automática:** quando o brief trouxer o bloco "Verificação automática de DNS/entregabilidade", esses dados vieram de **consulta DNS real feita pela ferramenta** — trate como evidência ✅ confirmada (não como relato do usuário). Interprete: SPF ausente/duplicado/`+all` = crítico; DMARC ausente = crítico (exigência Gmail/Yahoo), `p=none` = configurado mas sem proteção (atenção); DKIM não encontrado nos seletores comuns = provável ausência (peça o seletor da ferramenta antes de cravar); sem MX = domínio não recebe resposta (mata o reply). Se a consulta falhou (timeout), NÃO conclua — peça para verificar de novo.
- Se **nenhum** dado de infra foi fornecido: status ❓, e declare que — sem auditar a infra — a probabilidade de o problema morar aqui é ALTA. Peça: domínios usados, SPF/DKIM/DMARC (sugira usar o botão "Verificar DNS" da ferramenta), ferramenta de envio, volume/dia por caixa, se houve warmup, taxa de bounce e de reclamação de spam.

## 2. Lista & fit (ICP ↔ lista)
- A amostra de leads **corresponde ao ICP declarado**? Cargo, porte da empresa, setor, geografia batem?
- Fonte da lista (gov.br, apify, snov.io, Big Data Corp): dá **volume**, não **intenção**. Há algum sinal de que o lead tem a dor AGORA (timing/gatilho)?
- Os contatos são de **decisor** ou de quem não decide? Prospecção pro cargo errado mata a resposta por mais bem escrito que seja o email.
- **Validação:** validar que o email está ativo ≠ validar que a pessoa é o comprador certo. A validação de vocês checa qual das duas?
- **Personalização possível:** a lista tem dados suficientes pra personalização real (não só `{primeiro_nome}`)?

## 3. Oferta & proposta de valor
- A oferta é **forte**? Resultado específico, tangível e crível ("agende 15 reuniões qualificadas/mês com [ICP]") ou vaga ("ajudamos empresas a crescer / a vender mais")?
- O **CPC** foi bem mapeado? A mensagem fala a **dor real do cliente-do-cliente**, no vocabulário dele — ou fala dos recursos/serviços de vocês?
- Tem **prova** (casos, números, nomes reconhecíveis)? A frio, promessa sem lastro não converte.
- "**Por que agora**" e "**por que vocês**" estão claros?
- **Risco reverso:** há garantia, teste, "sem compromisso"? A frio, reduzir risco costuma pesar mais que empilhar benefício.
- **Assimetria de compromisso:** o CTA pede reunião de 30–45 min (pedir casamento no primeiro date) ou um **micro-sim** (uma pergunta, um material, um "faz sentido?")?

## 4. Copy & sequência (email e WhatsApp)
Avalie cada peça E a sequência como um todo:
- **Primeira linha:** relevância imediata sobre o lead/empresa dele, ou começa falando de vocês? ("Somos a X, ajudamos empresas a…" = deletado em 2 segundos.)
- **Personalização:** real (referência a algo específico do lead) ou mala-direta com `{nome}` maquiada?
- **Tamanho:** cold email curto (≈ 50–125 palavras) vence. Textão perde.
- **1 ideia, 1 CTA:** cada email tem um único pedido claro?
- **Sequência / funil de atenção:** os follow-ups agregam **ângulos novos** (novo caso, nova dor, nova prova, nova pergunta) ou são "só passando pra saber se você viu meu email"? Follow-up preguiçoso irrita e não converte. Se a estratégia é "evoluir o lead no funil de atenção" e não funciona, avalie se os passos realmente **constroem interesse** ou só **adiam o pedido**.
- **Fundo de funil direto que não performa:** quase sempre falha porque pede a conversão **sem ter construído contexto ou confiança nenhuma**. Diga qual dos dois problemas (adiar demais vs. pedir cedo demais) você está vendo.
- **Assunto (email):** curto, sem clickbait, parece email 1:1 de humano? Assunto com cara de newsletter/promoção vai direto pra aba Promoções.
- **WhatsApp:** o tom casa com o canal (mais próximo, curto) ou é o email copiado e colado? E — crítico — esse WhatsApp é **frio** (lista comprada) ou **morno** (lead que já interagiu)? Veja o Playbook Brasil.

### 4b. Sistema de geração do conteúdo 1:1 (quando prompt/modelo de IA forem fornecidos)
A agência produz conteúdo "ultra personalizado" por lead usando IA. Nesse caso, audite o **sistema que gera** o conteúdo, não só as peças que saíram dele:
- **Insumo real vs. personalização inventada:** o prompt recebe **dados concretos do lead** (cargo, empresa, setor, porte, gatilho/momento) ou pede pro modelo "personalizar" sem insumo? Sem dado real, a IA **inventa** personalização — elogio genérico ("vi que sua empresa está crescendo!"), suposição não verificável — e isso derruba resposta mais que email sem personalização nenhuma.
- **Conhecimento embutido:** o prompt carrega o **CPC, o ICP e a oferta** do cliente, ou o modelo escreve às cegas sobre um negócio que não conhece?
- **Restrições de formato:** o prompt trava tamanho (50–125 palavras), 1 ideia / 1 CTA, texto puro, tom adequado ao setor do lead? Ou deixa o modelo livre (que por padrão escreve longo, formal e inflado)?
- **Exemplos de referência:** o prompt inclui 1–3 exemplos do padrão BOM (few-shot)? Prompt sem exemplo produz média da internet; exemplo bom puxa o output pro seu padrão.
- **"Cheiro de IA" no output:** compare o prompt com o copy real fornecido — estrutura idêntica em todos os leads, formalidade excessiva, frases infladas ("Espero que esta mensagem o encontre bem"), elogios vazios? Decisor recebe dezenas desses por semana e reconhece na hora.
- **Variação:** o sistema produz variação real entre leads/toques ou é o mesmo esqueleto com `{empresa}` trocada? Personalização de verdade muda o **argumento**, não só o vocativo.
- **Modelo adequado:** o modelo usado dá conta de seguir instruções longas e manter tom? Se o modelo é fraco pra tarefa, nenhum prompt salva.
- **Correção:** quando houver problema, **reescreva o prompt de geração como entregável** (seção 4 do relatório) — versão completa, pronta pra colar, com: papel, CPC/ICP/oferta resumidos, dados de entrada exigidos por lead, restrições de formato, tom por setor, 1–2 exemplos bons e instrução anti-"cheiro de IA".

## 5. Landing page & conversão
- **Match mensagem → LP:** a promessa do email/WhatsApp é a MESMA da headline da LP? Quebra de continuidade derruba conversão.
- **Múltiplas LPs / ICPs / estratégias:** quando o cliente tiver mais de uma LP, avalie **cada uma** e — crítico — o **pareamento**: cada estratégia manda o ICP certo para a LP certa? Sequência do ICP A apontando para a LP do ICP B é vazamento clássico. Se o brief não deixar claro qual estratégia usa qual LP, aponte isso como lacuna.
- **Clareza em 5 segundos:** dá pra entender o que é, pra quem, e qual o próximo passo?
- **CTA único:** agendamento sem fricção (poucos campos, calendário embutido) ou formulário longo/genérico?
- **Prova social BR:** logos, depoimentos, números — de empresas que o lead reconhece?
- **Mobile-first:** o Brasil acessa no celular. A LP é rápida e boa no mobile?
- **Confiança:** identidade clara, contato, aviso de privacidade (LGPD). Página órfã e anônima não converte a frio.

## 6. Medição & aprendizado — o assassino silencioso nº 2
- Vocês medem **por etapa**? Enviados → entregues → abertos (pouco confiável) → respondidos → respostas positivas → reuniões → oportunidades?
- **Por estratégia e por disparo:** quando o brief trouxer métricas detalhadas por estratégia/disparo, compare-as — onde cada sequência perde força (disparo 1 vs. follow-ups)? Qual estratégia performa melhor e por quê? Um disparo com queda anormal indica problema pontual (assunto, ângulo, segmento); queda uniforme em tudo indica problema sistêmico (infra, lista).
- **Métricas de WhatsApp:** as que importam são **entregues → lidas → respondidas → respostas positivas → reuniões**, mais os sinais de risco: **bloqueios/denúncias e números banidos** (qualquer banimento = alerta vermelho de canal frio/abuso — trate na camada 1/risco, não como "métrica ruim").
- **Métricas certas:** a frio, o que importa é **taxa de resposta positiva** e **reuniões agendadas** — não taxa de abertura (Apple MPP inflou tudo) nem cliques.
- **Volume de teste:** rodou volume suficiente pra concluir algo, ou está tirando conclusão de 50 envios?
- **Ciclo de iteração:** existe processo de testar 1 variável por vez, ou muda tudo ao mesmo tempo e não sabe o que causou o quê?
- Se **não há** métricas por etapa: esse é provavelmente o **achado nº 1**. Sem funil medido, você e a agência estão adivinhando. Liste exatamente o que instrumentar.
