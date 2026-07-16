# HANDOFF ◆ Contexto completo da sessão Belgos

Este pacote existe para transferir TODA a janela de contexto desta sessão do Claude Code
para qualquer outra conta ou sessão. Está tudo neste repositório, no branch
`claude/belgos-campaign-audit-0uftrh`.

**Como usar em outra conta do Claude Code:** abra uma sessão nova neste repositório
(a conta precisa de acesso ao GitHub `BelgosBrazil/roboavaliador`) e diga:

> Leia handoff/HANDOFF.md e continue de onde a sessão anterior parou.

(Existe também uma transcrição completa da conversa, `conversa.md`, entregue ao dono do
projeto como arquivo à parte. Se ela estiver nesta pasta, leia também.)

---

## 1. Regras permanentes (o dono do projeto pediu e valem sempre)

1. Toda comunicação e todo texto de entrega em português do Brasil, linguagem humana e natural.
2. **Nunca usar travessões** em nenhum texto de copy (vídeo, site, emails, roteiro). Usar vírgula, dois pontos ou ponto final.
3. Tom: caloroso, direto, de dono para cliente. Sem pressa, sem jargão vazio.
4. Desenvolver, commitar e dar push SOMENTE no branch `claude/belgos-campaign-audit-0uftrh`. Nunca criar pull request sem pedido explícito.
5. Nunca commitar chave de API. O `.env` está no `.gitignore`. Para rodar o app, o usuário configura a própria `ANTHROPIC_API_KEY`.

## 2. O que é o projeto

**Roboavaliador** (código na raiz deste repo): IA da Belgos que audita campanhas de
prospecção de ponta a ponta. Brief completo do cliente, planilhas de emails, WhatsApp e leads,
métricas por disparo, modo RD Station (fluxos por etapa do funil e lead scoring), verificação
de DNS ao vivo (SPF, DKIM, DMARC, MX), auditoria em ordem de funil com evidência e priorização
por impacto, relatório com veredito em 30 segundos, causa raiz e emails reescritos, PDF
executivo, pré-voo GO/NO-GO e melhoria contínua.

Rodar: `npm install`, criar `.env` com `ANTHROPIC_API_KEY`, `npm start`, abrir `http://localhost:3000`.

**Belgos AI** é a marca da empresa (site em `site/index.html`). Contatos usados no site:
`contato@belgos.co`, WhatsApp `+55 11 96169 4033` (links `wa.me/5511961694033`).

## 3. Estado das entregas

| Entrega | Estado |
|---|---|
| App Roboavaliador (repo raiz) | Entregue e iterado várias vezes (brief guiado, importação xlsx/csv, escopos opt-in, DNS, pré-voo, biblioteca de vencedores, PDF, clientes salvos, histórico) |
| Vídeo v1 (1min11s, sem áudio) | Entregue (`handoff/media/roboavaliador-apresentacao-v1.mp4`) |
| Vídeo v2 (2min13s, com trilha, telas reais do app) | Entregue (`handoff/media/roboavaliador-apresentacao-v2.mp4`) |
| Roteiro de locução com tempos | Entregue (`handoff/roteiro-locucao.md`) |
| Site novo belgos.co | Entregue (`site/index.html`, arquivo único, tema escuro/claro) |
| Upgrade do site (globo 3D, revops, exemplos profundos) | Entregue, implementado conforme a spec da seção 5 |

**Pendência aguardando o usuário:** ele vai gravar a locução seguindo o roteiro e mandar o
arquivo de áudio. Aí é mixar por cima da trilha do vídeo v2, ajustando os tempos (seção 7).

## 4. O site atual (`site/index.html`)

Arquivo único, sem dependência externa (fontes woff2 embutidas em base64: Bricolage, Archivo,
Plex Mono). Tema padrão preto premium com violeta elétrico (`--acc: #7a5cff`), tema claro
alternável no botão `◐`, persistido em `localStorage["belgos-site-theme"]`.

