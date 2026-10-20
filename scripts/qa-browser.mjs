import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { join } from "node:path";
import { root, staticSite, fingerprint, jsonFile, receipt, requireCurrentExport } from "./qa-utils.mjs";

const mode = process.argv[2] ?? "a11y";
const label = process.argv[3] ?? "final";
if (!["a11y", "visual"].includes(mode) || !/^[a-z0-9-]+$/.test(label)) throw new Error("Invalid QA mode or label");
await requireCurrentExport(label);
const site = await staticSite();
const browser = await chromium.launch({ ...(process.env.CI ? {} : { channel: "chrome" }), headless: true });
const results = [];
const artifacts = [];
const directory = `artifacts/quality/${label}`;
await mkdir(join(root, directory), { recursive: true });
async function capture(page, name, locator = page) {
  const path = `${directory}/${name}.png`;
  await locator.screenshot({ path: join(root, path), ...(locator === page ? { fullPage: true } : {}) });
  const bytes = await readFile(join(root, path));
  const { width, height } = await sharp(bytes).metadata();
  artifacts.push({ path, width, height, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
}
async function audit(page, name) {
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  results.push({ state: name, violations: scan.violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })) });
}
async function waitForPhoto(page) {
  const renderer = page.locator("[data-rose-renderer=photograph]");
  await renderer.waitFor();
  const image = renderer.locator(".photo-bloom-image");
  await image.waitFor();
  await image.evaluate((element) => element.decode());
  const pathname = await image.evaluate((element) => new URL(element.currentSrc || element.src).pathname);
  if (!/^\/no-bloom\/flowers\/[a-z-]+\.webp$|^\/flowers\/[a-z-]+\.webp$/.test(pathname)) throw new Error(`Unexpected flower photo source: ${pathname}`);
  if (await page.locator("canvas").count()) throw new Error("Recipient route created a canvas");
}
try {
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  if (mode === "a11y") {
    for (const locale of ["vi", "en"]) {
      await page.goto(site.url);
      await page.getByRole("button", { name: "Mở món quà" }).waitFor();
      await waitForPhoto(page);
      if (locale === "en") await page.getByRole("combobox").selectOption("en");
      await audit(page, `${locale}-invitation`);
      await page.getByRole("button", { name: locale === "vi" ? "Mở món quà" : "Open your gift" }).click();
      await audit(page, `${locale}-name`);
      await page.getByRole("button", { name: locale === "vi" ? "Để hoa nở vì bạn" : "Let your flower bloom" }).click();
      await audit(page, `${locale}-invalid-name`);
      await page.getByRole("button", { name: locale === "vi" ? "Tiếp tục không cần tên" : "Continue without a name" }).click();
      await page.locator(".greeting-content").waitFor();
      await audit(page, `${locale}-greeting`);
      await page.getByRole("button", { name: locale === "vi" ? "Mở bạn đồng hành" : "Open companion" }).click();
      await audit(page, `${locale}-guide`);
      await page.getByRole("button", { name: locale === "vi" ? "Nhảy không nhạc" : "Dance without music" }).click();
      await audit(page, `${locale}-dance`);
    }
  } else {
    for (const [width, height] of [[1440,900],[1024,768],[768,1024],[390,844],[360,800],[320,568],[844,390]]) {
      await page.setViewportSize({ width, height });
      await page.goto(site.url);
      await page.getByRole("button", { name: "Mở món quà" }).waitFor();
      await waitForPhoto(page);
      await capture(page, `${width}-${height}-invitation`);
      await page.getByRole("button", { name: "Mở món quà" }).click();
      await capture(page, `${width}-${height}-name`);
      await page.getByRole("textbox", { name: "Tên của bạn" }).fill("Trần Minh Ánh Bình An".repeat(2));
      await page.getByRole("button", { name: "Để hoa nở vì bạn" }).click();
      await page.locator(".greeting-content").waitFor();
      await capture(page, `${width}-${height}-greeting`);
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`Overflow at ${width}x${height}`);
      if (width === 390) {
        await page.getByRole("button", { name: "Mở bạn đồng hành" }).click();
        await page.getByRole("button", { name: "Nhảy không nhạc" }).click();
        await capture(page, "390-dance");
        await page.getByRole("dialog").getByRole("button", { name: "Đóng bạn đồng hành" }).click();
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("http://localhost:3100/?bloomDebug=1");
    await waitForPhoto(page);
    const inspector = page.locator(".photo-inspector");
    const slider = inspector.locator("input[type=range]");
    await slider.waitFor();
    await slider.fill("0.01");
    for (const progress of ["0", "0.25", "0.5", "0.75", "1"]) {
      await slider.fill(progress);
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
      const actual = Number(await page.locator("[data-photo-progress]").first().getAttribute("data-photo-progress"));
      if (Math.abs(actual - Number(progress)) > 0.01) throw new Error(`Photo checkpoint ${progress} reported ${actual}`);
      await inspector.evaluate((element) => { element.style.visibility = "hidden"; });
      await capture(page, `photo-reveal-${progress}`, page.locator(".flower-frame"));
      await inspector.evaluate((element) => { element.style.visibility = ""; });
    }
  }
  const report = { sourceFingerprint: await fingerprint(), checkedAt: new Date().toISOString(), browser: browser.version(), mode, results, errors, artifacts };
  await jsonFile(`${directory}/${mode}.json`, report);
  const failure = errors.length > 0 || results.some((result) => result.violations.length > 0);
  console.log(`${mode}: ${failure ? "FAIL" : "PASS"}; ${results.reduce((sum, result) => sum + result.violations.length, 0)} accessibility findings; ${artifacts.length} captures.`);
  await receipt(mode, { status: failure ? "FAIL" : "PASS", evidence: `${directory}/${mode}.json` });
  if (failure) process.exitCode = 1;
} finally { await browser.close(); await site.close(); }
