// Busca uma landing page pela URL e extrai o conteúdo relevante para a
// auditoria: título, meta description, headings, CTAs, formulários e texto.
// Sem dependências — extração pragmática por regex sobre o HTML.

const MAX_HTML = 3 * 1024 * 1024; // 3MB de HTML
const MAX_BODY_TEXT = 8000; // caracteres de texto corrido no resultado

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&(apos|#39);/gi, "'");
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|iframe|template)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(p|div|li|tr|h[1-6]|section|article|header|footer|blockquote)>/gi, "\n")
      .replace(/<(br|hr)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return decodeEntities(m?.[2] ?? m?.[3] ?? m?.[4] ?? "").trim();
}

function matchAll(html, re, map) {
  const out = [];
  for (const m of html.matchAll(re)) {
    const v = map(m);
    if (v) out.push(v);
  }
  return out;
}

function extract(html, finalUrl) {
  const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const metaDesc =
    attr(html.match(/<meta[^>]+name\s*=\s*["']description["'][^>]*>/i)?.[0] || "", "content") ||
    attr(html.match(/<meta[^>]+property\s*=\s*["']og:description["'][^>]*>/i)?.[0] || "", "content");

  const h1 = matchAll(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi, (m) => stripTags(m[1])).filter(Boolean);
  const h23 = matchAll(html, /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi, (m) => stripTags(m[1]))
    .filter(Boolean)
    .slice(0, 12);

  // CTAs: <button> e <a> com texto curto
  const ctas = [];
  for (const t of matchAll(html, /<button[^>]*>([\s\S]*?)<\/button>/gi, (m) => stripTags(m[1]))) {
    if (t && t.length <= 60) ctas.push(t);
  }
  for (const t of matchAll(html, /<a\b[^>]*>([\s\S]*?)<\/a>/gi, (m) => stripTags(m[1]))) {
    if (t && t.length >= 2 && t.length <= 48) ctas.push(t);
  }
  const ctasUnique = [...new Set(ctas)].slice(0, 15);

  // Formulários
  const forms = matchAll(html, /<form[\s\S]*?<\/form>/gi, (m) => m[0]).slice(0, 5);
  const formsDesc = forms.map((f, i) => {
    const fields = [];
    for (const tag of f.match(/<input[^>]*>/gi) || []) {
      const type = (attr(tag, "type") || "text").toLowerCase();
      if (["hidden", "submit", "button"].includes(type)) continue;
      const label = attr(tag, "placeholder") || attr(tag, "name") || attr(tag, "id");
      fields.push(`${label || "(sem nome)"} [${type}]`);
    }
    for (const tag of f.match(/<textarea[^>]*>/gi) || []) {
      fields.push(`${attr(tag, "placeholder") || attr(tag, "name") || "mensagem"} [textarea]`);
    }
    for (const tag of f.match(/<select[^>]*>/gi) || []) {
      fields.push(`${attr(tag, "name") || "(select)"} [select]`);
    }
    const submit =
      stripTags(f.match(/<button[^>]*>([\s\S]*?)<\/button>/i)?.[1] || "") ||
      attr(f.match(/<input[^>]+type\s*=\s*["']submit["'][^>]*>/i)?.[0] || "", "value");
    return `Formulário ${i + 1}: ${fields.length} campo(s) — ${fields.join("; ") || "nenhum campo visível"}${submit ? ` | botão: "${submit}"` : ""}`;
  });

  const bodyHtml = html.match(/<body[\s\S]*?<\/body>/i)?.[0] || html;
  let bodyText = stripTags(bodyHtml);
  let truncated = false;
  if (bodyText.length > MAX_BODY_TEXT) {
    bodyText = bodyText.slice(0, MAX_BODY_TEXT);
    truncated = true;
  }

  const partes = [
    `URL final: ${finalUrl}`,
    title ? `Título (title): ${title}` : null,
    metaDesc ? `Meta description: ${metaDesc}` : null,
    h1.length ? `H1: ${h1.join(" | ")}` : "H1: (nenhum h1 encontrado)",
    h23.length ? `H2/H3:\n- ${h23.join("\n- ")}` : null,
    ctasUnique.length ? `Botões/CTAs encontrados: ${ctasUnique.join(" · ")}` : null,
    formsDesc.length ? `Formulários:\n${formsDesc.join("\n")}` : "Formulários: nenhum encontrado",
    `Texto da página:\n${bodyText}${truncated ? "\n\n(texto truncado)" : ""}`,
  ];
  return partes.filter(Boolean).join("\n\n");
}

export async function fetchLandingPage(rawUrl) {
  let url;
  try {
    url = new URL((rawUrl || "").trim());
  } catch {
    throw new Error("URL inválida. Use o endereço completo, ex.: https://site.com.br/lp");
  }
  if (!/^https?:$/.test(url.protocol)) {
    throw new Error("Só consigo buscar URLs http(s).");
  }

  let resp;
  try {
    resp = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7",
      },
    });
  } catch (err) {
    const motivo = err?.name === "TimeoutError" ? "tempo esgotado (15s)" : err?.message || err;
    throw new Error(`Não consegui acessar a página (${motivo}). Confira a URL ou cole o conteúdo manualmente.`);
  }
  if (!resp.ok) {
    throw new Error(`A página respondeu com erro HTTP ${resp.status}. Confira a URL ou cole o conteúdo manualmente.`);
  }
  const ct = resp.headers.get("content-type") || "";
  if (ct && !/html|xml/i.test(ct)) {
    throw new Error(`A URL não retornou uma página HTML (content-type: ${ct}).`);
  }

  const ab = await resp.arrayBuffer();
  const html = Buffer.from(ab.byteLength > MAX_HTML ? ab.slice(0, MAX_HTML) : ab).toString("utf8");
  const text = extract(html, resp.url || url.href);
  return { text, finalUrl: resp.url || url.href };
}