Estrutura: preloader com contagem T-menos, nav fixa, trilho lateral de progresso T-06 a GO,
hero com canvas `#radar` (radar 2D varrendo blips), marquee, `#manifesto` (frases reveladas),
`#como` (checklist T-04 a T-01 que arma no scroll), `#motor` (cockpit digitando email 1:1,
3 leads), `#agente` (chat simulado com qualificação), `#robo` (console do pré-voo com carimbo
GO), `#produtos` (5 linhas), `#fit`, `#processo`, `#difs`, `#cta`, footer com wordmark gigante.
Cursor custom, cartões com tilt 3D, botões magnéticos, parallax no hero, marquee com velocidade
ligada ao scroll. `prefers-reduced-motion` respeitado em tudo.

## 5. Upgrade do site (IMPLEMENTADO; a spec abaixo descreve o que existe no código)

Pedido do usuário, na íntegra da intenção: animações muito mais fortes e incríveis, exemplos
de mensagem muito mais profundos (nível sobre-humano), a parte de Agentes de IA e RevOps
muito mais profunda e ultra madura, algo 3D ou 4D incrível, impactante e inesquecível na
mente do lead. Liberdade criativa para o que mais for relevante.

**Estado:** tudo implementado e validado com screenshots (Playwright). O que segue é a
descrição fiel do que está no `site/index.html`.

### 5.1 O que foi construído

**A. Hero 3D: globo de sinais** (substitui o radar 2D no mesmo canvas `#radar`, ~720 pontos
em esfera de Fibonacci, canvas 2D com projeção perspectiva, sem WebGL):
meridianos e paralelos wireframe com alpha por profundidade, ~30 pontos alvo em violeta que
pingam quando a varredura passa, arcos entre alvos com cometa viajando (slerp com lift),
anel orbital inclinado com 3 satélites, poeira de fundo em drift. Interação: mouse gira o
globo (yaw/tilt com easing), velocidade de scroll acelera a rotação (o efeito 4D: tempo
reage ao usuário). Pausar desenho quando `scrollY > innerHeight * 1.25` ou `document.hidden`.
Mobile: ~340 pontos, raio menor. Tema claro: tinta escura via helper `ink()`/`acc()`.

**B. Títulos com decodificação (scramble):** classe `.scr` nos `h2` das seções; ao entrar
(IntersectionObserver, threshold 0.6), caracteres aleatórios de `"◆◇▮▯░▒/\\+×<>01"` resolvem
da esquerda para a direita em ~0.9s. Travar `min-height` durante o efeito para não pular layout.

**C. Cartões premium:** manter tilt (subir para rotateX 5.5deg / rotateY 6.5deg) e adicionar
brilho especular: elemento `.shine` injetado via JS em cada `.tiltcard`, radial-gradient
violeta seguindo o ponteiro via CSS vars `--gx/--gy`, opacidade no hover. `.tiltcard` precisa
de `position: relative`.

**D. Manifesto palavra a palavra:** JS divide cada `#manifesto .ml > span` em
`<span class="w">palavra</span>` com `transition-delay: i*55ms`. CSS já aplicado no commit.

**E. CTA com letras magnéticas:** dividir o `h2` do `#cta` em palavras `.wd` (nowrap) e letras
`.ch`; loop raf enquanto a seção está visível: letras perto do cursor sobem até 42px com
leve rotação (lerp 0.16), medindo posições base uma vez (recalcular no resize), nunca ler
getBoundingClientRect de elemento já transformado a cada frame.

**F. Footer farol:** no wordmark BELGOS AI, gradiente violeta revelado na posição x do cursor
(classe `.lit` + CSS var `--fx`, background-clip: text por cima do text-stroke).

**G. Emails do cockpit em profundidade sobre-humana** (substituir array `leads` no JS; chips
viram evidência com fonte do sinal). Copy pronta, usar exatamente esta (sem travessões):

