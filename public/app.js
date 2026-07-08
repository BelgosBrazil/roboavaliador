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

// ---------- estado ----------
let messages = []; // histórico da conversa {role, content}
let busy = false;
let sheet = null; // { text, filename, rows, sheets } — planilha de emails importada

const sheetFile = document.getElementById("sheet-file");
const sheetStatus = document.getElementById("sheet-status");
const sheetInfo = document.getElementById("sheet-info");
const sheetRemove = document.getElementById("sheet-remove");

const FUNNEL_STEPS = [
  "Infraestrutura & entregabilidade",
  "Lista & fit (ICP ↔ lista)",
  "Oferta & proposta de valor",
  "Copy & sequência",
  "Landing page & conversão",
  "Medição & aprendizado",
];

// ---------- health ----------
fetch("/api/health")
  .then((r) => r.json())
  .then((h) => {
    if (!h.keyConfigured) {
      statusEl.innerHTML = `<span class="warn">⚠ ANTHROPIC_API_KEY não configurada</span>`;
    } else {
      statusEl.textContent = `${h.model || "—"} · esforço ${h.effort}`;
    }
  })
  .catch(() => {});

// ---------- planilha de emails ----------
sheetFile.addEventListener("change", async () => {
  const file = sheetFile.files?.[0];
  if (!file) return;
  sheetInfo.textContent = `Lendo ${file.name}…`;
  sheetStatus.classList.remove("hidden");
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
    sheet = { ...result, filename: file.name };
    sheetInfo.textContent = `✓ ${file.name} — ${result.rows} registro(s) em ${result.sheets} aba(s). Será incluída na auditoria.`;
  } catch (err) {
    sheet = null;
    sheetFile.value = "";
    sheetInfo.textContent = `⚠️ ${err.message}`;
  }
});

sheetRemove.addEventListener("click", () => {
  sheet = null;
  sheetFile.value = "";
  sheetStatus.classList.add("hidden");
});

// ---------- turno 1: auditoria ----------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (busy) return;
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  data.scope = fd.getAll("scope");
  data.emailSheet = sheet?.text || "";
  const brief = buildUserPrompt(data);

  // começa uma conversa nova
  messages = [];
  thread.innerHTML = "";
  resultTools.classList.add("hidden");
  chatForm.classList.add("hidden");

  const nome = (data.clientName || "").trim() || "cliente";
  runTurn(brief, { type: "chip", text: `Brief enviado · ${nome}` }, true);
});

// ---------- turnos seguintes: conversa ----------
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (busy) return;
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";
  runTurn(text, { type: "bubble", text }, false);
});

// Enter envia; Shift+Enter quebra linha
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
});

clearBtn.addEventListener("click", () => {
  form.reset();
  messages = [];
  sheet = null;
  sheetFile.value = "";
  sheetStatus.classList.add("hidden");
  thread.innerHTML = `<div class="empty-state" id="empty-state"><p>A análise aparece aqui — e vira uma conversa.</p></div>`;
  resultTools.classList.add("hidden");
  chatForm.classList.add("hidden");
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
  const blob = new Blob([conversationMarkdown()], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "belgos-analise.md";
  a.click();
  URL.revokeObjectURL(url);
});

// ---------- núcleo: roda um turno e transmite a resposta ----------
async function runTurn(userContent, userDisplay, isFirst) {
  busy = true;
  setBusy(true);
  removeEmptyState();

  if (userDisplay) appendUser(userDisplay);
  messages.push({ role: "user", content: userContent });

  const { bodyEl, stopIndicator } = appendAssistant(isFirst);
  scrollThread();

  let full = "";
  try {
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
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
    messages.push({ role: "assistant", content: full });
    resultTools.classList.remove("hidden");
    chatForm.classList.remove("hidden");
    scrollThread();
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
  runBtn.disabled = b;
  runBtn.textContent = b ? "Analisando…" : "Rodar auditoria";
  chatSend.disabled = b;
  chatInput.disabled = b;
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
    stopIndicator: () => {
      if (timer) clearInterval(timer);
    },
  };
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
