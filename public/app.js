import { buildUserPrompt } from "./buildPrompt.js";

// ---------- refs ----------
const form = document.getElementById("audit-form");
const runBtn = document.getElementById("run-btn");
const clearBtn = document.getElementById("clear-btn");
const thread = document.getElementById("thread");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const resultTools = document.getElementById("result-tools");
const copyBtn = document.getElementById("copy-btn");
const downloadBtn = document.getElementById("download-btn");
const statusEl = document.getElementById("status");
const modelSelect = document.getElementById("model-select");
const effortSelect = document.getElementById("effort-select");
const systemicBtn = document.getElementById("systemic-btn");
const clientSelect = document.getElementById("client-select");
const clientSaveBtn = document.getElementById("client-save");
const clientDeleteBtn = document.getElementById("client-delete");
const briefLabel = document.getElementById("brief-label");
const briefFill = document.getElementById("brief-fill");
const briefMissing = document.getElementById("brief-missing");
const auditSelect = document.getElementById("audit-select");
const auditDeleteBtn = document.getElementById("audit-delete");
const compareBtn = document.getElementById("compare-btn");
const backupExportBtn = document.getElementById("backup-export");
const backupImportBtn = document.getElementById("backup-import-btn");
const backupImportInput = document.getElementById("backup-import");
const lpList = document.getElementById("lp-list");
const lpAddBtn = document.getElementById("lp-add");
const rowsBody = document.getElementById("rows-body");
const rowAddBtn = document.getElementById("row-add");
const promptOptBtn = document.getElementById("prompt-opt-btn");
const clientVersionBtn = document.getElementById("client-version-btn");
const pdfBtn = document.getElementById("pdf-btn");
const preflightBtn = document.getElementById("preflight-btn");
const dnsDomain = document.getElementById("dns-domain");
const dnsSelector = document.getElementById("dns-selector");
const dnsCheckBtn = document.getElementById("dns-check-btn");
const dnsStatus = document.getElementById("dns-status");
const dnsResults = document.getElementById("dns-results");
const winnersBtn = document.getElementById("winners-btn");
const winnersModal = document.getElementById("winners-modal");
const winnersClose = document.getElementById("winners-close");
const winnerForm = document.getElementById("winner-form");
const winnerStatus = document.getElementById("winner-status");
const winnersList = document.getElementById("winners-list");
const helpBtn = document.getElementById("help-btn");
const helpModal = document.getElementById("help-modal");
const helpClose = document.getElementById("help-close");
const onboarding = document.getElementById("onboarding");
const onboardingDismiss = document.getElementById("onboarding-dismiss");
const toggleSecsBtn = document.getElementById("toggle-secs");
const resultDot = document.getElementById("result-dot");
const sections = [...document.querySelectorAll("details.sec")];

// ---------- estado ----------
let messages = []; // histórico da conversa {role, content}
let busy = false;
let currentAuditId = null; // auditoria em andamento (autosave)
let currentMeta = { clientId: "", clientName: "", scope: [], kind: "auditoria" };
let auditsCache = []; // lista de auditorias do cliente selecionado

const sheets = { emails: null, whatsapp: null, leads: null };
let dnsChecks = []; // resultados de verificações DNS { domain, overall, checks, text, checkedAt }

const MODEL_LABELS = {
  "claude-fable-5": "Fable 5 (máximo)",
  "claude-opus-4-8": "Opus 4.8 (padrão)",
  "claude-sonnet-5": "Sonnet 5 (rápido)",
};

const FUNNEL_STEPS = [
  "Infraestrutura & entregabilidade",
  "Lista & fit (ICP ↔ lista)",
  "Oferta & proposta de valor",
  "Copy & sequência",
  "Landing pages & conversão",
  "Medição & aprendizado",
];

function slugify(name) {
  const s = (name || "")
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || "cliente";
}

// ---------- toasts (notificações flutuantes) ----------
let toastWrap = null;
function toast(text, type = "info", ms = 3800) {
  if (!toastWrap) {
    toastWrap = document.createElement("div");
    toastWrap.className = "toast-wrap";
    document.body.appendChild(toastWrap);
  }
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  const ic = document.createElement("span");
  ic.className = "toast-ic";
  ic.textContent = type === "success" ? "✓" : type === "error" ? "!" : "•";
  const tx = document.createElement("span");
  tx.textContent = text;
  t.append(ic, tx);
  toastWrap.appendChild(t);

  let gone = false;
  const dismiss = () => {
    if (gone) return;
    gone = true;
    t.classList.add("toast-out");
    setTimeout(() => t.remove(), 250);
  };
  t.addEventListener("click", dismiss);
  setTimeout(dismiss, ms);
}

// Mantém a assinatura antiga: mensagens com ✓ viram sucesso, ⚠ viram erro.
function flash(msg, ms = 3800) {
  const type = /^⚠/.test(msg) ? "error" : /^✓/.test(msg) ? "success" : "info";
  toast(msg.replace(/^[✓⚠️️]+\s*/u, ""), type, ms);
}

// ---------- health + seletores de modelo/esforço ----------
fetch("/api/health")
  .then((r) => r.json())
  .then((h) => {
    for (const m of h.models || []) {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = MODEL_LABELS[m] || m;
      if (m === h.model) opt.selected = true;
      modelSelect.appendChild(opt);
    }
    for (const e of h.efforts || []) {
      const opt = document.createElement("option");
      opt.value = e;
      opt.textContent = e;
      if (e === h.effort) opt.selected = true;
      effortSelect.appendChild(opt);
    }
    statusEl.innerHTML = h.keyConfigured
      ? ""
      : `<span class="warn">⚠ ANTHROPIC_API_KEY não configurada</span>`;
  })
  .catch(() => {});

// ---------- clientes salvos ----------
async function loadClients(selectId) {
  try {
    const list = await (await fetch("/api/clients")).json();
    const current = selectId ?? clientSelect.value;
    clientSelect.innerHTML = `<option value="">— cliente novo (não salvo) —</option>`;
    for (const c of list) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      clientSelect.appendChild(opt);
    }
    clientSelect.value = current || "";
  } catch {
    /* servidor fora do ar */
  }
}