Lead 1, chips: `Mariana Duarte ◆ sócia`, `Duarte & Camargo ◆ 34 advogados`,
`sinal: 2 vagas trabalhistas abertas`, `fonte: diários oficiais + vagas`:
> Mariana, cruzei dois dados públicos sobre a Duarte & Camargo: o contencioso trabalhista de
> vocês dobrou em 12 meses e o escritório abriu 2 vagas para trabalhista na mesma semana.
> Crescimento assim costuma cobrar um preço silencioso: hora trabalhada que não vira fatura.
> Em escritórios de 30 a 40 advogados, o vazamento típico é de 3h por advogado por semana.
> No seu caso, algo perto de R$ 180 mil por ano escorrendo pelo registro.
> Tenho um diagnóstico de 30 minutos que mostra onde isso acontece no seu fluxo. Te mando
> dois horários na quinta ou prefere sexta de manhã?

Lead 2, chips: `Renata Kim ◆ diretora comercial`, `LogBr ◆ 120 veículos`,
`sinal: cotação só por formulário`, `tech: RD Station detectado`:
> Renata, pedi uma cotação no site da LogBr na terça às 9h41. A resposta chegou 26 horas
> depois, educada e completa. O problema: nesse mercado, 78% das cargas fecham com quem
> responde primeiro. Vocês já rodam RD Station, então dá para resolver sem trocar nada:
> um fluxo que responde a cotação em 15 minutos e reativa as que esfriaram em 48h.
> Posso te mostrar o desenho exato com a sua operação na tela, em 20 minutos.
> Quarta 10h ou quinta 16h?

Lead 3, chips: `Paulo Mendes ◆ sócio`, `TechFlow ◆ ERP industrial`,
`sinal: estande na Mercopar`, `evento: 400+ leads de feira`:
> Paulo, vi a TechFlow na Mercopar. Estande cheio, provavelmente 400 leads ou mais no crachá.
> Agora vem a parte que ninguém fala: lead de feira morre em 9 dias se ninguém conversa com
> ele, e o seu time está ocupado fechando o trimestre. A gente coloca um agente para retomar
> cada conversa da feira, um a um, com contexto do que a pessoa viu no estande, e agenda
> direto para os seus vendedores. Se 10% virarem reunião, são 40 conversas qualificadas
> saindo de um custo que você já pagou. Vale 20 minutos essa semana?

Destacar com `<b class="var">` os dados citados. Aumentar `min-height` do corpo do cockpit
para ~380px e acelerar a digitação para 11ms por passo.

**H. Chat do agente maduro** (substituir `script` no JS; tratamento de objeção de preço,
qualificação e agendamento):
1. lead: "Oi! Recebi o email sobre a LogBr. Quanto custa isso?"
2. bot: "Oi, Marcos! Vou direto ao ponto: o valor depende do desenho da operação, e eu não quero te dar um número no chute. Posso te fazer três perguntas rápidas pra chegar num número honesto?"
3. lead: "Pode."
4. bot: "Hoje quem prospecta são os próprios vendedores ou vocês têm SDR dedicado?"
5. lead: "Os vendedores mesmo. E rende pouco, pra ser sincero"
6. bot: "É o padrão que mais vemos: vendedor bom de fechamento é caro demais pra passar o dia prospectando. Última pergunta: quantas reuniões novas por mês mudariam o trimestre de vocês?"
7. lead: "Umas 12 já mudariam o jogo"
8. bot: "Então faz sentido continuar. Com essa meta, o investimento normalmente se paga com 1 contrato fechado. Te passo dois horários com o especialista e já deixo um diagnóstico do seu funil preparado. Quinta 10:30 ou sexta 15h?"
9. lead: "Quinta 10:30"

Status final: `✓ qualificado ◆ dor mapeada ◆ reunião marcada`. Depois do status, revelar um
cartão de handoff dentro do chat (`.handoff`, borda tracejada violeta):
título `handoff para o vendedor ◆ contexto completo` e tags
`decisor: confirmado ✓`, `dor: vendedor prospectando`, `meta: 12 reuniões/mês`,
`janela: este trimestre`, `próximo passo: demo qui 10:30`.
Subir `min-height` do corpo do chat para ~430px.

**I. Seção nova `#revops` (Agentes de IA e RevOps), inserir entre `#produtos` e `#fit`,
idx 06, renumerando fit 07, processo 08, difs 09.** Conteúdo:

