import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import fs from "node:fs";

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--force-device-scale-factor=1", "--autoplay-policy=no-user-gesture-required"],
});
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: "rec3", size: { width: 1280, height: 720 } },
});
const page = await ctx.newPage();
await page.goto("file://" + process.cwd() + "/video2.html");

// fonts + todos os clipes com dados suficientes
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(
  () => [...document.querySelectorAll("video")].every((v) => v.readyState >= 3),
  undefined,
  { timeout: 60000 },
);
const total = await page.evaluate(() => window.__TOTAL);
console.log("timeline total:", total, "ms");
await page.waitForTimeout(1500); // trecho preto p/ blackdetect

await page.evaluate(() => window.__START());
await page.waitForTimeout(total + 1800);

const video = page.video();
await ctx.close();
const path = await video.path();
fs.renameSync(path, "master-raw.webm");
await browser.close();
console.log("gravado:", fs.statSync("master-raw.webm").size, "bytes");
