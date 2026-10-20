import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const output = "artifacts/bloom";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader"] });
for (const [width, height] of [[1440, 900], [1024, 768], [768, 900], [390, 844], [320, 740]].filter(([width]) => !process.env.BLOOM_WIDTH || String(width) === process.env.BLOOM_WIDTH)) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "no-preference" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://localhost:3100/?bloomDebug=1");
  await page.locator(".rose-inspector input[type=range]").waitFor();
  await page.locator("[data-rose-renderer=webgl]").waitFor({ timeout: 30000 }).catch(() => {});
  for (const value of [0, 0.25, 0.5, 0.75, 1]) {
    await page.locator(".rose-inspector").evaluate((element) => { element.style.opacity = "1"; });
    await page.locator(".rose-inspector input[type=range]").fill(String(value));
    await page.waitForTimeout(180);
    await page.locator(".rose-inspector").evaluate((element) => { element.style.opacity = "0"; });
    await page.locator(".flower-panel").screenshot({ path: `${output}/${width}-${value}.png` });
  }
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.getByRole("textbox", { name: "Tên bạn thích" }).fill("Mai");
  await page.getByRole("button", { name: "Để hoa nở vì bạn" }).click();
  await page.getByRole("button", { name: "Mở ngay" }).click();
  await page.getByRole("heading", { name: /Mai, chúc bạn/ }).waitFor();
  await page.screenshot({ path: `${output}/${width}-greeting.png`, fullPage: true });
  const state = await page.locator(".rose-bloom").getAttribute("data-rose-renderer");
  const stats = await page.evaluate(() => window.__noBloomStats?.() ?? null);
  console.log(`${width}x${height}: ${state}; render=${JSON.stringify(stats)}; errors=${errors.length ? errors.slice(0, 2).join(" | ") : "none"}`);
  await page.close();
}
await browser.close();
