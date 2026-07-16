import { buildUserPrompt } from "/home/user/roboavaliador/public/buildPrompt.js";

const intake = {
  clientName: "TechFin Contábil (teste)",
  sector: "Contabilidade para startups",
  cpc: "Escritório contábil especializado em startups SaaS. Diferencial: BPO financeiro completo + apoio a captação.",
  icp: "Founders/CFOs de SaaS B2B, 10-80 funcionários, pós-seed, Sudeste.",
  offer: "Reunião de 45 minutos para apresentar nossos serviços.",
  emailSeq: `Assunto: Soluções contábeis para sua empresa
Email 1: Olá {nome}, somos a TechFin, uma contabilidade moderna que ajuda empresas a crescer. Temos mais de 10 anos de experiência e oferecemos BPO financeiro, contabilidade e apoio à captação. Gostaria de agendar uma reunião de 45 minutos para apresentar nossas soluções? Atenciosamente.

Assunto: Re: Soluções contábeis
Email 2 (3 dias depois): Olá {nome}, passando para saber se você viu meu email anterior. Fico no aguardo. Abraço.`,
  waSeq: "Oi {nome}, tudo bem? Sou da TechFin Contábil. Vi que sua empresa está crescendo! Podemos marcar uma call de 45min essa semana?",
  lpUrl: "https://exemplo.com.br/lp",
  lpContent: "Headline: TechFin — Contabilidade Moderna. Sub: Soluções completas para sua empresa. Formulário: nome, email, telefone, empresa, cargo, faturamento, mensagem. Botão: ENVIAR.",
  leads: "Maria — Analista Financeiro — Padaria Pão Quente — 8 func.\nJoão — CEO — SaaS RH — 45 func.\nCarlos — Estagiário — Consultoria XYZ — 120 func.",
  history: "3 meses de disparos, ~9.000 emails. Pouquíssimas respostas, nenhuma reunião. WhatsApp em lista fria com chip comum, 1 número já foi banido.",
  q_period: "últimos 90 dias",
  q_sent: "9000",
  q_replied: "12",
  q_positive: "1",
  q_meetings: "0",
  infra: "Enviamos pelo domínio principal do cliente via RD Station, ~150 emails/dia numa caixa só, sem warmup. Não sabemos se SPF/DKIM/DMARC estão configurados.",
  q_clientsTotal: "40",
  q_clientsWorking: "0",
};

const messages = [{ role: "user", content: buildUserPrompt(intake) }];
const t0 = Date.now();
const resp = await fetch("http://localhost:3000/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages }),
});
if (!resp.ok) {
  console.error("HTTP", resp.status, await resp.text());
  process.exit(1);
}
let full = "";
const dec = new TextDecoder();
for await (const chunk of resp.body) {
  full += dec.decode(chunk, { stream: true });
}
const secs = ((Date.now() - t0) / 1000).toFixed(0);
console.log(`--- OK: ${full.length} chars em ${secs}s ---`);
console.log(full);