clientSelect.addEventListener("change", async () => {
  const id = clientSelect.value;
  await refreshAudits(id);
  if (!id) return;
  try {
    const c = await (await fetch(`/api/clients/${id}`)).json();
    fillForm(c.intake || {});
    flash(`✓ Cliente "${c.name}" carregado.`);
  } catch {
    flash("⚠️ Não consegui carregar este cliente.");
  }
});

clientSaveBtn.addEventListener("click", async () => {
  const intake = collectIntake();
  if (!intake.clientName?.trim()) {
    flash("⚠️ Preencha o nome do cliente antes de salvar.");
    return;
  }
  try {
    const saved = await (
      await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: intake.clientName, intake }),
      })
    ).json();
    if (saved.error) throw new Error(saved.error);
    await loadClients(saved.id);
    await refreshAudits(saved.id);
    flash(`✓ Cliente "${saved.name}" salvo.`);
  } catch (err) {
    flash(`⚠️ ${err.message}`);
  }
});

clientDeleteBtn.addEventListener("click", async () => {
  const id = clientSelect.value;
  if (!id) return flash("Selecione um cliente salvo para excluir.");
  const name = clientSelect.options[clientSelect.selectedIndex].textContent;
  if (!confirm(`Excluir o cliente salvo "${name}"? (as auditorias ficam no histórico)`)) return;
  await fetch(`/api/clients/${id}`, { method: "DELETE" });
  await loadClients("");
  await refreshAudits("");
  flash("Cliente excluído.");
});

// ---------- backup ----------
backupExportBtn.addEventListener("click", async () => {
  const data = await (await fetch("/api/backup")).json();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `belgos-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

backupImportBtn.addEventListener("click", () => backupImportInput.click());
backupImportInput.addEventListener("change", async () => {
  const file = backupImportInput.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const r = await (
      await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    ).json();
    if (r.error) throw new Error(r.error);
    await loadClients();
    await refreshAudits(clientSelect.value);
    flash(`✓ Backup importado: ${r.clients} cliente(s), ${r.audits} auditoria(s).`);
  } catch (err) {
    flash(`⚠️ ${err.message}`);
  } finally {
    backupImportInput.value = "";
  }
});

// ---------- histórico de auditorias ----------
async function refreshAudits(clientId) {
  auditsCache = [];
  auditSelect.innerHTML = `<option value="">— histórico de auditorias —</option>`;
  if (!clientId) {
    compareBtn.disabled = true;
    return;
  }
  try {
    auditsCache = await (await fetch(`/api/audits?clientId=${encodeURIComponent(clientId)}`)).json();
    for (const a of auditsCache) {
      const opt = document.createElement("option");
      opt.value = a.id;
      const d = new Date(a.updatedAt);
      const date = d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const kind = a.kind && a.kind !== "auditoria" ? ` [${a.kind}]` : "";
      opt.textContent = `${date}${kind} · ${a.turns} resposta(s) · ${a.snippet.slice(0, 60)}`;
      auditSelect.appendChild(opt);
    }
    const audCount = auditsCache.filter((a) => !a.kind || a.kind === "auditoria").length;
    compareBtn.disabled = audCount < 2;
  } catch {
    compareBtn.disabled = true;
  }
}

auditSelect.addEventListener("change", async () => {
  const id = auditSelect.value;
  if (!id || busy) return;
  try {
    const a = await (await fetch(`/api/audits/${id}`)).json();
    if (a.error) throw new Error(a.error);
    messages = a.messages || [];
    currentAuditId = a.id;
    currentMeta = {
      clientId: a.clientId,
      clientName: a.clientName,
      scope: a.scope || [],
      kind: a.kind || "auditoria",
    };
    const d = new Date(a.createdAt || a.updatedAt).toLocaleDateString("pt-BR");
    renderThreadFromMessages(messages, `Auditoria carregada · ${a.clientName} · ${d}`);
    flash("✓ Auditoria carregada — a conversa continua de onde parou.");
  } catch (err) {
    flash(`⚠️ ${err.message}`);
  }
});

auditDeleteBtn.addEventListener("click", async () => {
  const id = auditSelect.value;
  if (!id) return flash("Selecione uma auditoria no histórico para excluir.");
  if (!confirm("Excluir esta auditoria do histórico?")) return;
  await fetch(`/api/audits/${id}`, { method: "DELETE" });
  if (currentAuditId === id) currentAuditId = null;
  await refreshAudits(clientSelect.value);
  flash("Auditoria excluída.");
});

// ---------- comparação de evolução ----------
compareBtn.addEventListener("click", async () => {
  if (busy) return;
  const auds = auditsCache.filter((a) => !a.kind || a.kind === "auditoria");
  if (auds.length < 2) return;
  try {
    const [recente, anterior] = await Promise.all([
      (await fetch(`/api/audits/${auds[0].id}`)).json(),
      (await fetch(`/api/audits/${auds[1].id}`)).json(),
    ]);
    const rep = (a) => (a.messages || []).find((m) => m.role === "assistant")?.content || "(sem relatório)";
    const dt = (a) => new Date(a.createdAt || a.updatedAt).toLocaleDateString("pt-BR");
    const clientName = recente.clientName;
    const msg = [
      `# Comparação de evolução — ${clientName}`,
      ``,
      `Siga a seção "Comparação de evolução" do método.`,
      ``,
      `## Auditoria ANTERIOR (${dt(anterior)})`,
      rep(anterior),
      ``,
      `---`,
      ``,
      `## Auditoria MAIS RECENTE (${dt(recente)})`,
      rep(recente),
    ].join("\n");

    startConversation({
      clientId: recente.clientId,
      clientName,
      kind: "comparacao",
      scope: [],
    });
    runTurn(msg, { type: "chip", text: `Comparação de evolução · ${clientName}` }, true);
  } catch (err) {
    flash(`⚠️ ${err.message}`);
  }
});

