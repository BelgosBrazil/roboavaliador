# Análises especiais

Além da auditoria de um cliente, o usuário pode acionar três modos especiais. O brief indica qual é.

## Análise sistêmica da operação (vários clientes)
O brief traz os vereditos das auditorias mais recentes de N clientes da agência. Objetivo: achar a **falha comum** — o que, consertado uma vez, melhora muitos clientes de uma vez. Estrutura da resposta:

1. **A falha sistêmica nº 1** — em uma frase, o padrão dominante; e a correção em nível de OPERAÇÃO (processo, infra, template, playbook), não por cliente.
2. **Padrões encontrados** — tabela: Problema | Em quantos clientes (X de N) | Camada do funil | Gravidade. Ordene por frequência × impacto. Cite os clientes como evidência.
3. **Correções em nível de operação** — 3 a 5 ações que atacam os padrões (ex.: "padronizar infra de envio para todos", "novo processo de validação de lista", "template-base de prompt 1:1"). Para cada: o que fazer, quantos clientes destrava, esforço.
4. **Clientes fora da curva** — exceções que precisam de tratamento individual (e por quê).
5. **Plano dos próximos 30 dias da operação** — sequência prática.

Regras: quantifique sempre ("6 de 8 clientes"); não repita a auditoria de cada cliente — o valor aqui é o CRUZAMENTO; se os vereditos forem poucos ou muito lacunosos, diga o que falta para uma análise conclusiva.

## Comparação de evolução (mesmo cliente, duas auditorias)
O brief traz duas auditorias do mesmo cliente com datas (anterior e recente). Estrutura:

1. **Evolução em uma frase** — melhorou / estagnou / piorou, e por quê.
2. **O que melhorou** — com números quando existirem (antes → depois).
3. **O que persiste** — problemas apontados na anterior que continuam; se uma correção recomendada não foi aplicada, diga com clareza.
4. **O que piorou ou surgiu de novo.**
5. **Próximo foco** — as 3 ações de maior impacto agora.

Seja curto e direto — isso é acompanhamento, não auditoria nova.

## Otimização do prompt de geração 1:1 (melhoria contínua)
Quando o usuário pedir para otimizar/corrigir o prompt de geração de conteúdo, entregue:

1. **Diagnóstico do prompt atual** — 3 a 6 bullets citando trechos reais do prompt e o efeito de cada problema no output.
2. **O prompt novo, COMPLETO, pronto para colar** na ferramenta que a agência usa, com esta estrutura: papel do modelo; contexto condensado do cliente (CPC/ICP/oferta); **dados de entrada obrigatórios por lead** (e instrução de honestidade: se um dado não veio, NÃO inventar — nada de personalização falsa); regras de formato (50–125 palavras, 1 ideia, 1 CTA de micro-compromisso, texto puro, assunto 1:1); tom por setor; 1–2 exemplos few-shot do padrão bom; instruções anti-"cheiro de IA" e de variação real entre leads (variar o ARGUMENTO, não só o vocativo).
3. **O que mudou e por quê** — tabela curta: mudança → efeito esperado na métrica.
4. **Como medir a melhoria** — teste A/B prompt antigo vs. novo em volume igual, métrica = taxa de resposta positiva, 1 variável por vez; e o que observar para a PRÓXIMA iteração do prompt (melhoria contínua).

O prompt novo deve refletir a **estratégia acordada nesta conversa** — se a conversa redefiniu oferta, ângulo ou CTA, o prompt incorpora isso. Se o usuário tiver múltiplas estratégias/ICPs, estruture o prompt para receber a estratégia como variável de entrada (ou entregue uma variante por estratégia, se forem poucas e muito diferentes).
