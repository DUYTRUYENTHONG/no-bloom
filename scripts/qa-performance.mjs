import { chromium } from "@playwright/test";
import { cpus, totalmem, platform } from "node:os";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { root, staticSite, fingerprint, jsonFile, receipt, requireCurrentExport } from "./qa-utils.mjs";

const label = process.argv[2] ?? "latest";
const sourceFingerprint = await fingerprint();
if (!/^[a-z0-9-]+$/.test(label)) throw new Error("Use a simple evidence label");
await requireCurrentExport(label);
const site = await staticSite();
const browser = await chromium.launch({ channel: "chrome", headless: true });
const runs = [];
try {
  await mkdir(join(root, "artifacts/quality", label), { recursive: true });
  for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1600000 / 8, uploadThroughput: 750000 / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    let bytes = 0;
    cdp.on("Network.loadingFinished", (event) => { bytes += event.encodedDataLength; });
    await page.addInitScript(() => {
      window.__qaPerf = { lcp: 0, cls: 0, longTasks: [] };
      new PerformanceObserver((list) => { for (const item of list.getEntries()) window.__qaPerf.lcp = item.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => { for (const item of list.getEntries()) if (!item.hadRecentInput) window.__qaPerf.cls += item.value; }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => { for (const item of list.getEntries()) window.__qaPerf.longTasks.push(item.duration); }).observe({ type: "longtask", buffered: true });
    });
    await page.goto(site.url, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Mở món quà" }).waitFor();
    // Fixed observation window includes real production artwork and deferred work.
    await page.waitForTimeout(45000);
    const initial = await page.evaluate(() => ({ ...window.__qaPerf, resources: performance.getEntriesByType("resource").map((r) => ({ name: new URL(r.name).pathname, bytes: r.transferSize })), canvases: document.querySelectorAll("canvas").length }));
    const start = performance.now();
    await page.getByRole("button", { name: "Mở món quà" }).click();
    await page.getByRole("textbox", { name: "Tên của bạn" }).waitFor();
    const clickToFieldMs = performance.now() - start;
    if (run === 0) await page.screenshot({ path: join(root, `artifacts/quality/${label}/390-name.png`), fullPage: true });
    runs.push({ lcpMs: initial.lcp, cls: initial.cls, observedTransferBytes: bytes, canvasesAtInvitation: initial.canvases, longTaskCount: initial.longTasks.length, longestTaskMs: Math.max(0, ...initial.longTasks), clickToFieldMs, resources: initial.resources });
    console.log(`Cold load ${run + 1}/3: LCP ${Math.round(initial.lcp)}ms, ${bytes} bytes, ${initial.canvases} canvas`);
    await context.close();
  }
  const stats = (key) => { const values = runs.map((run) => run[key]).sort((a, b) => a - b); return { median: values[1], min: values[0], max: values[2] }; };
  const report = { measuredAt: new Date().toISOString(), sourceFingerprint, browser: browser.version(), environment: { platform: platform(), cpu: cpus()[0]?.model, logicalCpus: cpus().length, memoryGB: Math.round(totalmem() / 1024 ** 3), viewport: "390x844", network: "1.6Mbps down/750Kbps up, 150ms RTT", cpuSlowdown: 4, cache: "new context; browser cache disabled for every run", observationMs: 45000 }, caveat: "Desktop headless Chrome lab results, not field p75, real-phone FPS or real-user INP. LCP is bounded by the observation window; transferred bytes include all completed requests in that window.", runs, summary: Object.fromEntries(["lcpMs", "cls", "observedTransferBytes", "clickToFieldMs", "longestTaskMs"].map((key) => [key, stats(key)])) };
  await jsonFile(`artifacts/quality/${label}/performance.json`, report);
  console.log(JSON.stringify(report.summary, null, 2));
  await receipt("performance", { status: runs.every((r) => r.lcpMs > 0 && r.lcpMs <= 2500 && r.cls <= 0.1) ? "PASS" : "FAIL", evidence: `artifacts/quality/${label}/performance.json` });
  if (runs.some((r) => r.lcpMs <= 0 || r.lcpMs > 2500 || r.cls > 0.1)) process.exitCode = 1;
} finally { await browser.close(); await site.close(); }
