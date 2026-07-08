import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

import { buildSystemPrompt } from "./public/buildPrompt.js";
import { parseSheetBuffer } from "./lib/parseSheet.js";
import { fetchLandingPage } from "./lib/fetchLp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MODEL = process.env.MODEL || "claude-opus-4-8";
const ALLOWED_EFFORT = new Set(["low", "medium", "high", "xhigh", "max"]);
const EFFORT = ALLOWED_EFFORT.has(process.env.EFFORT)
  ? process.env.EFFORT
  : "high";
const PORT = Number(process.env.PORT) || 3000;
const MAX_TOKENS = 32000;

// Claude Fable 5 / Mythos 5: thinking é sempre ativo (não se envia o parâmetro)
// e recomenda-se fallback automático para Opus 4.8 caso um pedido seja recusado
// pelos classificadores de segurança.
const IS_FABLE = /^claude-(fable|mythos)/.test(MODEL);
const FALLBACK_MODEL = "claude-opus-4-8";

const FRAMEWORK_DIR = path.join(__dirname, "framework");

// Lê e concatena os arquivos .md do framework (o "cérebro"), em ordem de nome.
// Feito por requisição, de propósito: você pode editar os .md sem reiniciar.
function loadFramework() {
  const files = fs
    .readdirSync(FRAMEWORK_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();
  return files
    .map((f) => fs.readFileSync(path.join(FRAMEWORK_DIR, f), "utf8").trim())
    .join("\n\n---\n\n");
}

const client = new Anthropic(); // usa ANTHROPIC_API_KEY do ambiente

const app = express();
app.use(express.json({ limit: "25mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    model: MODEL,
    effort: EFFORT,
    fallback: IS_FABLE ? FALLBACK_MODEL : null,
    keyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
  });
});

// Converte planilha (.xlsx/.csv) com exemplos de emails em texto para o brief.
app.post("/api/parse-sheet", async (req, res) => {
  try {
    const { filename, dataBase64 } = req.body || {};
    if (!dataBase64) {
      return res.status(400).json({ error: "Arquivo ausente." });
    }
    const buffer = Buffer.from(dataBase64, "base64");
    if (buffer.length > 15 * 1024 * 1024) {
      return res.status(413).json({ error: "Planilha grande demais (máx. 15MB)." });
    }
    const result = await parseSheetBuffer(filename, buffer);
    res.json(result);
  } catch (err) {
    res.status(400).json({
      error: err?.message || "Não foi possível ler a planilha.",
    });
  }
});

// Busca a landing page pela URL e devolve o conteúdo extraído para o brief.
app.post("/api/fetch-lp", async (req, res) => {
  try {
    const result = await fetchLandingPage(req.body?.url);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err?.message || "Não foi possível buscar a página." });
  }
});

// Endpoint de conversa: recebe o histórico completo (o cliente é dono do
// histórico) e transmite a resposta do assistente. O primeiro turno traz o
// brief; os seguintes são a iteração ("adapte à minha infra", "reescreva…").
app.post("/api/chat", async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(400).json({
      error:
        "ANTHROPIC_API_KEY não configurada. Copie .env.example para .env e coloque sua chave.",
    });
  }

  const raw = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages = raw
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim(),
    )
    .map((m) => ({ role: m.role, content: m.content }));

  if (messages.length === 0 || messages[0].role !== "user") {
    return res
      .status(400)
      .json({ error: "Conversa inválida: o primeiro turno deve ser do usuário." });
  }

  let systemPrompt;
  try {
    systemPrompt = buildSystemPrompt(loadFramework());
  } catch (err) {
    return res
      .status(500)
      .json({ error: `Falha ao carregar o framework: ${err.message}` });
  }

  res.status(200);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  const baseParams = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    output_config: { effort: EFFORT },
    system: systemPrompt,
    messages,
  };

  // Fable/Mythos: sem parâmetro `thinking` (é sempre ativo) e com fallback
  // server-side para Opus 4.8. Demais modelos: thinking adaptativo.
  const makeStream = ({ withFallbacks }) => {
    if (!IS_FABLE) {
      return client.messages.stream({
        ...baseParams,
        thinking: { type: "adaptive" },
      });
    }
    if (withFallbacks) {
      return client.beta.messages.stream({
        ...baseParams,
        betas: ["server-side-fallback-2026-06-01"],
        fallbacks: [{ model: FALLBACK_MODEL }],
      });
    }
    return client.beta.messages.stream(baseParams);
  };

  let currentStream = null;
  let closed = false;
  // Se o navegador desconectar no meio do streaming, aborta a chamada pra não
  // gastar tokens à toa. (`res.close` também dispara ao final normal — por isso
  // o guard em writableEnded. `req.close` não serve: no Node moderno ele dispara
  // assim que o corpo do request termina de chegar.)
  res.on("close", () => {
    if (!res.writableEnded) {
      closed = true;
      currentStream?.abort();
    }
  });

  let wrote = false;
  const pipe = async (stream) => {
    currentStream = stream;
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        wrote = true;
        res.write(event.delta.text);
      } else if (
        event.type === "message_delta" &&
        event.delta?.stop_reason === "refusal"
      ) {
        wrote = true;
        res.write(
          "\n\n> ⚠️ O modelo recusou este pedido por política de segurança. Reformule e tente novamente.",
        );
      }
    }
  };

  try {
    await pipe(makeStream({ withFallbacks: true }));
    res.end();
  } catch (err) {
    // Se o fallback server-side não estiver disponível para esta conta/região,
    // tenta uma vez sem ele antes de desistir.
    const msg = String(err?.message || err);
    if (IS_FABLE && !wrote && !closed && /fallback/i.test(msg)) {
      try {
        await pipe(makeStream({ withFallbacks: false }));
        return res.end();
      } catch (err2) {
        err = err2;
      }
    }
    if (!res.writableEnded) {
      res.write(`\n\n> ⚠️ **Erro ao gerar a resposta:** ${err?.message || err}`);
      res.end();
    }
  }
});

// Respostas de erro limpas (ex.: JSON malformado no corpo) em vez de stack trace.
app.use((err, req, res, _next) => {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON inválido no corpo da requisição." });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Requisição grande demais." });
  }
  console.error(err);
  if (!res.headersSent) res.status(500).json({ error: "Erro interno." });
});

app.listen(PORT, () => {
  console.log(`\n  Belgos Roboavaliador rodando em http://localhost:${PORT}`);
  console.log(`  Modelo: ${MODEL}  |  Esforço: ${EFFORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(
      `  ⚠️  ANTHROPIC_API_KEY não configurada — copie .env.example para .env e adicione sua chave.\n`,
    );
  } else {
    console.log("");
  }
});
