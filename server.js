import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

import { buildSystemPrompt } from "./public/buildPrompt.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MODEL = process.env.MODEL || "claude-opus-4-8";
const ALLOWED_EFFORT = new Set(["low", "medium", "high", "xhigh", "max"]);
const EFFORT = ALLOWED_EFFORT.has(process.env.EFFORT)
  ? process.env.EFFORT
  : "high";
const PORT = Number(process.env.PORT) || 3000;
const MAX_TOKENS = 32000;

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
app.use(express.json({ limit: "8mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    model: MODEL,
    effort: EFFORT,
    keyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
  });
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

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: "adaptive" },
    output_config: { effort: EFFORT },
    system: systemPrompt,
    messages,
  });

  // Se o navegador fechar a conexão, aborta a chamada pra não gastar tokens à toa.
  req.on("close", () => stream.abort());

  try {
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(event.delta.text);
      }
    }
    res.end();
  } catch (err) {
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