// ---------- análise sistêmica da operação ----------
systemicBtn.addEventListener("click", async () => {
  if (busy) return;
  try {
    const overview = await (await fetch("/api/audits/overview")).json();
    if (!Array.isArray(overview) || overview.length < 2) {
      flash("⚠️ A análise da operação precisa de auditorias salvas de pelo menos 2 clientes.");
      return;
    }
    const excerpt = (report) => {
      const cut = report.split(/\n##\s*2/)[0];
      return (cut || report).slice(0, 2600);
    };
    const parts = [
      `# Análise sistêmica da operação — ${overview.length} clientes`,
      ``,
      `Siga a seção "Análise sistêmica da operação" do método. Abaixo, o veredito da auditoria mais recente de cada cliente:`,
      ``,
    ];
    for (const o of overview) {
      parts.push(`## ${o.clientName} (${new Date(o.date).toLocaleDateString("pt-BR")})`);
      parts.push(excerpt(o.report));
      parts.push("");
    }
    startConversation({
      clientId: "operacao",
      clientName: "Operação (todos os clientes)",
      kind: "analise-operacao",
      scope: [],
    });
    runTurn(parts.join("\n"), { type: "chip", text: `Análise sistêmica · ${overview.length} clientes` }, true);
  } catch (err) {
    flash(`⚠️ ${err.message}`);
  }
});

// ---------- planilhas (emails / whatsapp / leads) ----------
function wireSheet(slot) {
  const input = document.getElementById(`sheet-${slot}`);
  const status = document.getElementById(`sheet-${slot}-status`);
  const info = document.getElementById(`sheet-${slot}-info`);
  const remove = document.getElementById(`sheet-${slot}-remove`);

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    info.textContent = `Lendo ${file.name}…`;
    status.classList.remove("hidden");
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
      }
      const resp = await fetch("/api/parse-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, dataBase64: btoa(bin) }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || `Erro ${resp.status}`);
      sheets[slot] = { ...result, filename: file.name };
      info.textContent = `✓ ${file.name} — ${result.rows} registro(s) em ${result.sheets} aba(s). Incluída na auditoria.`;
      updateCounters();
    } catch (err) {
      sheets[slot] = null;
      input.value = "";
      info.textContent = `⚠️ ${err.message}`;
    }
  });

  remove.addEventListener("click", () => {
    sheets[slot] = null;
    input.value = "";
    status.classList.add("hidden");
    updateCounters();
  });
}
["emails", "whatsapp", "leads"].forEach(wireSheet);

function restoreSheet(slot, text) {
  const status = document.getElementById(`sheet-${slot}-status`);
  const info = document.getElementById(`sheet-${slot}-info`);
  if (text) {
    sheets[slot] = { text, filename: "(restaurada do cliente salvo)" };
    info.textContent = `✓ Planilha restaurada do cliente salvo. Incluída na auditoria.`;
    status.classList.remove("hidden");
  } else {
    sheets[slot] = null;
    status.classList.add("hidden");
  }
  updateCounters();
}

