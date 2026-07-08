// Verificador de DNS/entregabilidade: consulta SPF, DMARC, DKIM e MX de um
// domínio de envio e devolve (a) um resultado estruturado para a interface e
// (b) um texto de evidência para o brief da auditoria.

import { promises as realDns } from "node:dns";

const DKIM_COMMON_SELECTORS = [
  "google", "default", "selector1", "selector2", "k1", "k2", "s1", "s2",
  "smtp", "mail", "dkim", "zoho", "pm", "mte1", "em1", "krs",
];

const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) =>
      setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), ms),
    ),
  ]);
}

// Uma consulta com 1 retry (timeouts de DNS são comuns e transitórios).
async function query(fn, ms = 4000) {
  try {
    return await withTimeout(fn(), ms);
  } catch (err) {
    if (err.code === "ETIMEOUT" || err.code === "ESERVFAIL" || err.code === "ECONNREFUSED") {
      return withTimeout(fn(), ms);
    }
    throw err;
  }
}

const NOT_FOUND = new Set(["ENOTFOUND", "ENODATA"]);

async function txt(dns, name) {
  try {
    const records = await query(() => dns.resolveTxt(name));
    return { ok: true, records: records.map((r) => r.join("")) };
  } catch (err) {
    if (NOT_FOUND.has(err.code)) return { ok: true, records: [] };
    return { ok: false, error: err.code || err.message };
  }
}

function analyzeSpf(records) {
  const spf = records.filter((r) => /^v=spf1(\s|$)/i.test(r.trim()));
  if (spf.length === 0) return { status: "fail", record: null, detail: "SPF não encontrado — Gmail/Outlook tratam como suspeito por padrão." };
  if (spf.length > 1) return { status: "fail", record: spf.join(" || "), detail: `${spf.length} registros SPF (mais de um invalida TODOS, por RFC). Unifique em um só.` };
  const record = spf[0];
  const lookups = (record.match(/\b(include:|a[\s:]|mx[\s:]|ptr[\s:]?|exists:|redirect=)/gi) || []).length;
  const allMatch = record.match(/([~\-+?])all\b/i);
  const qual = allMatch ? allMatch[1] : null;
  let status = "ok";
  const notes = [];
  if (!qual) { status = "warn"; notes.push("sem mecanismo `all` no final"); }
  else if (qual === "+") { status = "fail"; notes.push("termina em `+all` — autoriza QUALQUER servidor a enviar pelo domínio (gravíssimo)"); }
  else if (qual === "?") { status = "warn"; notes.push("termina em `?all` (neutro — proteção fraca; prefira `~all` ou `-all`)"); }
  if (lookups > 10) { status = "fail"; notes.push(`~${lookups} mecanismos com lookup (limite da RFC é 10 — SPF pode falhar como permerror)`); }
  return { status, record, detail: notes.join("; ") || `ok (${qual}all, ~${lookups} lookups)` };
}

function analyzeDmarc(records) {
  const dmarc = records.filter((r) => /^v=DMARC1(\s|;|$)/i.test(r.trim()));
  if (dmarc.length === 0) return { status: "fail", record: null, detail: "DMARC não encontrado — exigido pelo Gmail/Yahoo para remetentes em volume desde 2024." };
  const record = dmarc[0];
  const p = (record.match(/\bp\s*=\s*(none|quarantine|reject)/i)?.[1] || "").toLowerCase();
  const hasRua = /\brua\s*=/.test(record);
  if (p === "none") {
    return { status: "warn", record, detail: `p=none (só monitora, não aplica)${hasRua ? "" : " e sem rua= (nem relatórios recebe)"} — cumpre o mínimo, mas não protege.` };
  }
  if (p === "quarantine" || p === "reject") {
    return { status: "ok", record, detail: `p=${p}${hasRua ? ", com relatórios (rua)" : ", sem rua= (considere adicionar para receber relatórios)"}` };
  }
  return { status: "warn", record, detail: "registro DMARC sem política `p=` legível." };
}

