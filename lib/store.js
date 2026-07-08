// Armazenamento local em arquivos JSON (pasta data/, fora do git):
//   data/clients/<id>.json — briefs salvos dos clientes
//   data/audits/<id>.json  — auditorias (conversas completas) com data
// Sem banco de dados de propósito: fácil de copiar, versionar e fazer backup.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");
const CLIENTS = path.join(DATA, "clients");
const AUDITS = path.join(DATA, "audits");
const WINNERS = path.join(DATA, "winners");

async function ensureDirs() {
  await fs.mkdir(CLIENTS, { recursive: true });
  await fs.mkdir(AUDITS, { recursive: true });
  await fs.mkdir(WINNERS, { recursive: true });
}

const ID_RE = /^[a-z0-9][a-z0-9-_]{0,79}$/;

export function slugify(name) {
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

function assertId(id) {
  if (!ID_RE.test(id)) throw new Error("Identificador inválido.");
  return id;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function listDir(dir) {
  await ensureDirs();
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
  const items = [];
  for (const f of files) {
    try {
      items.push(await readJson(path.join(dir, f)));
    } catch {
      // arquivo corrompido: ignora em vez de derrubar tudo
    }
  }
  return items;
}

// ---------- clientes ----------
export async function listClients() {
  const items = await listDir(CLIENTS);
  return items
    .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function getClient(id) {
  assertId(id);
  return readJson(path.join(CLIENTS, `${id}.json`));
}

export async function saveClient({ name, intake }) {
  await ensureDirs();
  const cleanName = (name || "").toString().trim() || "Cliente sem nome";
  const id = slugify(cleanName);
  const record = {
    id,
    name: cleanName,
    intake: intake && typeof intake === "object" ? intake : {},
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(
    path.join(CLIENTS, `${id}.json`),
    JSON.stringify(record, null, 2),
  );
  return record;
}

export async function deleteClient(id) {
  assertId(id);
  await fs.rm(path.join(CLIENTS, `${id}.json`), { force: true });
}

// ---------- auditorias ----------
function auditSnippet(messages) {
  const first = (messages || []).find((m) => m.role === "assistant");
  if (!first) return "";
  return first.content
    .replace(/[#>*`|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

export async function listAudits(clientId) {
  const items = await listDir(AUDITS);
  return items
    .filter((a) => !clientId || a.clientId === clientId)
    .map(({ id, clientId: cid, clientName, createdAt, updatedAt, messages, scope }) => ({
      id,
      clientId: cid,
      clientName,
      createdAt,
      updatedAt,
      turns: (messages || []).filter((m) => m.role === "assistant").length,
      scope: scope || [],
      snippet: auditSnippet(messages),
    }))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export async function getAudit(id) {
  assertId(id);
  return readJson(path.join(AUDITS, `${id}.json`));
}

export async function saveAudit({ id, clientId, clientName, scope, kind, messages }) {
  await ensureDirs();
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Auditoria vazia.");
  }
  const now = new Date().toISOString();
  let record;
  if (id) {
    assertId(id);
    try {
      record = await getAudit(id);
    } catch {
      record = null;
    }
  }
  if (!record) {
    record = {
      id: id || `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
    };
  }
  record.clientId = slugify(clientId || clientName || "cliente");
  record.clientName = (clientName || "").toString().trim() || "Cliente";
  record.scope = Array.isArray(scope) ? scope : [];
  record.kind = kind || record.kind || "auditoria";
  record.messages = messages;
  record.updatedAt = now;
  await fs.writeFile(
    path.join(AUDITS, `${record.id}.json`),
    JSON.stringify(record, null, 2),
  );
  return { id: record.id, updatedAt: record.updatedAt };
}

export async function deleteAudit(id) {
  assertId(id);
  await fs.rm(path.join(AUDITS, `${id}.json`), { force: true });
}

// Última auditoria de cada cliente, com o relatório (1ª resposta) — para a
// análise sistêmica da operação.
export async function auditsOverview() {
  const items = await listDir(AUDITS);
  const latest = new Map();
  for (const a of items) {
    if (a.kind && a.kind !== "auditoria") continue; // ignora análises/comparações
    const prev = latest.get(a.clientId);
    if (!prev || (a.updatedAt || "") > (prev.updatedAt || "")) latest.set(a.clientId, a);
  }
  return [...latest.values()]
    .map((a) => ({
      clientId: a.clientId,
      clientName: a.clientName,
      date: a.updatedAt,
      report: (a.messages || []).find((m) => m.role === "assistant")?.content || "",
    }))
    .filter((a) => a.report)
    .sort((a, b) => a.clientName.localeCompare(b.clientName, "pt-BR"));
}

// ---------- biblioteca de vencedores ----------
const WINNER_CHANNELS = new Set(["email", "whatsapp", "lp", "prompt", "estrategia"]);

export async function listWinners() {
  const items = await listDir(WINNERS);
  return items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function saveWinner({ title, channel, clientName, metrics, content, notes }) {
  await ensureDirs();
  if (!title?.toString().trim()) throw new Error("Dê um título ao vencedor.");
  if (!content?.toString().trim()) throw new Error("O conteúdo do vencedor é obrigatório.");
  const record = {
    id: `win-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title: title.toString().trim().slice(0, 140),
    channel: WINNER_CHANNELS.has(channel) ? channel : "email",
    clientName: (clientName || "").toString().trim().slice(0, 100),
    metrics: (metrics || "").toString().trim().slice(0, 400),
    content: content.toString().trim().slice(0, 6000),
    notes: (notes || "").toString().trim().slice(0, 800),
    createdAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(WINNERS, `${record.id}.json`), JSON.stringify(record, null, 2));
  return record;
}

export async function deleteWinner(id) {
  assertId(id);
  await fs.rm(path.join(WINNERS, `${id}.json`), { force: true });
}

// Bloco de texto com os vencedores para injetar no prompt de sistema:
// o avaliador passa a referenciar o que JÁ funcionou nesta operação.
const CHANNEL_PT = { email: "Email", whatsapp: "WhatsApp", lp: "Landing page", prompt: "Prompt 1:1", estrategia: "Estratégia" };
export async function winnersPromptBlock({ maxItems = 15, maxChars = 18000 } = {}) {
  const winners = await listWinners();
  if (winners.length === 0) return "";
  const parts = [
    `# Biblioteca de vencedores da operação Belgos`,
    ``,
    `Estes são padrões que JÁ comprovaram resultado nesta operação (salvos pelo usuário com as métricas). Ao reescrever, gerar campanhas ou otimizar prompts, use-os como referência de estilo e estrutura — eles pesam mais que boas práticas genéricas, porque foram validados neste mercado. Cite qual vencedor inspirou a sugestão quando usar um. Não copie literalmente entre clientes concorrentes; extraia o PADRÃO.`,
    ``,
  ];
  let chars = parts.join("\n").length;
  let used = 0;
  for (const w of winners) {
    if (used >= maxItems) break;
    const bloco = [
      `## ${CHANNEL_PT[w.channel] || w.channel}: ${w.title}`,
      w.metrics ? `Prova: ${w.metrics}` : null,
      w.clientName ? `Cliente: ${w.clientName}` : null,
      w.notes ? `Notas: ${w.notes}` : null,
      "```",
      w.content.slice(0, 1500),
      "```",
      "",
    ].filter(Boolean).join("\n");
    if (chars + bloco.length > maxChars) break;
    parts.push(bloco);
    chars += bloco.length;
    used++;
  }
  return used > 0 ? parts.join("\n") : "";
}

// ---------- backup ----------
export async function exportBackup() {
  return {
    format: "belgos-roboavaliador-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    clients: await listDir(CLIENTS),
    audits: await listDir(AUDITS),
    winners: await listDir(WINNERS),
  };
}

export async function importBackup(data) {
  await ensureDirs();
  if (!data || data.format !== "belgos-roboavaliador-backup") {
    throw new Error("Arquivo de backup inválido.");
  }
  let clients = 0;
  let audits = 0;
  let winners = 0;
  for (const c of data.clients || []) {
    if (!c?.id || !ID_RE.test(c.id)) continue;
    await fs.writeFile(path.join(CLIENTS, `${c.id}.json`), JSON.stringify(c, null, 2));
    clients++;
  }
  for (const a of data.audits || []) {
    if (!a?.id || !ID_RE.test(a.id)) continue;
    await fs.writeFile(path.join(AUDITS, `${a.id}.json`), JSON.stringify(a, null, 2));
    audits++;
  }
  for (const w of data.winners || []) {
    if (!w?.id || !ID_RE.test(w.id)) continue;
    await fs.writeFile(path.join(WINNERS, `${w.id}.json`), JSON.stringify(w, null, 2));
    winners++;
  }
  return { clients, audits, winners };
}
