import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import fs from "node:fs";
import path from "node:path";

const SP = "/tmp/claude-0/-home-user-roboavaliador/39d9ebd5-71cc-5d2a-a6a5-6b2a7c4dea23/scratchpad";
const T0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s] ${m}`);

const DATA = {
  clientName: "Vetor Legal (demonstração)",
  sector: "SaaS jurídico B2B",
  cpc: "A Vetor Legal vende um sistema de gestão para escritórios de advocacia de pequeno e médio porte: processos, prazos, timesheet e faturamento em um só lugar. Dores que resolve: horas não faturadas por falta de registro, prazos perdidos por controle em planilha e retrabalho administrativo dos sócios. Diferencial: implantação em 7 dias com migração assistida.",
  icp: "ICP 1: sócios-administradores de escritórios com 10 a 50 advogados, contencioso de volume (trabalhista e consumidor).\nICP 2: gerentes administrativos e controllers de escritórios full service.",
  offer: "Diagnóstico gratuito de eficiência (30 min) com relatório de horas recuperáveis por advogado. CTA: responder o email para receber dois horários.",
  strategies: "Estratégia 1: sócios de contencioso, sequência de 3 emails + follow no WhatsApp.\nEstratégia 2: controllers, sequência de 2 emails.",
  genModel: "gpt-4o-mini",
  genPrompt: "Escreva um email curto de prospecção B2B para {{nome}}, {{cargo}} da {{empresa}}, oferecendo o software jurídico Vetor Legal. Mencione a empresa dele para parecer personalizado. Seja persuasivo, profissional e termine pedindo uma reunião de 30 minutos.",
  infra: "3 caixas dedicadas no Google Workspace (domínio vetorlegal-mail.com.br), aquecimento de 3 semanas, limite de 60 envios por caixa por dia, tracking de abertura ligado.",
  metricsNotes: "Aberturas razoáveis mas resposta quase zero. Sensação de que o problema está na copy ou na oferta.",
  flowAttention: "3 emails de conteúdo sobre horas não faturadas, gatilho: download do e-book.",
  leadScoring: "Fit: porte do escritório e cargo. Interesse: abertura + clique. MQL acima de 70 pontos.",
  quant: { q_period: "últimos 45 dias", q_sent: "4200", q_delivered: "3949", q_opened: "1490", q_clicks: "86", q_replied: "19", q_positive: "4", q_meetings: "1", q_bounce: "251", q_unsub: "12" },
  wa: { wa_sent: "400", wa_delivered: "380", wa_read: "310", wa_replied: "12", wa_positive: "3", wa_meetings: "1", wa_blocks: "6", wa_banned: "0" },
  rows: [
    { strategy: "Estratégia 1", dispatch: "Disparo 1", channel: "email", sent: "1800", delivered: "1690", opened: "610", replied: "9", positive: "2", meetings: "1", notes: "assunto A" },
    { strategy: "Estratégia 1", dispatch: "Disparo 2", channel: "email", sent: "1800", delivered: "1655", opened: "560", replied: "6", positive: "1", meetings: "0", notes: "assunto B, mesmo corpo" },
    { strategy: "Estratégia 2", dispatch: "Disparo 1", channel: "email", sent: "600", delivered: "604", opened: "320", replied: "4", positive: "1", meetings: "0", notes: "controllers" },
  ],
};

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--force-device-scale-factor=1", "--autoplay-policy=no-user-gesture-required"],
});
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: path.join(SP, "rec2"), size: { width: 1280, height: 720 } },
});
await ctx.addInitScript(() => { window.print = () => {}; });
const page = await ctx.newPage();
page.setDefaultTimeout(20000);

const slate = async (ms = 800) => {
  await page.evaluate((d) => new Promise((res) => {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;inset:0;background:#000;z-index:999999";
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); res(); }, d);
  }), ms);
};
const smooth = async (sel) => {
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ behavior: "smooth", block: "center" }), sel);
  await page.waitForTimeout(650);
};
const type = async (sel, text, delay = 8) => {
  await smooth(sel);
  await page.click(sel);
  await page.locator(sel).pressSequentially(text, { delay });
};

await page.goto("http://localhost:3000");
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1000);
await page.locator("#onboarding-dismiss").click({ timeout: 3000 }).catch(() => {});
await page.waitForTimeout(400);
log("página pronta");

// ============ SEGMENTO A: brief ============
await slate(1400);
log("A: brief");
await page.click("#toggle-secs"); // expandir tudo
await page.waitForTimeout(500);
await page.evaluate(() => window.scrollTo({ top: 0 }));
await page.waitForTimeout(400);

await type('#audit-form input[name="clientName"]', DATA.clientName, 16);
await type('#audit-form input[name="sector"]', DATA.sector, 12);
await type('#audit-form textarea[name="cpc"]', DATA.cpc, 4);
await smooth('#audit-form textarea[name="icp"]');
await page.locator('#audit-form textarea[name="icp"]').fill(DATA.icp);
await page.waitForTimeout(350);
await page.locator('#audit-form textarea[name="offer"]').fill(DATA.offer);
await page.waitForTimeout(350);
await smooth('#audit-form textarea[name="strategies"]');
await page.locator('#audit-form textarea[name="strategies"]').fill(DATA.strategies);
await page.waitForTimeout(500);

// planilhas
await smooth("#sheet-emails");
await page.setInputFiles("#sheet-emails", `${SP}/demo-emails.xlsx`);
await page.waitForTimeout(1100);
await page.setInputFiles("#sheet-whatsapp", `${SP}/demo-whatsapp.xlsx`);
await page.waitForTimeout(1000);
await smooth("#sheet-leads");
await page.setInputFiles("#sheet-leads", `${SP}/demo-leads.xlsx`);
await page.waitForTimeout(1100);
log("A: planilhas ok");

// prompt 1:1
await type('#audit-form textarea[name="genPrompt"]', DATA.genPrompt, 3);
await page.locator('#audit-form input[name="genModel"]').fill(DATA.genModel);
await page.waitForTimeout(400);

// LP
await smooth(".lp-url");
await page.locator(".lp-url").first().fill("https://belgos.co");
await page.waitForTimeout(250);
await page.locator(".lp-fetch").first().click();
await page.waitForTimeout(5000);
log("A: LP buscada");

// infra qualitativa
await smooth('#audit-form textarea[name="infra"]');
await page.locator('#audit-form textarea[name="infra"]').fill(DATA.infra);
await page.waitForTimeout(400);

// métricas totais
await smooth('#audit-form input[name="q_sent"]');
for (const [k, v] of Object.entries(DATA.quant)) {
  await page.locator(`#audit-form [name="${k}"]`).fill(v);
  await page.waitForTimeout(110);
}
await smooth('#audit-form input[name="wa_sent"]');
for (const [k, v] of Object.entries(DATA.wa)) {
  await page.locator(`#audit-form [name="${k}"]`).fill(v);
  await page.waitForTimeout(90);
}

