// Monta o prompt de sistema (o "cérebro" / framework) e o prompt do usuário
// (o brief com os dados de um cliente). Este módulo roda TANTO no servidor
// (Node) quanto no navegador — por isso não usa nenhuma API específica de Node.

export function buildSystemPrompt(frameworkText) {
  return `${frameworkText}

---

A PRIMEIRA mensagem do usuário traz os dados de UM cliente da agência Belgos (ou um pedido de análise especial, conforme o método). Para auditoria de cliente, produza o relatório seguindo EXATAMENTE o formato definido acima, começando pelo "Veredito em 30 segundos", sem preâmbulo.

As mensagens SEGUINTES são uma conversa de iteração: o dono da operação vai pedir para você adaptar, reescrever e produzir campanhas conforme a infraestrutura e as restrições reais dele. A partir do segundo turno, comporte-se conforme a seção "Modo conversa": entregue artefatos completos, adapte às restrições e mantenha a disciplina do funil. Responda sempre em português do Brasil, em Markdown.`;
}

function clean(value) {
  return (value ?? "").toString().trim();
}

function field(label, value) {
  const v = clean(value);
  return `### ${label}\n${v || "_(não fornecido)_"}\n`;
}

// Métrica quantitativa: mostra o número ou "—" quando ausente.
function metricRow(label, value) {
  const v = clean(value);
  return `- **${label}:** ${v || "—"}`;
}

const SCOPE_LABELS = {
  oferta: "Oferta / ICP / CPC",
  lista: "Lista & leads",
  emails: "Copy & sequência de emails",
  whatsapp: "WhatsApp",
  prompt1a1: "Prompt de geração de conteúdo 1:1",
  automacoes: "Automações & lead scoring",
  lp: "Landing page",
  metricas: "Métricas & medição",
  infra: "Domínios, DNS & entregabilidade",
};

// ---------- blocos compostos ----------

function lpsBlock(lps) {
  const list = (Array.isArray(lps) ? lps : []).filter(
    (lp) => clean(lp?.name) || clean(lp?.url) || clean(lp?.content),
  );
  if (list.length === 0) {
    return `### Landing pages\n_(nenhuma fornecida)_\n`;
  }
  const parts = [`### Landing pages (${list.length})\n`];
  list.forEach((lp, i) => {
    parts.push(
      [
        `**LP ${i + 1}: ${clean(lp.name) || "(sem identificador)"}**`,
        `- URL: ${clean(lp.url) || "—"}`,
        `- Conteúdo:`,
        clean(lp.content) || "_(conteúdo não fornecido)_",
        ``,
      ].join("\n"),
    );
  });
  return parts.join("\n");
}

const CHANNEL_LABELS = { email: "email", whatsapp: "WhatsApp" };

