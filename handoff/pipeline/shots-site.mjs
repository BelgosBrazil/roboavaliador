import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import fs from "node:fs";

fs.mkdirSync("shotsite", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--force-device-scale-factor=1"],
});

function waitFor(sel) {
  if (sel === "#motor") return 6500;
  if (sel.includes("revops") || sel === "#kpis" || sel === "#ladder" || sel.includes("flow")) return 4300;
  if (sel === "#agente") return 9000; // chat mais longo
  return 1700;
}

async function shoot(name, { width, height, theme, targets }) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  if (theme) await page.addInitScript((t) => localStorage.setItem("belgos-site-theme", t), theme);
  await page.goto("file:///home/user/roboavaliador/site/index.html");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.body.classList.contains("ready"), undefined, { timeout: 15000 });
  await page.waitForTimeout(2000); // hero + globo girando
  await page.screenshot({ path: `shotsite/${name}-hero.png` });
  for (const [id, sel] of targets) {
    await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "start" }), sel);
    await page.waitForTimeout(waitFor(sel));
    await page.screenshot({ path: `shotsite/${name}-${id}.png` });
  }
  await ctx.close();
}

const targets = [
  ["manifesto", "#manifesto"],
  ["como", "#como"],
  ["motor", "#motor"],
  ["agente", "#agente"],
  ["robo", "#robo"],
  ["produtos", "#produtos"],
  ["revops", "#revops"],
  ["revops-board", "#revops .board-wrap"],
  ["revops-flow", "#revops .flow-wrap"],
  ["revops-ladder", "#ladder"],
  ["kpis", "#kpis"],
  ["fit", "#fit"],
  ["processo", "#processo"],
  ["difs", "#difs"],
  ["cta", "#cta"],
  ["footer", "footer"],
];

await shoot("desk", { width: 1440, height: 900, targets });
await shoot("light", {
  width: 1440, height: 900, theme: "light",
  targets: [["revops", "#revops"], ["revops-board", "#revops .board-wrap"], ["robo", "#robo"], ["cta", "#cta"]],
});
await shoot("mob", {
  width: 390, height: 844,
  targets: [["como", "#como"], ["motor", "#motor"], ["revops-board", "#revops .board-wrap"], ["kpis", "#kpis"], ["cta", "#cta"]],
});

await browser.close();
console.log("shots:", fs.readdirSync("shotsite").length);