// ---------- landing pages (múltiplas) ----------
function addLpBlock(lp = {}) {
  const block = document.createElement("div");
  block.className = "lp-block";
  block.innerHTML = `
    <div class="lp-head">
      <input type="text" class="lp-name" placeholder="Identificador da LP (ex.: LP diagnóstico — ICP 1)" />
      <button type="button" class="ghost small lp-remove">✕</button>
    </div>
    <div class="lp-row">
      <input type="text" class="lp-url" placeholder="https://…" />
      <button type="button" class="ghost lp-fetch">Buscar</button>
    </div>
    <span class="hint lp-status"></span>
    <textarea class="lp-content" rows="4" placeholder="Conteúdo da LP (preenchido pelo Buscar, ou cole manualmente)"></textarea>
  `;
  block.querySelector(".lp-name").value = lp.name || "";
  block.querySelector(".lp-url").value = lp.url || "";
  block.querySelector(".lp-content").value = lp.content || "";

  block.querySelector(".lp-remove").addEventListener("click", () => {
    block.remove();
    if (!lpList.children.length) addLpBlock();
    updateCounters();
  });

  const fetchBtn = block.querySelector(".lp-fetch");
  const lpStatus = block.querySelector(".lp-status");
  fetchBtn.addEventListener("click", async () => {
    const url = block.querySelector(".lp-url").value.trim();
    if (!url) return (lpStatus.textContent = "Informe a URL primeiro.");
    fetchBtn.disabled = true;
    lpStatus.textContent = "Buscando a página…";
    try {
      const resp = await fetch("/api/fetch-lp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || `Erro ${resp.status}`);
      block.querySelector(".lp-content").value = result.text;
      lpStatus.textContent = `✓ Conteúdo extraído de ${result.finalUrl} — revise/edite abaixo.`;
    } catch (err) {
      lpStatus.textContent = `⚠️ ${err.message}`;
    } finally {
      fetchBtn.disabled = false;
    }
  });

  lpList.appendChild(block);
}

lpAddBtn.addEventListener("click", () => addLpBlock());

function collectLps() {
  return [...lpList.querySelectorAll(".lp-block")]
    .map((b) => ({
      name: b.querySelector(".lp-name").value.trim(),
      url: b.querySelector(".lp-url").value.trim(),
      content: b.querySelector(".lp-content").value.trim(),
    }))
    .filter((lp) => lp.name || lp.url || lp.content);
}

function fillLps(lps) {
  lpList.innerHTML = "";
  const list = Array.isArray(lps) && lps.length ? lps : [{}];
  list.forEach((lp) => addLpBlock(lp));
}

// ---------- métricas por estratégia/disparo ----------
const ROW_FIELDS = ["strategy", "dispatch", "channel", "sent", "delivered", "opened", "replied", "positive", "meetings", "notes"];

function addRow(values = {}) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input class="r-strategy" type="text" placeholder="Estratégia X" /></td>
    <td><input class="r-dispatch" type="text" placeholder="1" /></td>
    <td><select class="r-channel"><option value="email">email</option><option value="whatsapp">WhatsApp</option></select></td>
    <td><input class="r-sent" type="text" inputmode="numeric" /></td>
    <td><input class="r-delivered" type="text" inputmode="numeric" /></td>
    <td><input class="r-opened" type="text" inputmode="numeric" /></td>
    <td><input class="r-replied" type="text" inputmode="numeric" /></td>
    <td><input class="r-positive" type="text" inputmode="numeric" /></td>
    <td><input class="r-meetings" type="text" inputmode="numeric" /></td>
    <td><input class="r-notes" type="text" placeholder="obs." /></td>
    <td><button type="button" class="ghost small r-remove">✕</button></td>
  `;
  for (const f of ROW_FIELDS) {
    const el = tr.querySelector(`.r-${f}`);
    if (el && values[f] !== undefined) el.value = values[f];
  }
  tr.querySelector(".r-remove").addEventListener("click", () => {
    tr.remove();
    updateCounters();
  });
  rowsBody.appendChild(tr);
}

rowAddBtn.addEventListener("click", () => addRow());

function collectRows() {
  return [...rowsBody.querySelectorAll("tr")]
    .map((tr) => {
      const row = {};
      for (const f of ROW_FIELDS) row[f] = tr.querySelector(`.r-${f}`)?.value?.trim() || "";
      return row;
    })
    .filter((r) => Object.entries(r).some(([k, v]) => k !== "channel" && v));
}

function fillRows(rows) {
  rowsBody.innerHTML = "";
  (Array.isArray(rows) ? rows : []).forEach((r) => addRow(r));
}

// ---------- verificação DNS ----------
const DNS_EMOJI = { ok: "✅", warn: "⚠️", fail: "🔴" };

function renderDnsCards() {
  dnsResults.innerHTML = "";
  dnsChecks.forEach((d, idx) => {
    const card = document.createElement("div");
    card.className = `dns-card dns-${d.overall}`;
    const rows = ["spf", "dmarc", "dkim", "mx"]
      .map((k) => {
        const c = d.checks?.[k];
        if (!c) return "";
        return `<div class="dns-line"><span class="dns-k">${k.toUpperCase()}</span> ${DNS_EMOJI[c.status]} <span class="dns-d">${escText(c.detail)}</span></div>`;
      })
      .join("");
    card.innerHTML = `
      <div class="dns-card-head">
        <strong>${escText(d.domain)}</strong>
        <span class="hint">verificado em ${escText(d.checkedAt || "")}</span>
        <button type="button" class="ghost small dns-remove">✕</button>
      </div>
      ${rows}
      <p class="hint dns-foot">Este resultado entra na auditoria como evidência verificada.</p>
    `;
    card.querySelector(".dns-remove").addEventListener("click", () => {
      dnsChecks.splice(idx, 1);
      renderDnsCards();
    });
    dnsResults.appendChild(card);
  });
  updateCounters();
}

function escText(s) {
  const div = document.createElement("div");
  div.textContent = s ?? "";
  return div.innerHTML;
}

dnsCheckBtn.addEventListener("click", async () => {
  const domain = dnsDomain.value.trim();
  if (!domain) {
    dnsStatus.textContent = "Digite o domínio de envio primeiro (ex.: envio.suaempresa.com.br).";
    return;
  }
  dnsCheckBtn.disabled = true;
  dnsStatus.textContent = `Consultando o DNS de ${domain}… (SPF, DMARC, DKIM, MX)`;
  try {
    const resp = await fetch("/api/dns-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, dkimSelector: dnsSelector.value.trim() || undefined }),
    });
    const result = await resp.json();
    if (!resp.ok) throw new Error(result.error || `Erro ${resp.status}`);
    dnsChecks = dnsChecks.filter((d) => d.domain !== result.domain);
    dnsChecks.push(result);
    renderDnsCards();
    dnsDomain.value = "";
    dnsSelector.value = "";
    dnsStatus.textContent =
      result.overall === "ok"
        ? "✓ Verificado — tudo certo neste domínio."
        : "✓ Verificado — há pontos de atenção (veja abaixo). Verifique outro domínio se usar mais de um.";
  } catch (err) {
    dnsStatus.textContent = `⚠️ ${err.message}`;
  } finally {
    dnsCheckBtn.disabled = false;
  }
});

// ---------- biblioteca de vencedores ----------
function openModal(el) {
  el.classList.remove("hidden");
}
function closeModal(el) {
  el.classList.add("hidden");
}
for (const [overlay, closeBtn] of [
  [winnersModal, winnersClose],
  [helpModal, helpClose],
]) {
  closeBtn.addEventListener("click", () => closeModal(overlay));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal(overlay);
  });
}

const WINNER_CHANNEL_PT = { email: "Email", whatsapp: "WhatsApp", lp: "LP", prompt: "Prompt 1:1", estrategia: "Estratégia" };

async function renderWinners() {
  try {
    const winners = await (await fetch("/api/winners")).json();
    winnersList.innerHTML = winners.length
      ? "<h3>Salvos</h3>"
      : `<p class="hint">Nenhum vencedor salvo ainda. Quando uma campanha performar, salve-a aqui — o avaliador passa a usá-la como referência em todas as análises.</p>`;
    for (const w of winners) {
      const item = document.createElement("div");
      item.className = "winner-item";
      item.innerHTML = `
        <div class="winner-head">
          <span class="winner-badge">${WINNER_CHANNEL_PT[w.channel] || w.channel}</span>
          <strong>${escText(w.title)}</strong>
          <button type="button" class="ghost small w-del">✕</button>
        </div>
        ${w.metrics ? `<div class="winner-metrics">📈 ${escText(w.metrics)}</div>` : ""}
        <pre class="winner-content">${escText(w.content.slice(0, 400))}${w.content.length > 400 ? "…" : ""}</pre>
      `;
      item.querySelector(".w-del").addEventListener("click", async () => {
        if (!confirm(`Excluir o vencedor "${w.title}"?`)) return;
        await fetch(`/api/winners/${w.id}`, { method: "DELETE" });
        renderWinners();
      });
      winnersList.appendChild(item);
    }
  } catch {
    winnersList.innerHTML = `<p class="hint">⚠️ Não consegui carregar os vencedores.</p>`;
  }
}

winnersBtn.addEventListener("click", () => {
  openModal(winnersModal);
  renderWinners();
});

winnerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(winnerForm).entries());
  winnerStatus.textContent = "Salvando…";
  try {
    const r = await (
      await fetch("/api/winners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    ).json();
    if (r.error) throw new Error(r.error);
    winnerForm.reset();
    winnerStatus.textContent = "✓ Salvo! Já vale para as próximas análises.";
    setTimeout(() => (winnerStatus.textContent = ""), 3000);
    renderWinners();
  } catch (err) {
    winnerStatus.textContent = `⚠️ ${err.message}`;
  }
});

function openWinnerModalPrefilled(content) {
  openModal(winnersModal);
  renderWinners();
  winnerForm.elements.content.value = content;
  winnerForm.elements.clientName.value = currentMeta.clientName || "";
  winnerForm.elements.title.focus();
}

// ---------- modo de operação (cold × RD Station) ----------
function currentMode() {
  return form.elements.opMode?.value || "cold";
}

function applyMode() {
  document.body.dataset.mode = currentMode();
  updateCounters();
}

for (const radio of form.querySelectorAll('input[name="opMode"]')) {
  radio.addEventListener("change", applyMode);
}

// ---------- ajuda e onboarding ----------
helpBtn.addEventListener("click", () => openModal(helpModal));

if (!localStorage.getItem("belgos-onboarded")) {
  onboarding.classList.remove("hidden");
}
onboardingDismiss.addEventListener("click", () => {
  localStorage.setItem("belgos-onboarded", "1");
  onboarding.classList.add("hidden");
});

// ---------- seções recolhíveis: contadores e expandir/recolher ----------
function sectionFilledCount(sec) {
  let n = 0;
  for (const el of sec.querySelectorAll("input[name], textarea[name], select[name]")) {
    if (el.type === "file" || el.type === "checkbox") continue;
    if (el.value.trim()) n++;
  }
  if (sec.id === "sec-2") {
    n += ["emails", "whatsapp", "leads"].filter((s) => sheets[s]?.text).length;
    n += collectLps().length;
  }
  if (sec.id === "sec-4") n += collectRows().length;
  if (sec.id === "sec-5") n += dnsChecks.length;
  return n;
}

// Itens essenciais do brief (o que torna o diagnóstico conclusivo).
// WhatsApp e prompt 1:1 são bônus — não penalizam quem não os usa.
const fieldVal = (name) => form.elements[name]?.value?.trim() || "";
const BRIEF_ITEMS = [
  { label: "nome do cliente", filled: () => !!fieldVal("clientName") },
  { label: "CPC", filled: () => !!fieldVal("cpc") },
  { label: "ICP", filled: () => !!fieldVal("icp") },
  { label: "oferta", filled: () => !!fieldVal("offer") },
  {
    label: "copy de emails",
    filled: () => !!fieldVal("emailSeq") || !!sheets.emails?.text,
  },
  {
    label: "landing page",
    filled: () => collectLps().some((lp) => lp.url || lp.content),
  },
  {
    label: "amostra de leads",
    filled: () => !!fieldVal("leads") || !!sheets.leads?.text,
  },
  {
    label: "métricas",
    filled: () =>
      [
        "q_sent", "q_delivered", "q_opened", "q_replied", "q_positive",
        "q_meetings", "q_bounce", "q_spam", "wa_sent", "wa_delivered",
        "wa_read", "wa_replied", "wa_positive", "wa_meetings", "wa_blocks",
        "wa_banned", "metricsNotes",
      ].some((k) => fieldVal(k)) || collectRows().length > 0,
  },
  {
    label: "infra/DNS",
    filled: () =>
      !!fieldVal("infra") || dnsChecks.length > 0 || !!fieldVal("rdConfig"),
  },
  {
    label: "fluxos de automação",
    only: "rdstation",
    filled: () =>
      !!fieldVal("flowAttention") ||
      !!fieldVal("flowConsideration") ||
      !!fieldVal("flowDecision") ||
      !!fieldVal("flowRationale"),
  },
  {
    label: "lead scoring",
    only: "rdstation",
    filled: () => !!fieldVal("leadScoring"),
  },
];

function updateBriefProgress() {
  const items = BRIEF_ITEMS.filter((i) => !i.only || i.only === currentMode());
  const missing = items.filter((i) => !i.filled()).map((i) => i.label);
  const done = items.length - missing.length;
  const pct = Math.round((done / items.length) * 100);
  briefFill.style.width = `${pct}%`;
  briefFill.classList.toggle("full", pct === 100);
  if (pct === 100) {
    briefLabel.textContent = "Brief 100% completo";
    briefMissing.textContent = "✓ Pronto para uma auditoria conclusiva.";
  } else {
    briefLabel.textContent = `Brief ${pct}% completo`;
    const first = missing.slice(0, 3).join(", ");
    briefMissing.textContent = `Falta: ${first}${missing.length > 3 ? ` +${missing.length - 3}` : ""} — campos vazios viram lacunas no diagnóstico.`;
  }
}

function updateCounters() {
  for (const sec of sections) {
    const n = sectionFilledCount(sec);
    const badge = sec.querySelector(".sec-count");
    if (badge) badge.textContent = n ? `${n} preenchido${n > 1 ? "s" : ""}` : "";
  }
  updateBriefProgress();
}

function autoOpenSections() {
  sections.forEach((sec, i) => {
    sec.open = i === 0 || sectionFilledCount(sec) > 0;
  });
  syncToggleLabel();
}

function syncToggleLabel() {
  const allOpen = sections.every((s) => s.open);
  toggleSecsBtn.textContent = allOpen ? "Recolher tudo" : "Expandir tudo";
}

toggleSecsBtn.addEventListener("click", () => {
  const allOpen = sections.every((s) => s.open);
  sections.forEach((s) => (s.open = !allOpen));
  syncToggleLabel();
});
sections.forEach((s) => s.addEventListener("toggle", syncToggleLabel));
form.addEventListener("input", () => updateCounters());

// ---------- coleta e restauração do formulário ----------
function collectIntake() {
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  data.scope = fd.getAll("scope");
  data.emailSheet = sheets.emails?.text || "";
  data.waSheet = sheets.whatsapp?.text || "";
  data.leadsSheet = sheets.leads?.text || "";
  data.lps = collectLps();
  data.dispatchRows = collectRows();
  data.dnsChecks = dnsChecks;
  data.scopeV = 2; // versão do formato de escopo (v2: métricas e infra separados)
  return data;
}

function fillForm(intake) {
  form.reset();
  for (const [key, value] of Object.entries(intake || {})) {
    const el = form.elements[key];
    if (el && typeof value === "string" && el.type !== "checkbox" && el.type !== "file") {
      el.value = value;
    }
  }
  // escopo (migração: no formato antigo, "metricas" incluía domínios/DNS)
  let scope = Array.isArray(intake.scope) && intake.scope.length ? [...intake.scope] : null;
  if (scope && !intake.scopeV && scope.includes("metricas") && !scope.includes("infra")) {
    scope.push("infra");
  }
  for (const cb of form.querySelectorAll('input[name="scope"]')) {
    cb.checked = scope ? scope.includes(cb.value) : true;
  }
  // LPs (compatível com o formato antigo lpUrl/lpContent)
  const lps = Array.isArray(intake.lps) && intake.lps.length
    ? intake.lps
    : intake.lpUrl || intake.lpContent
      ? [{ name: "", url: intake.lpUrl || "", content: intake.lpContent || "" }]
      : [];
  fillLps(lps);
  fillRows(intake.dispatchRows || []);
  restoreSheet("emails", intake.emailSheet || "");
  restoreSheet("whatsapp", intake.waSheet || "");
  restoreSheet("leads", intake.leadsSheet || "");
  dnsChecks = Array.isArray(intake.dnsChecks) ? intake.dnsChecks : [];
  renderDnsCards();
  dnsStatus.textContent = "";
  if (form.elements.opMode) form.elements.opMode.value = intake.opMode || "cold";
  applyMode();
  autoOpenSections();
}

// ---------- conversa ----------
function startConversation(meta) {
  messages = [];
  currentAuditId = null;
  currentMeta = { scope: [], kind: "auditoria", ...meta };
  thread.innerHTML = "";
  resultTools.classList.add("hidden");
  chatForm.classList.add("hidden");
  auditSelect.value = "";
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (busy) return;
  const data = collectIntake();
  const brief = buildUserPrompt(data);
  const nome = (data.clientName || "").trim() || "cliente";
  startConversation({
    clientId: slugify(nome),
    clientName: nome,
    scope: data.scope,
    kind: "auditoria",
  });
  runTurn(brief, { type: "chip", text: `Brief enviado · ${nome}` }, true);
});

// Pré-voo: mesma coleta, modo preditivo (campanha ainda não disparada)
preflightBtn.addEventListener("click", () => {
  if (busy) return;
  const data = collectIntake();
  const brief = buildUserPrompt(data, { mode: "prevoo" });
  const nome = (data.clientName || "").trim() || "cliente";
  startConversation({
    clientId: slugify(nome),
    clientName: nome,
    scope: data.scope,
    kind: "pre-voo",
  });
  runTurn(brief, { type: "chip", text: `✈ Pré-voo · ${nome}` }, true);
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (busy) return;
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";
  runTurn(text, { type: "bubble", text }, false);
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
});

clearBtn.addEventListener("click", () => {
  fillForm({});
  messages = [];
  currentAuditId = null;
  thread.innerHTML = `<div class="empty-state" id="empty-state"><p>A análise aparece aqui.</p></div>`;
  resultTools.classList.add("hidden");
  chatForm.classList.add("hidden");
  clientSelect.value = "";
  refreshAudits("");
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(conversationMarkdown());
    copyBtn.textContent = "Copiado!";
    setTimeout(() => (copyBtn.textContent = "Copiar"), 1500);
  } catch {
    copyBtn.textContent = "Falhou";
  }
});

downloadBtn.addEventListener("click", () => {
  const blob = new Blob([conversationMarkdown()], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `belgos-${currentMeta.clientId || "analise"}.md`;
  a.click();
  URL.revokeObjectURL(url);
});

promptOptBtn.addEventListener("click", () => {
  if (busy || messages.length === 0) return;
  runTurn(
    "Otimize o **prompt de geração de conteúdo 1:1**, seguindo exatamente a seção \"Otimização do prompt de geração 1:1\" do método. Alinhe o prompt novo à estratégia acordada nesta conversa. Se eu tiver múltiplas estratégias/ICPs, estruture o prompt para receber a estratégia como variável de entrada.",
    { type: "bubble", text: "Otimizar o prompt de geração 1:1" },
    false,
  );
});

clientVersionBtn.addEventListener("click", () => {
  if (busy || messages.length === 0) return;
  runTurn(
    "Gere agora a **versão para o cliente** desta auditoria, seguindo exatamente a seção \"Documento para o cliente\" do método. Considere tudo que combinamos nesta conversa (incluindo as adaptações), e não inclua nada que tenha sido descartado.",
    { type: "bubble", text: "Gerar a versão de apresentação para o cliente" },
    false,
  );
});

pdfBtn.addEventListener("click", () => {
  const last = [...messages].reverse().find((m) => m.role === "assistant");
  if (last) openPdf(last.content);
});

function openPdf(markdown) {
  const clientName =
    currentMeta.clientName || form.elements.clientName?.value?.trim() || "Cliente";
  const win = window.open("", "_blank");
  if (!win) {
    alert("O navegador bloqueou a janela. Permita pop-ups para gerar o PDF.");
    return;
  }
  win.document.write(buildPrintHtml(markdown, { clientName }));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

// ---------- autosave do histórico ----------
async function autosaveAudit() {
  if (!messages.some((m) => m.role === "assistant")) return;
  try {
    const r = await (
      await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentAuditId || undefined,
          clientId: currentMeta.clientId,
          clientName: currentMeta.clientName,
          scope: currentMeta.scope,
          kind: currentMeta.kind,
          messages,
        }),
      })
    ).json();
    if (r.id) currentAuditId = r.id;
    if (clientSelect.value && clientSelect.value === currentMeta.clientId) {
      const sel = auditSelect.value;
      await refreshAudits(clientSelect.value);
      auditSelect.value = sel && sel !== currentAuditId ? sel : "";
    }
  } catch {
    /* autosave silencioso */
  }
}

// ---------- núcleo: roda um turno e transmite a resposta ----------
async function runTurn(userContent, userDisplay, isFirst) {
  busy = true;
  setBusy(true);
  removeEmptyState();

  if (userDisplay) appendUser(userDisplay);
  messages.push({ role: "user", content: userContent });

  const { bodyEl, turnEl, stopIndicator } = appendAssistant(isFirst);
  scrollThread();

  let full = "";
  try {
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        model: modelSelect.value || undefined,
        effort: effortSelect.value || undefined,
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Erro ${resp.status}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    const streamEl = document.createElement("div");
    streamEl.className = "streaming";
    let started = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
      if (!started) {
        stopIndicator();
        bodyEl.innerHTML = "";
        bodyEl.appendChild(streamEl);
        started = true;
      }
      streamEl.textContent = full;
      scrollThread();
    }

    stopIndicator();
    bodyEl.innerHTML = renderMarkdown(full);
    attachMsgTools(turnEl, full);
    messages.push({ role: "assistant", content: full });
    resultTools.classList.remove("hidden");
    chatForm.classList.remove("hidden");
    scrollThread();
    autosaveAudit();
    if (!isFirst) chatInput.focus();
  } catch (err) {
    stopIndicator();
    bodyEl.innerHTML = renderMarkdown(
      `> ⚠️ **Não foi possível gerar a resposta.**\n\n${err.message}`,
    );
    messages.pop(); // remove o turno do usuário sem resposta, pra permitir retry
    if (!isFirst) chatForm.classList.remove("hidden");
  } finally {
    busy = false;
    setBusy(false);
  }
}

// ---------- helpers de UI ----------
function setBusy(b) {
  resultDot.classList.toggle("live", b);
  runBtn.disabled = b;
  runBtn.textContent = b ? "Analisando…" : "Rodar auditoria";
  preflightBtn.disabled = b;
  chatSend.disabled = b;
  chatInput.disabled = b;
  systemicBtn.disabled = b;
  compareBtn.disabled = b || auditsCache.filter((a) => !a.kind || a.kind === "auditoria").length < 2;
}

function removeEmptyState() {
  const es = document.getElementById("empty-state");
  if (es) es.remove();
}

function scrollThread() {
  thread.scrollTop = thread.scrollHeight;
}

function appendUser({ type, text }) {
  const turn = document.createElement("div");
  turn.className = "turn user";
  const el = document.createElement("div");
  el.className = type === "chip" ? "chip" : "bubble";
  el.textContent = text;
  turn.appendChild(el);
  thread.appendChild(turn);
}

function appendAssistant(isFirst) {
  const turn = document.createElement("div");
  turn.className = "turn assistant";
  const body = document.createElement("div");
  body.className = "turn-body report";

  const ind = document.createElement("div");
  ind.className = "thinking";
  ind.innerHTML = `<span class="dots"><span></span><span></span><span></span></span> <span class="ind-label"></span>`;
  const label = ind.querySelector(".ind-label");
  label.textContent = isFirst ? FUNNEL_STEPS[0] : "Pensando…";
  body.appendChild(ind);
  turn.appendChild(body);
  thread.appendChild(turn);

  let timer = null;
  if (isFirst) {
    let idx = 0;
    timer = setInterval(() => {
      idx = (idx + 1) % FUNNEL_STEPS.length;
      label.textContent = FUNNEL_STEPS[idx];
    }, 1400);
  }

  return {
    bodyEl: body,
    turnEl: turn,
    stopIndicator: () => {
      if (timer) clearInterval(timer);
    },
  };
}

// barra de ações por resposta (PDF / copiar SÓ este trecho)
function attachMsgTools(turnEl, content) {
  const bar = document.createElement("div");
  bar.className = "msg-tools";
  const pdf = document.createElement("button");
  pdf.type = "button";
  pdf.className = "ghost tiny";
  pdf.textContent = "PDF desta resposta";
  pdf.addEventListener("click", () => openPdf(content));
  const cp = document.createElement("button");
  cp.type = "button";
  cp.className = "ghost tiny";
  cp.textContent = "Copiar";
  cp.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(content);
      cp.textContent = "Copiado!";
      setTimeout(() => (cp.textContent = "Copiar"), 1500);
    } catch {}
  });
  const win = document.createElement("button");
  win.type = "button";
  win.className = "ghost tiny";
  win.textContent = "⭐ Vencedor";
  win.title = "Performou? Salve na Biblioteca de Vencedores — o avaliador passa a usar como referência";
  win.addEventListener("click", () => openWinnerModalPrefilled(content));
  bar.append(pdf, cp, win);
  turnEl.appendChild(bar);
}

function renderThreadFromMessages(msgs, firstLabel) {
  thread.innerHTML = "";
  msgs.forEach((m, i) => {
    if (m.role === "user") {
      appendUser(
        i === 0
          ? { type: "chip", text: firstLabel || "Brief" }
          : { type: "bubble", text: m.content.length > 400 ? m.content.slice(0, 400) + "…" : m.content },
      );
    } else {
      const turn = document.createElement("div");
      turn.className = "turn assistant";
      const body = document.createElement("div");
      body.className = "turn-body report";
      body.innerHTML = renderMarkdown(m.content);
      turn.appendChild(body);
      attachMsgTools(turn, m.content);
      thread.appendChild(turn);
    }
  });
  resultTools.classList.remove("hidden");
  chatForm.classList.remove("hidden");
  scrollThread();
}

function conversationMarkdown() {
  let md = "";
  messages.forEach((m, idx) => {
    if (m.role === "user") {
      if (idx === 0) return; // pula o brief
      md += `\n\n---\n\n**Você:** ${m.content}\n\n`;
    } else {
      md += m.content + "\n";
    }
  });
  return md.trim();
}

// ---------- inicialização ----------
fillLps([{}]);
loadClients();
applyMode();
syncToggleLabel();

// ---------- markdown renderer (self-contained, sem dependências) ----------
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmt(s) {
  s = esc(s);
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_, t, u) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`,
  );
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  return s;
}