// linhas por estratégia/disparo
await smooth("#rows-body");
const need = DATA.rows.length;
let have = await page.locator("#rows-body tr").count();
while (have < need) { await page.click("#row-add"); have++; await page.waitForTimeout(200); }
for (let i = 0; i < need; i++) {
  const tr = page.locator("#rows-body tr").nth(i);
  for (const [f, v] of Object.entries(DATA.rows[i])) {
    if (f === "channel") await tr.locator(`.r-${f}`).selectOption(v);
    else await tr.locator(`.r-${f}`).fill(v);
  }
  await page.waitForTimeout(250);
}
await type('#audit-form textarea[name="metricsNotes"]', DATA.metricsNotes, 5);
await page.waitForTimeout(800);
log("A: fim");

// ============ SEGMENTO E: modo RD Station ============
await slate(900);
log("E: rd");
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
await page.waitForTimeout(700);
await page.check('#audit-form input[name="opMode"][value="rdstation"]');
await page.waitForTimeout(700);
await smooth('#audit-form textarea[name="flowAttention"]');
await page.locator('#audit-form textarea[name="flowAttention"]').fill(DATA.flowAttention);
await page.waitForTimeout(400);
await smooth('#audit-form textarea[name="leadScoring"]');
await page.locator('#audit-form textarea[name="leadScoring"]').fill(DATA.leadScoring);
await page.waitForTimeout(900);
await page.check('#audit-form input[name="opMode"][value="cold"]');
await page.waitForTimeout(500);
log("E: fim");

// ============ SEGMENTO B: DNS ============
await slate(900);
log("B: dns");
await smooth("#dns-domain");
await type("#dns-domain", "belgos.co", 45);
await page.click("#dns-check-btn");
await page.waitForFunction(
  () => document.querySelectorAll("#dns-results .dns-card").length > 0,
  undefined,
  { timeout: 30000 },
).catch(() => log("B: sem cards (timeout)"));
await page.waitForTimeout(2800);
log("B: fim");

// ============ SEGMENTO C: auditoria ============
await slate(900);
log("C: rodar auditoria");
await smooth("#run-btn");
await page.waitForTimeout(500);
await page.click("#run-btn");
await page.waitForFunction(() => document.getElementById("run-btn").disabled, undefined, { timeout: 15000 });
log("C: streaming começou (aguardando conclusão)");
await page.waitForFunction(
  () => !document.getElementById("run-btn").disabled,
  undefined,
  { timeout: 900000, polling: 1000 },
);
log("C: auditoria concluída");
await page.waitForTimeout(1200);

// ============ SEGMENTO D: scroll do relatório ============
await slate(900);
log("D: scroll relatório");
await page.evaluate(async () => {
  const root = document.getElementById("result-panel");
  const cands = [root, ...root.querySelectorAll("*")];
  const el = cands.find((e) => e.scrollHeight > e.clientHeight + 60) || root;
  el.scrollTop = 0;
  await new Promise((r) => setTimeout(r, 700));
  const target = Math.min(el.scrollHeight - el.clientHeight, 2600);
  const t0 = performance.now();
  const dur = 12000;
  await new Promise((resolve) => {
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.scrollTop = target * p;
      if (p < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
});
await page.waitForTimeout(900);
log("D: fim");

// ============ SEGMENTO F: PDF ============
await slate(900);
log("F: pdf");
const [pop] = await Promise.all([
  ctx.waitForEvent("page", { timeout: 15000 }),
  page.click("#pdf-btn"),
]);
await pop.waitForLoadState("load").catch(() => {});
await pop.waitForTimeout(1600);
await pop.evaluate(async () => {
  const t0 = performance.now();
  const dur = 6000;
  const target = Math.min(document.body.scrollHeight - innerHeight, 1600);
  await new Promise((resolve) => {
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      scrollTo(0, target * p);
      if (p < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
});
await pop.waitForTimeout(900);
const popVideo = pop.video();
await pop.close();
log("F: fim");

await slate(1200);
const mainVideo = page.video();
await ctx.close();

const mainPath = await mainVideo.path();
fs.renameSync(mainPath, path.join(SP, "screen-main.webm"));
if (popVideo) {
  const pv = await popVideo.path().catch(() => null);
  if (pv && fs.existsSync(pv)) fs.renameSync(pv, path.join(SP, "screen-pdf.webm"));
}
await browser.close();
log("gravações salvas: screen-main.webm" + (fs.existsSync(path.join(SP, "screen-pdf.webm")) ? " + screen-pdf.webm" : ""));