function dispatchRowsBlock(rows) {
  const list = (Array.isArray(rows) ? rows : []).filter((r) =>
    Object.values(r || {}).some((v) => clean(v)),
  );
  if (list.length === 0) return "";

  // agrupa por estratégia, preservando a ordem de entrada
  const groups = new Map();
  for (const r of list) {
    const key = clean(r.strategy) || "(estratégia não informada)";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const parts = [`### Métricas detalhadas por estratégia e disparo\n`];
  for (const [strategy, group] of groups) {
    parts.push(`**Estratégia: ${strategy}**`);
    for (const r of group) {
      const canal = CHANNEL_LABELS[clean(r.channel)] || clean(r.channel) || "—";
      const cells = [
        `enviados ${clean(r.sent) || "—"}`,
        `entregues ${clean(r.delivered) || "—"}`,
        `abertos/lidas ${clean(r.opened) || "—"}`,
        `respostas ${clean(r.replied) || "—"}`,
        `positivas ${clean(r.positive) || "—"}`,
        `reuniões ${clean(r.meetings) || "—"}`,
      ].join(" | ");
      const obs = clean(r.notes) ? ` | obs: ${clean(r.notes)}` : "";
      parts.push(
        `- Disparo ${clean(r.dispatch) || "?"} (${canal}): ${cells}${obs}`,
      );
    }
    parts.push("");
  }
  return parts.join("\n");
}

// ---------- brief principal ----------

export function buildUserPrompt(intake = {}, { mode = "auditoria" } = {}) {
  const emailTotalsKeys = [
    "q_sent",
    "q_delivered",
    "q_opened",
    "q_replied",
    "q_positive",
    "q_meetings",
    "q_bounce",
    "q_spam",
  ];
  const waTotalsKeys = [
    "wa_sent",
    "wa_delivered",
    "wa_read",
    "wa_replied",
    "wa_positive",
    "wa_meetings",
    "wa_blocks",
    "wa_banned",
  ];
  const dispatchRows = Array.isArray(intake.dispatchRows)
    ? intake.dispatchRows
    : [];
  const hasStepMetrics =
    emailTotalsKeys.some((k) => clean(intake[k])) ||
    waTotalsKeys.some((k) => clean(intake[k])) ||
    dispatchRows.some((r) => Object.values(r || {}).some((v) => clean(v))) ||
    clean(intake.metricsNotes);
  const hasInfra = Boolean(clean(intake.infra));

  const isPrevoo = mode === "prevoo";

  // No pré-voo, ausência de métricas é esperada (a campanha nem foi disparada).
  const lacunas = [];
  if (!hasStepMetrics && !isPrevoo) lacunas.push("métricas por etapa");
  if (!hasInfra) lacunas.push("infraestrutura / entregabilidade");

  const cabecalho =
    lacunas.length > 0
      ? `> **Observação do sistema:** o usuário NÃO forneceu dados de: ${lacunas.join(
          " e ",
        )}. Trate essas lacunas como achado prioritário, conforme o método.\n`
      : isPrevoo
        ? ""
        : `> **Observação do sistema:** o usuário forneceu métricas e dados de infraestrutura. Aproveite os números.\n`;

  const partes = [];

  partes.push(
    `# ${isPrevoo ? "Pré-voo (campanha ainda NÃO disparada)" : "Brief do cliente"} — ${clean(intake.clientName) || "(sem nome)"}\n`,
  );
  if (isPrevoo) {
    partes.push(
      `> **MODO PRÉ-VOO:** a campanha abaixo AINDA NÃO FOI DISPARADA. Não audite resultados — faça a validação preditiva conforme a seção "Pré-voo" do método: veredito GO/NO-GO, riscos ranqueados, ajustes obrigatórios antes do disparo, varredura de spam e plano de ramp-up.\n`,
    );
  }

  // Modo de operação declarado pelo usuário
  const isRd = clean(intake.opMode) === "rdstation";
  if (isRd) {
    partes.push(
      `> **MODO DE OPERAÇÃO: RD STATION.** Toda a operação roda dentro da RD Station (leads já na base — inclusive de prospecção —, emails standalone, fluxos por estágio e lead scoring). Aplique a seção "Modo RD Station" do método. A escolha da plataforma é um DADO: não julgue se a RD é a ferramenta certa — otimize dentro dela.\n`,
    );
  }
  if (cabecalho) partes.push(cabecalho);

  // Escopo selecionado pelo usuário (checkboxes). Vazio ou completo = funil todo.
  const allScopes = Object.keys(SCOPE_LABELS);
  const scope = Array.isArray(intake.scope)
    ? intake.scope.filter((s) => allScopes.includes(s))
    : [];
  if (scope.length > 0 && scope.length < allScopes.length) {
    const dentro = scope.map((s) => `**${SCOPE_LABELS[s]}**`).join(", ");
    const fora = allScopes
      .filter((s) => !scope.includes(s))
      .map((s) => SCOPE_LABELS[s])
      .join(", ");
    partes.push(
      `> **Escopo desta auditoria (selecionado pelo usuário):** analise a fundo APENAS: ${dentro}. Fora do escopo (${fora}): siga a regra de escopo restrito do método — sem seção completa, apenas alerta curto se os dados indicarem problema crítico acima no funil.\n`,
    );
  }

  // ---------- Bloco qualitativo ----------
  partes.push(`## Dados qualitativos\n`);
  partes.push(field("Setor / indústria do cliente", intake.sector));
  partes.push(field("CPC — Conhecimento Profundo do Cliente", intake.cpc));
  partes.push(
    field(
      "ICP(s) — Perfil(is) de Cliente Ideal (pode haver mais de um)",
      intake.icp,
    ),
  );
  partes.push(field("Oferta / proposta de valor", intake.offer));
  partes.push(
    field(
      "Estratégias em uso (nome, canal, ICP alvo, LP usada, lógica da sequência)",
      intake.strategies,
    ),
  );
  partes.push(field("Sequência(s) de email (copy real)", intake.emailSeq));
  partes.push(
    field(
      "Exemplos de emails enviados (importados de planilha — cada registro é um email; quando houver colunas, são partes/parágrafos do mesmo email)",
      intake.emailSheet,
    ),
  );
  partes.push(
    field("Mensagens / sequência de WhatsApp (copy real)", intake.waSeq),
  );
  partes.push(
    field(
      "Exemplos de mensagens de WhatsApp enviadas (importados de planilha)",
      intake.waSheet,
    ),
  );

  // Fluxos de automação e scoring (modo RD Station — ou quando preenchidos)
  const rdCampos = [
    ["Fluxo(s) de ATENÇÃO — topo (gatilhos, emails, delays, condições)", intake.flowAttention],
    ["Fluxo(s) de CONSIDERAÇÃO — meio", intake.flowConsideration],
    ["Fluxo(s) de DECISÃO — fundo", intake.flowDecision],
    ["Racional da jornada (critérios de transição entre estágios, papel do standalone vs. fluxo, handoff para vendas)", intake.flowRationale],
    ["Régua de lead scoring (perfil, interesse, pontos, threshold de MQL e o que acontece ao atingi-lo)", intake.leadScoring],
  ];
  if (isRd || rdCampos.some(([, v]) => clean(v))) {
    partes.push(`### Automações & lead scoring${isRd ? " (RD Station)" : ""}\n`);
    for (const [label, value] of rdCampos) partes.push(field(label, value));
  }
  partes.push(
    field(
      "Produção do conteúdo 1:1 — modelo de IA usado",
      intake.genModel,
    ),
  );
  partes.push(
    field(
      "Produção do conteúdo 1:1 — prompt de geração usado hoje (na íntegra)",
      intake.genPrompt,
    ),
  );
  partes.push(lpsBlock(intake.lps));
  partes.push(field("Amostra de leads (colada manualmente)", intake.leads));
  partes.push(
    field(
      "Amostra de leads (importada de planilha — cada registro é um lead)",
      intake.leadsSheet,
    ),
  );
  partes.push(
    field(
      "Histórico de campanhas — o que já foi feito e resultados",
      intake.history,
    ),
  );
  partes.push(field("Observações adicionais", intake.notes));

  // ---------- Bloco quantitativo ----------
  partes.push(`## Dados quantitativos\n`);
  partes.push(field("Período de referência dos números", intake.q_period));

  const funilEmail = [
    metricRow("Enviados", intake.q_sent),
    metricRow("Entregues", intake.q_delivered),
    metricRow("Abertos", intake.q_opened),
    metricRow("Cliques", intake.q_clicks),
    metricRow("Respondidos", intake.q_replied),
    metricRow("Respostas positivas", intake.q_positive),
    metricRow("Reuniões agendadas", intake.q_meetings),
    metricRow("Descadastros", intake.q_unsub),
    metricRow("Taxa de bounce", intake.q_bounce),
    metricRow("Taxa de reclamação de spam", intake.q_spam),
  ].join("\n");
  partes.push(`### Totais gerais — email\n${funilEmail}\n`);

  const funilWa = [
    metricRow("Enviadas", intake.wa_sent),
    metricRow("Entregues", intake.wa_delivered),
    metricRow("Lidas", intake.wa_read),
    metricRow("Respondidas", intake.wa_replied),
    metricRow("Respostas positivas", intake.wa_positive),
    metricRow("Reuniões agendadas", intake.wa_meetings),
    metricRow("Bloqueios / denúncias", intake.wa_blocks),
    metricRow("Números banidos", intake.wa_banned),
  ].join("\n");
  partes.push(`### Totais gerais — WhatsApp\n${funilWa}\n`);

  const detalhado = dispatchRowsBlock(dispatchRows);
  if (detalhado) partes.push(detalhado);

  partes.push(
    field("Outras métricas / números (texto livre)", intake.metricsNotes),
  );
  partes.push(
    field(
      "Infraestrutura & entregabilidade (domínios, SPF/DKIM/DMARC, warmup, ferramenta de envio, volume/dia)",
      intake.infra,
    ),
  );

  if (isRd || clean(intake.rdConfig)) {
    partes.push(
      field(
        "Configuração na RD Station (autenticação de domínio, origem/validação da base, volume, frequência, régua de supressão)",
        intake.rdConfig,
      ),
    );
  }

  // Verificações DNS feitas pela própria ferramenta (evidência real, não relato)
  const dnsChecks = (Array.isArray(intake.dnsChecks) ? intake.dnsChecks : [])
    .map((d) => clean(d?.text))
    .filter(Boolean);
  if (dnsChecks.length > 0) {
    partes.push(
      `### Verificação automática de DNS/entregabilidade (consulta DNS real feita pela ferramenta — evidência ✅ confirmada)\n${dnsChecks.join("\n\n")}\n`,
    );
  }

  return partes.join("\n");
}