async function findDkim(dns, domain, userSelector) {
  const selectors = [
    ...(userSelector ? [userSelector.trim()] : []),
    ...DKIM_COMMON_SELECTORS,
  ];
  const results = await Promise.allSettled(
    selectors.map(async (sel) => {
      const r = await txt(dns, `${sel}._domainkey.${domain}`);
      const hit = r.ok && r.records.some((rec) => /v=DKIM1|k=rsa|p=[A-Za-z0-9+/]/.test(rec));
      return hit ? sel : null;
    }),
  );
  const found = results
    .filter((r) => r.status === "fulfilled" && r.value)
    .map((r) => r.value);
  return { found, checked: selectors.length };
}

export async function checkDomain(rawDomain, { dkimSelector, dns = realDns } = {}) {
  const domain = (rawDomain || "").toString().trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  if (!DOMAIN_RE.test(domain)) {
    throw new Error("Domínio inválido. Informe só o domínio, ex.: envio.suaempresa.com.br");
  }

  const [spfTxt, dmarcTxt, dkim, mxRes] = await Promise.all([
    txt(dns, domain),
    txt(dns, `_dmarc.${domain}`),
    findDkim(dns, domain, dkimSelector),
    query(() => dns.resolveMx(domain)).catch((err) =>
      NOT_FOUND.has(err.code) ? [] : { error: err.code || err.message },
    ),
  ]);

  const checks = {};

  checks.spf = spfTxt.ok
    ? analyzeSpf(spfTxt.records)
    : { status: "warn", record: null, detail: `consulta falhou (${spfTxt.error}) — tente de novo` };

  checks.dmarc = dmarcTxt.ok
    ? analyzeDmarc(dmarcTxt.records)
    : { status: "warn", record: null, detail: `consulta falhou (${dmarcTxt.error}) — tente de novo` };

  checks.dkim = dkim.found.length
    ? { status: "ok", record: dkim.found.join(", "), detail: `seletor(es) com chave publicada: ${dkim.found.join(", ")}` }
    : { status: "warn", record: null, detail: `nenhuma chave DKIM encontrada nos ${dkim.checked} seletores testados — se a sua ferramenta usa um seletor próprio, informe-o e verifique de novo; sem DKIM, Gmail/Yahoo penalizam.` };

  if (Array.isArray(mxRes)) {
    checks.mx = mxRes.length
      ? { status: "ok", record: mxRes.map((m) => m.exchange).join(", "), detail: `${mxRes.length} servidor(es) de recebimento` }
      : { status: "warn", record: null, detail: "sem MX — o domínio não recebe respostas (mata o reply e piora reputação; configure recebimento)." };
  } else {
    checks.mx = { status: "warn", record: null, detail: `consulta falhou (${mxRes.error}) — tente de novo` };
  }

  const order = { fail: 0, warn: 1, ok: 2 };
  const worst = Object.values(checks).sort((a, b) => order[a.status] - order[b.status])[0].status;

  const EMOJI = { ok: "✅", warn: "⚠️", fail: "🔴" };
  const when = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const lines = [
    `### Domínio verificado: ${domain} (consulta DNS real em ${when})`,
    `- SPF: ${EMOJI[checks.spf.status]} ${checks.spf.detail}${checks.spf.record ? `\n  Registro: \`${checks.spf.record}\`` : ""}`,
    `- DMARC: ${EMOJI[checks.dmarc.status]} ${checks.dmarc.detail}${checks.dmarc.record ? `\n  Registro: \`${checks.dmarc.record}\`` : ""}`,
    `- DKIM: ${EMOJI[checks.dkim.status]} ${checks.dkim.detail}`,
    `- MX: ${EMOJI[checks.mx.status]} ${checks.mx.detail}`,
  ];

  return { domain, checkedAt: when, overall: worst, checks, text: lines.join("\n") };
}
