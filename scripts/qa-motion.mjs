import { chromium, expect } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import { root, jsonFile, fingerprint } from "./qa-utils.mjs";

await mkdir(join(root, "artifacts/quality/final/motion"), { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference", recordVideo: { dir: join(root, "artifacts/quality/final/motion"), size: { width: 390, height: 844 } } });
const page = await context.newPage();
const stats = () => page.evaluate(() => window.__noBloomStats?.());
let report;
try {
  await page.goto("http://localhost:3100/?bloomDebug=1");
  await expect(page.locator("[data-rose-renderer=webgl]")).toBeVisible();
  const slider = page.locator(".rose-inspector input[type=range]");
  for (const value of ["0", "0.25", "0.5", "0.75", "1"]) {
    await slider.fill(value);
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    await page.locator(".rose-inspector").evaluate((element) => { element.style.visibility = "hidden"; });
    await page.locator(".flower-frame").screenshot({ path: join(root, `artifacts/quality/final/motion/rose-${value}.png`) });
    await page.locator(".rose-inspector").evaluate((element) => { element.style.visibility = ""; });
  }
  await page.getByRole("button", { name: "Mở món quà" }).click();
  const playbackStart = performance.now();
  const firstFrame = (await stats()).frame;
  await page.getByRole("button", { name: "Tiếp tục không cần tên" }).click();
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(0.15);
  await page.getByRole("button", { name: "Tạm dừng hoa nở" }).click();
  const paused = await slider.inputValue();
  await page.waitForTimeout(500);
  await expect(slider).toHaveValue(paused);
  await page.getByRole("button", { name: "Tiếp tục hoa nở" }).click();
  await page.locator(".greeting-content").waitFor({ timeout: 12000 });
  // Allow the requested final-pose render to commit before checking idle work.
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  const settled = await stats();
  const playbackWallMs = performance.now() - playbackStart;
  await page.waitForTimeout(500);
  const idle = await stats();
  if (idle.frame !== settled.frame) throw new Error("The settled scene is still rendering");
  const replayMemory = [];
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Xem hoa nở lại" }).click();
    await expect.poll(async () => { const value = Number(await slider.inputValue()); return await page.locator(".stage-withering").count() === 1 && value > 0 && value < 0.95; }, { intervals: [20, 40, 50] }).toBe(true);
    await page.locator(".stage-blooming").waitFor();
    await page.getByRole("button", { name: "Mở ngay" }).click();
    await page.locator(".greeting-content").waitFor();
    replayMemory.push(await stats());
  }
  if (new Set(replayMemory.map((sample) => sample.geometries)).size !== 1) throw new Error("Replay geometry count grows");
  report = { sourceFingerprint: await fingerprint(), browser: browser.version(), settled, idle, replayMemory, playbackWallMs, explicitPauseMs: 500, observedRenderThroughput: (settled.frame - firstFrame) / ((playbackWallMs - 500) / 1000), caveat: "Headless desktop WebGL/debug-controller checks; throughput includes UI overhead, excludes explicit 500ms pause, and is not real-phone FPS." };
} finally {
  const video = page.video();
  await context.close();
  if (report && video) {
    const file = await video.path();
    const bytes = await readFile(file);
    report.video = { path: relative(root, file).replaceAll("\\", "/"), width: 390, height: 844, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
    await jsonFile("artifacts/quality/final/motion/results.json", report);
  }
  await browser.close();
}