function inline(text) {
  return text
    .split(/(`[^`]+`)/g)
    .map((p) =>
      p.length >= 2 && p.startsWith("`") && p.endsWith("`")
        ? "<code>" + esc(p.slice(1, -1)) + "</code>"
        : fmt(p),
    )
    .join("");
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function renderMarkdown(md) {
  const src = (md || "").replace(/\r\n?/g, "\n");
  const codeBlocks = [];
  const noCode = src.replace(/```(\w*)\n([\s\S]*?)```/g, (_, _lang, code) => {
    codeBlocks.push(code.replace(/\n$/, ""));
    return ` CODE${codeBlocks.length - 1} `;
  });

  const lines = noCode.split("\n");
  const out = [];
  let i = 0;
  let para = [];
  const flushPara = () => {
    if (para.length) {
      out.push("<p>" + inline(para.join(" ")) + "</p>");
      para = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    const cm = line.match(/^ CODE(\d+) $/);
    if (cm) {
      flushPara();
      out.push("<pre><code>" + esc(codeBlocks[+cm[1]]) + "</code></pre>");
      i++;
      continue;
    }

    if (/^\s*$/.test(line)) {
      flushPara();
      i++;
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      const lvl = h[1].length;
      out.push(`<h${lvl}>` + inline(h[2].trim()) + `</h${lvl}>`);
      i++;
      continue;
    }

    if (/^\s*([-*_])\1\1+\s*$/.test(line)) {
      flushPara();
      out.push("<hr />");
      i++;
      continue;
    }

    // tabela
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /-/.test(lines[i + 1]) &&
      /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])
    ) {
      flushPara();
      const header = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      let t =
        "<table><thead><tr>" +
        header.map((c) => "<th>" + inline(c) + "</th>").join("") +
        "</tr></thead><tbody>";
      t += rows
        .map(
          (r) =>
            "<tr>" +
            r.map((c) => "<td>" + inline(c) + "</td>").join("") +
            "</tr>",
        )
        .join("");
      t += "</tbody></table>";
      out.push(t);
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      out.push("<blockquote>" + inline(buf.join(" ")) + "</blockquote>");
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      out.push(
        "<ul>" +
          items.map((it) => "<li>" + inline(it) + "</li>").join("") +
          "</ul>",
      );
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      flushPara();
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      out.push(
        "<ol>" +
          items.map((it) => "<li>" + inline(it) + "</li>").join("") +
          "</ol>",
      );
      continue;
    }

    para.push(line.trim());
    i++;
  }
  flushPara();
  return out.join("\n");
}

// ---------- documento para impressão / PDF ----------
function buildPrintHtml(markdown, { clientName = "Cliente" } = {}) {
  const date = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const body = renderMarkdown(markdown)
    // realça as palavras de situação do documento para o cliente
    .replace(/<strong>Situação:<\/strong>\s*<code>?Crítico<\/code>?/g, '<strong>Situação:</strong> <span class="sev sev-critico">Crítico</span>')
    .replace(/<strong>Situação:<\/strong>\s*<code>?Atenção<\/code>?/g, '<strong>Situação:</strong> <span class="sev sev-atencao">Atenção</span>')
    .replace(/<strong>Situação:<\/strong>\s*<code>?Adequado<\/code>?/g, '<strong>Situação:</strong> <span class="sev sev-adequado">Adequado</span>');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Auditoria de Prospecção — ${esc(clientName)}</title>
<style>
  @page { size: A4; margin: 20mm 18mm 22mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1c2733; font-size: 11.5pt; line-height: 1.55;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .band { height: 8px; background: linear-gradient(90deg, #1f6feb, #123a78); }
  header.doc {
    display: flex; justify-content: space-between; align-items: flex-end;
    padding: 22px 0 14px; border-bottom: 2px solid #1f6feb; margin-bottom: 8px;
  }
  .brand-name { font-size: 19pt; font-weight: 800; letter-spacing: -0.02em; color: #123a78; }
  .brand-sub { font-size: 9pt; color: #5a6b7d; text-transform: uppercase; letter-spacing: 0.14em; margin-top: 2px; }
  .doc-meta { text-align: right; font-size: 9.5pt; color: #5a6b7d; }
  .doc-meta .client { font-size: 12pt; font-weight: 700; color: #1c2733; }
  main { padding: 6px 2px 30px; }
  h1 { font-size: 19pt; letter-spacing: -0.02em; color: #123a78; margin: 18px 0 4px; line-height: 1.25; }
  h2 {
    font-size: 13.5pt; color: #123a78; margin: 26px 0 8px; padding-bottom: 5px;
    border-bottom: 1px solid #d8e2ee; break-after: avoid;
  }
  h3 { font-size: 11.5pt; margin: 16px 0 4px; break-after: avoid; }
  p { margin: 7px 0; }
  ul, ol { margin: 7px 0; padding-left: 20px; }
  li { margin: 4px 0; }
  strong { font-weight: 700; }
  code { background: #f0f4f9; border-radius: 4px; padding: 1px 5px; font-size: 0.9em; }
  pre { background: #f0f4f9; border-radius: 8px; padding: 12px; overflow-x: auto; break-inside: avoid; }
  blockquote {
    margin: 12px 0; padding: 9px 16px; border-left: 4px solid #1f6feb;
    background: #f2f7ff; border-radius: 0 8px 8px 0; break-inside: avoid;
  }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; break-inside: avoid; }
  th, td { border: 1px solid #d8e2ee; padding: 7px 10px; text-align: left; vertical-align: top; }
  th { background: #eef3fa; color: #123a78; }
  tr:nth-child(even) td { background: #fafcff; }
  hr { border: 0; border-top: 1px solid #d8e2ee; margin: 20px 0; }
  .sev { font-weight: 700; padding: 1px 10px; border-radius: 20px; font-size: 9.5pt; }
  .sev-critico { background: #fdecea; color: #b3261e; }
  .sev-atencao { background: #fef3df; color: #9a6a00; }
  .sev-adequado { background: #e6f4ec; color: #196c43; }
  footer.doc {
    margin-top: 34px; padding-top: 10px; border-top: 1px solid #d8e2ee;
    font-size: 8.5pt; color: #8494a5; display: flex; justify-content: space-between;
  }
  @media screen {
    body { background: #e8ebef; }
    .page { max-width: 210mm; margin: 24px auto; background: #fff; padding: 20mm 18mm; box-shadow: 0 4px 24px rgba(0,0,0,.15); }
    .print-tip { max-width: 210mm; margin: 14px auto 0; text-align: center; color: #5a6b7d; font-size: 10pt; }
  }
  @media print { .page { max-width: none; margin: 0; padding: 0; } .print-tip { display: none; } }
</style>
</head>
<body>
<p class="print-tip">Na janela de impressão, escolha “Salvar como PDF”. (Ctrl/Cmd+P se ela não abrir sozinha.)</p>
<div class="page">
  <div class="band"></div>
  <header class="doc">
    <div>
      <div class="brand-name">Belgos</div>
      <div class="brand-sub">Inteligência em Prospecção</div>
    </div>
    <div class="doc-meta">
      <div class="client">${esc(clientName)}</div>
      <div>Auditoria de Prospecção · ${esc(date)}</div>
    </div>
  </header>
  <main>${body}</main>
  <footer class="doc">
    <span>Documento confidencial — preparado pela Belgos para ${esc(clientName)}</span>
    <span>${esc(date)}</span>
  </footer>
</div>
</body>
</html>`;
}
