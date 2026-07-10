# Belgos · Roboavaliador de Campanhas

Um auditor **e estrategista** de funil de outbound (cold email + WhatsApp + landing page) movido a Claude (Opus 4.8), **especializado no mercado brasileiro**. Você alimenta os dados de **um** cliente — CPC, ICP, oferta, sequências, LP, amostra de leads, métricas e infra — e ele devolve, na tela, um diagnóstico de **onde o funil está vazando e como corrigir**. Depois, você **conversa** com ele para adaptar tudo à sua infraestrutura real, reescrever campanhas por inteiro e montar sequências novas.

## Por que ele é diferente de "revisar o copy"

Quando muitas campanhas não performam ao mesmo tempo, o problema quase nunca é o texto dos emails — é sistêmico. O robô audita o funil **inteiro, em ordem**, porque uma camada quebrada em cima torna as de baixo irrelevantes:

1. **Infraestrutura & entregabilidade** (o assassino silencioso nº 1 — email caindo em spam)
2. **Lista & fit** (ICP ↔ lista)
3. **Oferta & proposta de valor**
4. **Copy & sequência** (email / WhatsApp)
5. **Landing page & conversão**
6. **Medição & aprendizado** (o assassino silencioso nº 2 — funil sem métrica é achismo)

Ele diferencia o que **vê** (✅ confirmado) do que **supõe** (⚠️ provável) e do que **não dá pra avaliar** (❓ sem dado), prioriza por impacto e lidera pela conclusão. Aceita tanto dados **quantitativos** (métricas por etapa, taxas) quanto **qualitativos** (copy, oferta, leads).

## Duas etapas: auditoria → conversa

1. **Auditoria** — você preenche o formulário do cliente e recebe o diagnóstico completo do funil, em streaming.
2. **Conversa** — a partir daí é um chat com o mesmo analista. Ele vira estrategista de mão na massa: peça para **reescrever a sequência inteira**, **adaptar à sua infraestrutura real** ("só tenho 1 domínio", "envio pelo Gmail", "WhatsApp é chip, não API oficial"), **montar uma cadência nova**, gerar variações de assunto para teste A/B, copy de landing page etc. Ele sempre dá o melhor plano possível **dentro das suas restrições** e é explícito sobre os trade-offs.

O botão **Copiar / Baixar .md** exporta a conversa inteira (auditoria + iterações).

**Modo de operação — Cold outbound × RD Station:** no topo do formulário, escolha como a operação do cliente roda. No modo **RD Station** (leads já na base — inclusive de prospecção —, emails standalone, automações e lead scoring), o formulário ganha campos próprios: **fluxos por estágio** (🔵 Atenção → 🟡 Consideração → 🟢 Decisão), **racional da jornada**, **régua de lead scoring** e **configuração na RD** (autenticação de domínio, validação da base, frequência, supressão) — e o avaliador aplica um método específico que **não julga a escolha da plataforma** (ela é um dado): audita o desenho da jornada, os critérios de transição entre estágios, a coerência oferta×estágio, o scoring (fit × interesse, threshold calibrado, handoff) e a entregabilidade operando pela RD. Métricas ganham **Cliques** e **Descadastros**, e o escopo ganha a frente **Automações & scoring**.

**Verificação automática de DNS/entregabilidade:** na seção de infra, digite o domínio de envio e clique **Verificar DNS** — a ferramenta consulta o DNS de verdade (SPF, DMARC, DKIM nos 16 seletores mais comuns ou no que você informar, e MX) e injeta o resultado na auditoria como **evidência verificada**, com interpretação de cada problema (SPF duplicado/`+all`, DMARC `p=none`, sem MX etc.). Verifique quantos domínios usar; cada um vira um cartão.

**✈ Pré-voo (validar ANTES de disparar):** para campanha que ainda não foi lançada. Preencha o mesmo formulário com o material planejado e clique **Pré-voo**: veredito 🟢 GO / 🟡 GO com ajustes / 🔴 NO-GO, riscos ranqueados com evidência, ajustes obrigatórios vs. recomendados, varredura de gatilhos de spam no copy e plano de ramp-up de volume. Previna antes de queimar lista e domínio.