1. Intro grande: "Receita não é um departamento. É um sistema. A gente constrói os dois
   lados dele: agentes que executam trabalho de verdade nos seus sistemas e a engenharia
   de operações que torna o número confiável." (destaques em gradiente violeta)
2. Três pilares (cards com hover que levanta e linha de acento no topo):
   AG 01 Agentes que executam (não é chatbot de FAQ; acesso governado; SDR digital,
   Auditor de campanha: o Roboavaliador nasceu aqui, Copiloto de CRM);
   RV 02 Receita instrumentada (dado confiável, funil com dono, critério escrito de
   passagem por etapa, CRM fonte única, forecast que a diretoria assina embaixo);
   GV 03 Governança de gente grande (permissão mínima, aprovação humana nos pontos
   críticos, trilha de auditoria completa, LGPD by design).
3. Painel "operação ao vivo": console `.ops` estilo terminal com linhas chegando em ciclo
   (grid hora + tag do ator + texto; tags: agente violeta, humano verde, sistema cinza).
   Feed pronto: detectou sinal LogBr abriu 2 vagas de vendedor; escreveu email 1:1 e enviou
   para aprovação; humano aprovou o envio; email entregue SPF DKIM DMARC verificados;
   criou oportunidade no CRM etapa conexão dono Camila; higiene 214 contatos duplicados
   normalizados; resposta positiva de M. Duarte propôs dois horários; reunião confirmada
   qui 10:30; pré-voo da campanha outubro GO 0 riscos críticos; flag DMARC em p=none
   correção sugerida; humano ajustou tom do playbook jurídico versão 14; aprendizado CTA
   com dois horários responde 31% mais. Ao lado, texto "Trabalho de verdade deixa trilha"
   explicando log, aprovação e playbook versionado.
4. Esteira do agente: SVG full-width com 5 nós (SINAL, DECISÃO, AÇÃO, LOG, APRENDIZADO),
   linha principal que se desenha ao entrar e pacotes (pontos violeta com halo) viajando
   via `getPointAtLength`; caminho de retorno tracejado com pacotes voltando e legenda
   "aprendizado volta para o playbook". Overflow-x auto no mobile.
5. Régua de maturidade M1 a M4: 4 segmentos que preenchem em cascata, pino pulsante em ~26%
   com "a maioria das operações B2B vive aqui". M1 heróica (planilha, memória, surpresa no
   fim do mês), M2 instrumentada (CRM confiável, gargalo visível), M3 automatizada (rotina
   sem fricção, alertas de desvio), M4 agentic (agentes com governança, forecast que se
   sustenta).
6. KPIs com contadores ao entrar (atributo `data-kcount` separado dos contadores do hero):
   4x cobertura de pipeline; <10% desvio entre forecast e fechamento; 100% das ações de
   agente com log, evidência e responsável; 24/7 operação com aprovação humana nos pontos
   críticos.
7. Linha final estilo result-line: "Resultado: um sistema de receita auditável que melhora
   a cada ciclo." + link WhatsApp "quero isso na minha operação".

Extras da seção: generalizar seletores `#agente .feats/.feat` para `.feats/.feat`;
adicionar link `Agentes & RevOps` na nav apontando para `#revops`; na linha de produtos
"Agentes de IA e RevOps" adicionar link âncora "ver a prática completa"; marquee ganha
`FORECAST CONFIÁVEL` e `GOVERNANÇA HUMANA`.

**Qualidade:** tudo atrás de `prefers-reduced-motion`; contadores/feeds pausam fora da
viewport (IntersectionObserver); DPR limitado a 2; sem libs externas; arquivo único.
Iterar com screenshots via `handoff/pipeline/shots-site.mjs` (adicionar alvos do #revops)
e mandar prints para o usuário antes de fechar.

## 6. Pipelines e ambiente (tudo já validado nesta sessão)

**ffmpeg:** binário em
`/opt/node22/lib/node_modules/@ffmpeg-installer/ffmpeg/node_modules/@ffmpeg-installer/linux-x64/ffmpeg`.
Não existe ffprobe: duração se mede parseando o stderr de `ffmpeg -hide_banner -i` com regex
`Duration: (\d+):(\d+):(\d+\.\d+)`.

**Playwright:** Chromium pré-instalado em `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`). Nunca rodar `playwright install`.
Import: `/opt/node22/lib/node_modules/playwright/index.mjs`.

