import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import fs from "node:fs";

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--force-device-scale-factor=1"],
});
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: "rec", size: { width: 1280, height: 720 } },
});
const page = await ctx.newPage();
await page.goto("file://" + process.cwd() + "/video.html");

// espera fonts + screenshot carregarem; tela fica 100% preta (body.pre) até o start
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() =>
  [...document.images].every((i) => i.complete && i.naturalWidth > 0),
);
await page.waitForTimeout(1500); // garante trecho preto no início p/ blackdetect

await page.evaluate(() => window.__START());
await page.waitForTimeout(70000 + 1800); // timeline 70s + margem final

const video = page.video();
await ctx.close();
const path = await video.path();
fs.renameSync(path, "roboavaliador-raw.webm");
await browser.close();
console.log("gravado:", fs.statSync("roboavaliador-raw.webm").size, "bytes");
