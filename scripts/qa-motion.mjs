import { chromium, expect } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import { root, jsonFile, fingerprint } from "./qa-utils.mjs";

const motionDirectory = "artifacts/quality/final/motion";
await mkdir(join(root, motionDirectory), { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference", recordVideo: { dir: join(root, motionDirectory), size: { width: 390, height: 844 } } });
const page = await context.newPage();
const captures = [];
let report;

async function nextPaint() {
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
}

async function photoMetrics(label) {
  return page.locator(".photo-motion").evaluate((element, metricLabel) => {
    const image = element.querySelector(".photo-bloom-image");
    const host = element.closest("[data-photo-progress]") ?? document.querySelector("[data-photo-progress]");
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return {
      label: metricLabel,
      dataProgress: Number(host?.getAttribute("data-photo-progress")),
      transform: style.transform,
      opacity: Number(style.opacity),
      filter: style.filter,
      clipPath: style.clipPath,
      width: bounds.width,
      height: bounds.height,
      image: image instanceof HTMLImageElement ? { src: image.currentSrc || image.src, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, objectFit: getComputedStyle(image).objectFit } : null,
      animations: element.getAnimations().map((animation) => ({
        currentTime: typeof animation.currentTime === "number" ? animation.currentTime : null,
        playState: animation.playState,
        pending: animation.pending,
        playbackRate: animation.playbackRate,
        duration: animation.effect?.getTiming().duration ?? null,
        progress: animation.effect?.getComputedTiming().progress ?? null,
      })),
    };
  }, label);
}

function activeAnimations(sample) {
  return sample.animations.filter(({ playState, pending }) => playState === "running" || pending);
}

async function captureCheckpoint(progress) {
  const inspector = page.locator(".photo-inspector");
  await inspector.evaluate((element) => { element.style.visibility = "hidden"; });
  const path = `${motionDirectory}/photo-${progress}.png`;
  const bytes = await page.locator(".flower-frame").screenshot({ path: join(root, path) });
  const bounds = await page.locator(".flower-frame").boundingBox();
  captures.push({ path, width: Math.round(bounds.width), height: Math.round(bounds.height), bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  await inspector.evaluate((element) => { element.style.visibility = ""; });
}

try {
  await page.goto("http://localhost:3100/?bloomDebug=1");
  await expect(page.locator("[data-rose-renderer=photograph]")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  const image = page.locator(".photo-bloom-image");
  await expect(image).toBeVisible();
  await image.evaluate((element) => element.decode());
  const inspector = page.locator(".photo-inspector");
  const slider = inspector.locator("input[type=range]");
  for (const name of ["Play", "Pause", "Replay", "Skip"]) await expect(inspector.getByRole("button", { name, exact: true })).toBeVisible();

  const checkpoints = [];
  await slider.fill("0.01");
  for (const value of ["0", "0.25", "0.5", "0.75", "1"]) {
    await slider.fill(value);
    await nextPaint();
    await expect.poll(async () => Number(await page.locator("[data-photo-progress]").first().getAttribute("data-photo-progress"))).toBeCloseTo(Number(value), 2);
    checkpoints.push(await photoMetrics(`checkpoint-${value}`));
    await captureCheckpoint(value);
  }
  const revealStates = new Set(checkpoints.map(({ transform, opacity, filter, clipPath }) => JSON.stringify({ transform, opacity, filter, clipPath })));
  if (revealStates.size < 2) throw new Error("Photo checkpoints do not expose a visible depth-based reveal");

  await slider.fill("0");
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.getByRole("button", { name: "Tiếp tục không cần tên" }).click();
  await expect(page.locator("main[data-botanical-state=BLOOMING]")).toBeVisible();
  await expect.poll(async () => (await photoMetrics("await-running")).animations[0]?.currentTime ?? 0).toBeGreaterThan(100);
  const running = await photoMetrics("running");
  if (!running.animations.some(({ duration }) => duration === 7000)) throw new Error("Photo motion does not expose the required 7000ms Web Animation");

  await page.getByRole("button", { name: "Tạm dừng hoa nở" }).click();
  const pausedBefore = await photoMetrics("paused-before-wait");
  await page.waitForTimeout(500);
  const pausedAfter = await photoMetrics("paused-after-wait");
  expect(pausedAfter.animations[0]?.currentTime).toBeCloseTo(pausedBefore.animations[0]?.currentTime, 0);
  if (activeAnimations(pausedAfter).length) throw new Error("Photo animation continued while paused");

  await page.getByRole("button", { name: "Tiếp tục hoa nở" }).click();
  await expect.poll(async () => (await photoMetrics("await-resumed")).animations[0]?.currentTime ?? 0).toBeGreaterThan((pausedAfter.animations[0]?.currentTime ?? 0) + 50);
  const resumed = await photoMetrics("resumed");
  await page.getByRole("button", { name: "Mở ngay" }).click();
  await expect(page.locator(".greeting-content")).toBeVisible();
  await nextPaint();
  const settled = await photoMetrics("settled-after-skip");
  await page.waitForTimeout(250);
  const idle = await photoMetrics("idle-after-skip");
  if (activeAnimations(idle).length) throw new Error("Completed photo retains an active animation");

  await page.getByRole("button", { name: "Xem hoa nở lại" }).click();
  await expect(page.locator("main")).toHaveClass(/stage-withering/);
  const replayStarted = await photoMetrics("replay-withering");
  await page.locator(".stage-blooming").waitFor({ timeout: 12000 });
  await page.getByRole("button", { name: "Mở ngay" }).click();
  await expect(page.locator(".greeting-content")).toBeVisible();
  await nextPaint();
  const replaySettled = await photoMetrics("replay-settled");
  if (activeAnimations(replaySettled).length) throw new Error("Replay completion left an active photo animation");
  await expect(page.locator("canvas")).toHaveCount(0);

  report = {
    sourceFingerprint: await fingerprint(),
    browser: browser.version(),
    renderer: "photograph",
    expectedDurationMs: 7000,
    checkpoints,
    playback: { running, pausedBefore, pausedAfter, resumed, settled, idle, explicitPauseMs: 500 },
    replay: { started: replayStarted, settled: replaySettled },
    captures,
    canvasCount: 0,
    caveat: "Headless browser evidence for the depth-based photographic reveal; it does not claim physical petal unfolding or 3D geometry.",
  };
} finally {
  const video = page.video();
  await context.close();
  if (report && video) {
    const file = await video.path();
    const bytes = await readFile(file);
    report.video = { path: relative(root, file).replaceAll("\\", "/"), width: 390, height: 844, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
    await jsonFile(`${motionDirectory}/results.json`, report);
  }
  await browser.close();
}