**⭐ Biblioteca de vencedores (melhoria contínua):** quando uma campanha performar, salve-a como vencedor (botão no topo, ou "⭐ Vencedor" em qualquer resposta do chat) — com a métrica que prova. A partir daí, **todas** as auditorias, reescritas e otimizações de prompt passam a usar os padrões comprovados da SUA operação como referência (injetados no cérebro do avaliador automaticamente). É o ativo proprietário da agência: o que funciona no seu mercado, com memória.

**UX guiada:** banner de primeiros passos (4 passos, descartável), botão **?** no topo com o guia completo de uso, tooltips em todos os botões e dicas em todos os campos.

**Clientes salvos e histórico:** a barra no topo do formulário salva o brief de cada cliente (recarregue com um clique) e guarda **todas as auditorias com data** em `data/` (fora do git). Reabra qualquer auditoria e continue a conversa de onde parou, compare a evolução do cliente entre as duas auditorias mais recentes (**Comparar evolução**) e faça backup/restauração de tudo em um JSON (⬇/⬆).

**Análise da operação:** o botão no topo cruza a auditoria mais recente de **todos** os clientes salvos e responde à pergunta central: *qual é a falha comum da operação?* — com padrões quantificados ("X de N clientes"), correções em nível de operação e plano de 30 dias.

**Modelo e esforço na tela:** selecione Fable 5 / Opus 4.8 / Sonnet 5 e o nível de esforço por análise, sem mexer no `.env`.

**Métricas por estratégia e disparo:** além dos totais (email **e WhatsApp** — incluindo bloqueios e números banidos), uma tabela dinâmica registra cada disparo de cada estratégia (Estratégia X · disparo 1, 2, 3…; Estratégia Y · …), e o avaliador compara onde cada sequência perde força.

**Múltiplos ICPs, LPs e estratégias:** o cliente pode ter várias landing pages (cada uma com busca por URL), vários ICPs e várias estratégias — o avaliador audita o *pareamento* (a estratégia certa manda o ICP certo para a LP certa?).

**Planilhas em três lugares:** emails enviados, mensagens de WhatsApp e amostra de leads podem ser importados de .xlsx/.csv.

**Otimizador de prompt 1:1 (melhoria contínua):** o botão "Otimizar prompt 1:1" reescreve o prompt de geração alinhado à estratégia acordada na conversa, com diff explicado e roteiro de teste A/B para a próxima iteração.

**PDF por resposta:** cada resposta do avaliador tem seu próprio botão "PDF desta resposta" — exporte só o trecho aprovado da conversa, não a conversa inteira.

**Auditoria completa ou por etapa:** no topo do formulário, o bloco **Escopo da auditoria** deixa você marcar o que o avaliador deve analisar (emails, WhatsApp, LP, prompt 1:1, automações, lista, oferta, métricas e — separadamente — domínios & DNS). Tudo marcado = fluxo completo do cliente; desmarque para validar só etapas. Mesmo com escopo restrito, se os dados mostrarem problema crítico numa camada acima do funil, o relatório inclui um alerta curto.

**Planilha de emails enviados:** além de colar a sequência, você pode importar um **.xlsx ou .csv** com exemplos reais de emails — cada linha é um email, e vale tanto o email inteiro numa coluna quanto partes/parágrafos em colunas separadas (assunto, abertura, corpo, CTA…). O conteúdo entra na auditoria como evidência de copy.

**Landing page pela URL:** informe a URL da LP e clique em **Buscar** — o servidor acessa a página e extrai título, meta description, headings, CTAs, formulários (campos e botão) e o texto, direto para o campo da auditoria (editável antes de enviar).

**PDF para apresentar ao cliente:** depois de aprovar as adaptações na conversa, clique em **Versão p/ cliente** — o avaliador gera o documento de apresentação (resumo executivo, diagnóstico em linguagem de gestor, plano de ação com responsáveis e prazos), sem jargão interno e sem expor a operação da agência. Ajuste o que quiser pelo chat e clique em **PDF**: abre um layout de documento timbrado (A4) pronto para "Salvar como PDF" — ideal para o CS levar à reunião.

