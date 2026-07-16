import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import fs from "node:fs";

fs.mkdirSync("shotsite", { recursive: true });
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--force-device-scale-factor=1"],
});

async function shoot(name, { width, height, theme, targets }) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  if (theme) await page.addInitScript((t) => localStorage.setItem("belgos-site-theme", t), theme);
  await page.goto("file:///home/user/roboavaliador/site/index.html");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.body.classList.contains("ready"), undefined, { timeout: 15000 });
  await page.waitForTimeout(1600); // hero terminar de entrar
  await page.screenshot({ path: `shotsite/${name}-hero.png` });
  for (const [id, sel] of targets) {
    await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "start" }), sel);
    await page.waitForTimeout(sel === "#motor" ? 6500 : 1600); // reveals + animações (motor digita)
    await page.screenshot({ path: `shotsite/${name}-${id}.png` });
  }
  await ctx.close();
}

const targets = [
  ["manifesto", "#manifesto"],
  ["como", "#como"],
  ["agente", "#agente"],
  ["fit", "#fit"],
  ["difs", "#difs"],
  ["motor", "#motor"],
  ["robo", "#robo"],
  ["processo", "#processo"],
  ["cta", "#cta"],
  ["footer", "footer"],
  ["marquee", ".marquee"],
];

await shoot("desk", { width: 1440, height: 900, targets });
await shoot("light", { width: 1440, height: 900, theme: "light", targets: [["robo", "#robo"], ["cta", "#cta"]] });
await shoot("mob", { width: 390, height: 844, targets: [["metodo", "#metodo"], ["motor", "#motor"], ["cta", "#cta"]] });

await browser.close();
console.log("shots:", fs.readdirSync("shotsite").length);
