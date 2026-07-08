// Converte planilhas (.xlsx / .csv) com exemplos de emails em texto legível
// para o brief da auditoria. Aceita os dois layouts:
//   - email inteiro numa coluna (1 célula preenchida por linha)
//   - parágrafos/partes em colunas separadas (assunto, abertura, corpo, CTA…)
// Cada linha = um email/registro.

import ExcelJS from "exceljs";

const MAX_ROWS = 150; // registros incluídos no brief
const MAX_CHARS = 60000; // teto de texto total

function normalizeCell(v) {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if (Array.isArray(v.richText))
      return v.richText.map((r) => r.text ?? "").join("");
    if (v.text !== undefined) return normalizeCell(v.text);
    if (v.result !== undefined) return normalizeCell(v.result);
    if (v.hyperlink) return String(v.hyperlink);
    if (v.error) return "";
    return String(v);
  }
  return String(v);
}

function cleanRow(cells) {
  return cells.map((c) => normalizeCell(c).trim());
}

function isEmptyRow(cells) {
  return cells.every((c) => !c);
}

// Heurística: a primeira linha é cabeçalho se todas as células preenchidas
// forem curtas (nomes de coluna), e houver mais linhas abaixo.
function looksLikeHeader(row, totalRows) {
  if (totalRows < 2) return false;
  const filled = row.filter(Boolean);
  if (filled.length === 0) return false;
  return filled.every((c) => c.length <= 60 && !c.includes("\n"));
}

function rowsToText(sheetName, rows, state) {
  const out = [];
  if (rows.length === 0) return out;

  let header = null;
  let dataRows = rows;
  if (looksLikeHeader(rows[0], rows.length)) {
    header = rows[0];
    dataRows = rows.slice(1);
  }

  out.push(`### Aba "${sheetName}" — ${dataRows.length} registro(s)`);
  if (header) out.push(`Colunas: ${header.filter(Boolean).join(" | ")}`);

  for (const row of dataRows) {
    if (state.rows >= MAX_ROWS || state.chars > MAX_CHARS) {
      state.truncated = true;
      break;
    }
    state.rows++;
    const filled = row
      .map((c, i) => ({ label: header?.[i] || `Coluna ${i + 1}`, value: c }))
      .filter((c) => c.value);
    if (filled.length === 0) continue;

    let bloco;
    if (filled.length === 1) {
      // layout "email inteiro numa coluna"
      bloco = `— Registro ${state.rows} —\n${filled[0].value}`;
    } else {
      // layout "parágrafos por coluna"
      bloco = `— Registro ${state.rows} —\n${filled
        .map((c) => `${c.label}: ${c.value}`)
        .join("\n")}`;
    }
    state.chars += bloco.length;
    out.push(bloco);
  }
  return out;
}

// ---------- CSV (com aspas e ; do Excel brasileiro) ----------
function detectDelimiter(firstLine) {
  const count = (ch) => {
    let n = 0;
    let inQ = false;
    for (const c of firstLine) {
      if (c === '"') inQ = !inQ;
      else if (c === ch && !inQ) n++;
    }
    return n;
  };
  const candidates = [";", ",", "\t"];
  return candidates.reduce((best, ch) =>
    count(ch) > count(best) ? ch : best,
  );
}

export function parseCsv(text) {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] || "";
  const delim = detectDelimiter(firstLine);

  const rows = [];
  let row = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQ = false;
      } else cell += c;
    } else if (c === '"') {
      inQ = true;
    } else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || (c === "\r" && src[i + 1] === "\n")) {
      if (c === "\r") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") {
      cell += c;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

// ---------- entrada principal ----------
export async function parseSheetBuffer(filename, buffer) {
  const name = (filename || "planilha").toLowerCase();
  const state = { rows: 0, chars: 0, truncated: false };
  const parts = [];
  let sheets = 0;
  let totalDataRows = 0;

  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    const rawRows = parseCsv(buffer.toString("utf8"))
      .map(cleanRow)
      .filter((r) => !isEmptyRow(r));
    sheets = 1;
    totalDataRows = rawRows.length;
    parts.push(...rowsToText("CSV", rawRows, state));
  } else if (name.endsWith(".xlsx")) {
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(buffer);
    } catch {
      throw new Error(
        "Não consegui abrir este arquivo como .xlsx. Ele pode estar corrompido ou em outro formato — abra no Excel e salve como .xlsx, ou exporte como .csv.",
      );
    }
    for (const ws of wb.worksheets) {
      const rawRows = [];
      ws.eachRow({ includeEmpty: false }, (row) => {
        // row.values é 1-indexado (posição 0 vazia)
        rawRows.push(cleanRow(Array.from(row.values).slice(1)));
      });
      const rows = rawRows.filter((r) => !isEmptyRow(r));
      if (rows.length === 0) continue;
      sheets++;
      totalDataRows += rows.length;
      parts.push(...rowsToText(ws.name, rows, state));
      if (state.truncated) break;
    }
  } else {
    throw new Error(
      "Formato não suportado. Envie .xlsx ou .csv (se estiver em .xls antigo, salve como .xlsx no Excel).",
    );
  }

  if (sheets === 0 || totalDataRows === 0) {
    throw new Error("A planilha está vazia ou não tem linhas legíveis.");
  }

  let text = parts.join("\n\n");
  if (state.truncated) {
    text += `\n\n> (Planilha truncada para a auditoria: incluídos ${state.rows} de ${totalDataRows} registros.)`;
  }
  return { text, sheets, rows: state.rows, totalRows: totalDataRows };
}
