// Monta o prompt de sistema (o "cérebro" / framework) e o prompt do usuário
// (o brief com os dados de um cliente). Este módulo roda TANTO no servidor
// (Node) quanto no navegador — por isso não usa nenhuma API específica de Node.

export function buildSystemPrompt(frameworkText) {
  return `${frameworkText}

---

A PRIMEIRA mensagem do usuário traz os dados de UM cliente da agência Belgos, separados em blocos qualitativos e quantitativos. Produza o relatório de auditoria seguindo EXATAMENTE o formato definido acima, começando pelo "Veredito em 30 segundos", sem preâmbulo.

As mensagens SEGUINTES são uma conversa de iteração: o dono da operação vai pedir para você adaptar, reescrever e produzir campanhas conforme a infraestrutura e as restrições reais dele. A partir do segundo turno, comporte-se conforme a seção "Modo conversa": entregue artefatos completos, adapte às restrições e mantenha a disciplina do funil. Responda sempre em português do Brasil, em Markdown.`;
}

function clean(value) {
  return (value ?? "").toString().trim();
}

function field(label, value) {
  const v = clean(value);
  return `### ${label}\n${v || "_(não fornecido)_"}\n`;
}

// Métrica quantitativa por etapa: mostra o número ou "—" quando ausente.
function metricRow(label, value) {
  const v = clean(value);
  return `- **${label}:** ${v || "—"}`;
}

export function buildUserPrompt(intake = {}) {
  const stepKeys = [
    "q_sent",
    "q_delivered",
    "q_opened",
    "q_replied",
    "q_positive",
    "q_meetings",
    "q_bounce",
    "q_spam",
  ];
  const hasStepMetrics =
    stepKeys.some((k) => clean(intake[k])) || clean(intake.metricsNotes);
  const hasInfra = Boolean(clean(intake.infra));

  const lacunas = [];
  if (!hasStepMetrics) lacunas.push("métricas por etapa");
  if (!hasInfra) lacunas.push("infraestrutura / entregabilidade");

  const cabecalho =
    lacunas.length > 0
      ? `> **Observação do sistema:** o usuário NÃO forneceu dados de: ${lacunas.join(
          " e ",
        )}. Trate essas lacunas como achado prioritário, conforme o método.\n`
      : `> **Observação do sistema:** o usuário forneceu métricas por etapa e dados de infraestrutura. Aproveite os números.\n`;

  const partes = [];

  partes.push(
    `# Brief do cliente — ${clean(intake.clientName) || "(sem nome)"}\n`,
  );
  partes.push(cabecalho);

  // ---------- Bloco qualitativo ----------
  partes.push(`## Dados qualitativos\n`);
  partes.push(field("Setor / indústria do cliente", intake.sector));
  partes.push(field("CPC — Conhecimento Profundo do Cliente", intake.cpc));
  partes.push(field("ICP — Perfil de Cliente Ideal", intake.icp));
  partes.push(field("Oferta / proposta de valor", intake.offer));
  partes.push(field("Sequência(s) de email (copy real)", intake.emailSeq));
  partes.push(
    field("Mensagens / sequência de WhatsApp (copy real)", intake.waSeq),
  );
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
  partes.push(field("Landing page — URL", intake.lpUrl));
  partes.push(field("Landing page — conteúdo / HTML / texto", intake.lpContent));
  partes.push(field("Amostra de leads", intake.leads));
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

  const funil = [
    metricRow("Enviados", intake.q_sent),
    metricRow("Entregues", intake.q_delivered),
    metricRow("Abertos", intake.q_opened),
    metricRow("Respondidos", intake.q_replied),
    metricRow("Respostas positivas", intake.q_positive),
    metricRow("Reuniões agendadas", intake.q_meetings),
    metricRow("Taxa de bounce", intake.q_bounce),
    metricRow("Taxa de reclamação de spam", intake.q_spam),
  ].join("\n");
  partes.push(`### Funil por etapa\n${funil}\n`);

  partes.push(
    field("Outras métricas / números (texto livre)", intake.metricsNotes),
  );
  partes.push(
    field(
      "Infraestrutura & entregabilidade (domínios, SPF/DKIM/DMARC, warmup, ferramenta de envio, volume/dia)",
      intake.infra,
    ),
  );

  // Panorama da operação (contexto agregado dos clientes)
  if (clean(intake.q_clientsTotal) || clean(intake.q_clientsWorking)) {
    partes.push(`## Panorama da operação\n`);
    partes.push(
      `${metricRow("Total de clientes na operação", intake.q_clientsTotal)}\n${metricRow(
        "Clientes com a estratégia funcionando",
        intake.q_clientsWorking,
      )}\n`,
    );
  }

  return partes.join("\n");
}