**Vídeo v2, como foi feito (reproduzível com os arquivos de `handoff/pipeline/`):**
1. `drive.mjs` dirige o app real (npm start antes) e grava `screen-main.webm` com telas
   pretas entre as tomadas; `screen-pdf.webm` gravado à parte.
2. `cut.py` detecta as telas pretas (`blackdetect=d=0.35:pix_th=0.02:pic_th=0.95`), pega os
   ÚLTIMOS 6 segmentos (o primeiro trecho é carregamento de página), na ordem A brief,
   E RD Station, B DNS, C auditoria, D scroll do relatório (+ F do pdf à parte), reencoda
   VP9 (`-crf 33 -b:v 0 -cpu-used 5`) com retiming por clipe (A ~24s, E ~8s, B tempo real,
   C montagem 6s + timelapse 5s + 4s, D ~12.5s, F ~9s) e imprime o array DUR sugerido.
3. `video2.html` é a timeline de 12 slides (legendas em português, sem travessões) que toca
   os clipes de `clips/`; expõe `window.__TOTAL` e `window.__START()`.
4. `record2.mjs` grava a timeline em 1280x720 para `master-raw.webm` (deixa 1.5s de preto
   no início para o corte por blackdetect).
5. `synth.py DURACAO saida.wav "t1,t2,..."` sintetiza a trilha (determinística, seed 7),
   com swells nas marcas de transição dos slides.
6. Mux final: cortar o preto inicial do master (blackdetect de novo) e
   `ffmpeg -i master.webm -i trilha -c:v libx264 -crf 21 -pix_fmt yuv420p -c:a aac -shortest saida.mp4`.

**Screenshots do site:** `shots-site.mjs`. Espera `document.fonts.ready`, classe `ready` no
body (15s timeout), 1600ms por seção e 6500ms no `#motor` (animação de digitação). Gera
matriz desk 1440x900 (todas as seções), light (robo, cta) e mobile 390x844.

## 7. Quando o áudio da locução chegar

1. Tempos alvo por fala: `handoff/roteiro-locucao.md`.
2. Caminho rápido (voz cabe nos tempos atuais): sobrepor a voz ao MP4 v2 com ducking da
   trilha: `ffmpeg -i roboavaliador-apresentacao-v2.mp4 -i voz.m4a -filter_complex "[0:a]volume=0.35[trl];[trl][1:a]amix=inputs=2:duration=first" -c:v copy saida.mp4`
   (ou sidechaincompress para ducking de verdade).
3. Caminho completo (ajustar os tempos das cenas à voz): editar o array `DUR` em
   `video2.html`, regravar com `record2.mjs`, regenerar a trilha com `synth.py` passando as
   novas marcas de transição e mixar trilha + voz no mux final.

## 8. Mapa do pacote

```
handoff/
  HANDOFF.md              este documento
  roteiro-locucao.md      roteiro de locução com tempos
  pipeline/               ferramentas validadas (vídeo, trilha, screenshots, demos)
    assets/               planilhas de demonstração usadas nas gravações do app
  media/
    roboavaliador-apresentacao-v2.mp4   vídeo atual para clientes (2min13s, com trilha)
    roboavaliador-apresentacao-v1.mp4   versão anterior (1min11s, sem áudio)
    clips/{a..f}.webm                   clipes cortados e retimados do app real
    screen-main.webm                    gravação bruta com telas pretas (permite recortar)
    screen-pdf.webm                     gravação bruta do popup de PDF
    trilha.m4a                          trilha sonora do v2 (regenerável com synth.py)
```

O código do app é o próprio repositório (raiz). O site é `site/index.html`.