**Conteúdo 1:1 gerado por IA?** O formulário tem um bloco para colar o **modelo e o prompt** que você usa para gerar o conteúdo ultra personalizado de cada lead. O avaliador audita o *sistema de geração* (insumos reais vs. personalização inventada, CPC/ICP embutidos, restrições de formato, "cheiro de IA") e, quando necessário, **reescreve o prompt inteiro** — a correção de maior alavancagem, porque conserta o conteúdo de todos os leads de uma vez.

## Como rodar

Requer Node 20+.

```bash
# 1. Instale as dependências
npm install

# 2. Configure a chave da API
cp .env.example .env
#   edite .env e cole sua ANTHROPIC_API_KEY (console.anthropic.com)

# 3. Suba o servidor
npm start
```

Abra <http://localhost:3000>, preencha o formulário de um cliente e clique em **Rodar auditoria**. O relatório é transmitido na tela em tempo real e pode ser copiado ou baixado em `.md`.

## Configuração (`.env`)

| Variável            | Padrão            | O que faz                                                        |
| ------------------- | ----------------- | ---------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | —                 | **Obrigatória.** Sua chave da Anthropic.                         |
| `MODEL`             | `claude-opus-4-8` | Modelo (ver tabela abaixo).                                      |
| `EFFORT`            | `high`            | Profundidade do raciocínio: `low`/`medium`/`high`/`xhigh`/`max`. |
| `PORT`              | `3000`            | Porta do servidor.                                               |

### Escolha do modelo

| `MODEL`           | Quando usar                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `claude-fable-5`  | **O máximo absoluto.** O modelo mais capaz da Anthropic, para as análises mais exigentes. Mais caro. A ferramenta configura automaticamente fallback para Opus 4.8. |
| `claude-opus-4-8` | **Padrão recomendado.** Análise de ponta com excelente custo-benefício.                                                            |
| `claude-sonnet-5` | Mais rápido e barato, qualidade quase-Opus — bom para triagens em volume.                                                          |

Para espremer o máximo em auditorias difíceis, combine com `EFFORT=xhigh`.

## O "cérebro" é editável (sem mexer no código)

Toda a expertise vive em `framework/*.md` — é o prompt de sistema do auditor. Edite esses arquivos para calibrar o método, os checklists e o formato do relatório; as mudanças valem na **próxima** auditoria, sem reiniciar o servidor.

| Arquivo                            | Conteúdo                                                        |
| ---------------------------------- | -------------------------------------------------------------- |
| `framework/00-persona-e-metodo.md` | Papel, princípios e a ordem de diagnóstico.                    |
| `framework/01-rubrica-diagnostica.md` | O que checar em cada uma das 6 camadas.                     |
| `framework/02-playbook-brasil.md`  | LGPD, WhatsApp, entregabilidade e cultura B2B do Brasil.       |
| `framework/03-formato-do-relatorio.md` | A estrutura exata do relatório de saída.                   |
| `framework/04-modo-conversa.md`    | Como agir nos follow-ups: produzir campanhas, adaptar à infra. |

## Estrutura do projeto

```
roboavaliador/
├─ server.js               # Express + streaming da API da Claude (endpoint /api/chat)
├─ framework/              # O "cérebro": expertise em Markdown, editável sem reiniciar
├─ public/
│  ├─ index.html           # Formulário + thread de conversa
│  ├─ app.js               # Lógica de streaming e conversa (sem dependências externas)
│  ├─ styles.css
│  └─ buildPrompt.js       # Monta o brief e o system prompt (usado por servidor E navegador)
└─ .env                    # Sua chave e configuração (não versionado)
```

## Como usar com os 40 clientes

Rode uma auditoria por cliente e compare os vereditos. Se o gargalo nº 1 se repetir em vários (ex.: "sem métricas por etapa" ou "provável problema de entregabilidade"), você achou a falha **sistêmica** da operação — corrija isso antes de otimizar campanha por campanha.

## Custo e privacidade

Cada auditoria é uma chamada à API da Anthropic (você paga pelos tokens). Os dados do cliente vão para a API da Anthropic apenas no momento da auditoria; nada é armazenado por esta aplicação.
