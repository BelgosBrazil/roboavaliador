import ExcelJS from "file:///home/user/roboavaliador/node_modules/exceljs/excel.js";

const OUT = "/tmp/claude-0/-home-user-roboavaliador/39d9ebd5-71cc-5d2a-a6a5-6b2a7c4dea23/scratchpad";

async function make(name, header, rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Dados");
  ws.addRow(header);
  rows.forEach((r) => ws.addRow(r));
  await wb.xlsx.writeFile(`${OUT}/${name}`);
  console.log("ok", name);
}

await make("demo-emails.xlsx", ["Assunto", "Corpo"], [
  [
    "Software para escritórios de advocacia",
    "Olá {nome}, tudo bem? Sou da Vetor Legal e nosso sistema ajuda escritórios como o seu a organizar processos, prazos e faturamento em um só lugar. Temos módulos de gestão de processos, timesheet, faturamento e BI jurídico. Gostaria de agendar uma demonstração de 30 minutos?",
  ],
  [
    "Re: Software para escritórios",
    "Oi {nome}, passando para reforçar meu último email. A Vetor Legal já atende mais de 200 escritórios no Brasil e nossos clientes reduzem em até 30% o tempo gasto com tarefas administrativas. Podemos conversar esta semana?",
  ],
  [
    "Última tentativa",
    "Olá {nome}, como não tive retorno, este será meu último email. Se quiser conhecer a plataforma que está transformando a advocacia brasileira, é só responder. Abraço!",
  ],
]);

await make("demo-whatsapp.xlsx", ["Mensagem"], [
  [
    "Oi {nome}! Aqui é o Rafael, da Vetor Legal. Vi que seu escritório atua com contencioso de volume. Nosso sistema recupera em média 12h por advogado por mês em horas não faturadas. Faz sentido te mostrar em 15 min?",
  ],
  [
    "Oi {nome}, tudo bem? Só para não perder o timing: seguimos com agenda aberta essa semana para o diagnóstico gratuito. Posso te mandar dois horários?",
  ],
]);

await make("demo-leads.xlsx", ["Nome", "Cargo", "Empresa", "Site", "Email"], [
  ["Mariana Duarte", "Sócia-administradora", "Duarte & Camargo Advogados", "duartecamargo.com.br", "mariana@duartecamargo.com.br"],
  ["Felipe Arruda", "Sócio", "Arruda Sociedade de Advogados", "arrudaadv.com.br", "felipe@arrudaadv.com.br"],
  ["Camila Nogueira", "Gerente administrativa", "Nogueira & Prado", "nogueiraprado.com.br", "camila@nogueiraprado.com.br"],
  ["Ricardo Sales", "Controller", "Sales Advocacia Empresarial", "salesadv.com.br", "ricardo@salesadv.com.br"],
  ["Beatriz Fontes", "Sócia fundadora", "Fontes Trabalhista", "fontestrab.com.br", "beatriz@fontestrab.com.br"],
  ["André Peixoto", "Sócio-administrador", "Peixoto & Lima", "peixotolima.com.br", "andre@peixotolima.com.br"],
]);
