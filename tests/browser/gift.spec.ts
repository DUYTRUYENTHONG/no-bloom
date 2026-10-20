import { expect, test, type Page } from "@playwright/test";

const flowerKinds = ["rose", "peach-rose", "peony", "cherry", "lily", "alstroemeria", "orchid"] as const;
const recordedKinds = ["alstroemeria", "orchid"] as const;
type FlowerKind = (typeof flowerKinds)[number];

async function expectPhotograph(page: Page, kind?: FlowerKind) {
  await expect(page.locator("[data-rose-renderer=photograph]")).toBeVisible();
  const image = page.locator(".photo-bloom-image");
  await expect(image).toBeVisible();
  if (kind) await expect(image).toHaveAttribute("src", new RegExp(`(?:^|/)flowers/${kind}\\.webp(?:\\?.*)?$`));
  await image.evaluate((element: HTMLImageElement) => element.decode());
  await expect(page.locator("canvas")).toHaveCount(0);
}

function isRecordedKind(kind: FlowerKind): kind is (typeof recordedKinds)[number] {
  return recordedKinds.includes(kind as (typeof recordedKinds)[number]);
}

async function expectRecordedBloom(page: Page, kind: (typeof recordedKinds)[number]) {
  const renderer = page.locator(`[data-rose-renderer=recorded-bloom][data-flower=${kind}]`);
  await expect(renderer).toBeVisible();
  const image = renderer.locator("img");
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("src", new RegExp(`(?:^|/)flowers/${kind}-(?:bud|open)\\.webp(?:\\?.*)?$`));
  await image.evaluate((element: HTMLImageElement) => element.decode());
  await expect(page.locator("canvas")).toHaveCount(0);
}

test("Vietnamese name opens a greeting and replay preserves it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expectPhotograph(page, "rose");
  await expect(page.locator(".mode-button")).toHaveCount(0);
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.getByRole("textbox", { name: "Tên của bạn" }).fill("Lê Thị Mai");
  await page.getByRole("button", { name: "Để hoa nở vì bạn" }).click();
  await expect(page.getByRole("heading", { name: /Lê Thị Mai, chúc bạn/ })).toBeVisible();
  await page.getByRole("button", { name: "Xem hoa nở lại" }).click();
  await expect(page.getByRole("heading", { name: /Lê Thị Mai, chúc bạn/ })).toBeVisible();
});

test("anonymous greeting works and can switch to English", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expectPhotograph(page, "rose");
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.getByRole("button", { name: "Tiếp tục không cần tên" }).click();
  await expect(page.getByRole("heading", { name: "Chúc bạn một ngày 20/10 thật dịu dàng." })).toBeVisible();
  await page.getByRole("combobox", { name: "Ngôn ngữ" }).selectOption("en");
  await expect(page.getByRole("heading", { name: "Wishing you a gentle Vietnamese Women’s Day." })).toBeVisible();
});

test("320px reduced-motion view has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expectPhotograph(page, "rose");
  const width = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(width.document).toBeLessThanOrEqual(width.viewport);
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.getByRole("button", { name: "Tiếp tục không cần tên" }).click();
  await expect(page.getByRole("heading", { name: "Chúc bạn một ngày 20/10 thật dịu dàng." })).toBeVisible();
});

test("botanical payloads follow the gift lifecycle and use the approved FloralGreeting component", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    (window as typeof window & { botanicalPayloads: unknown[] }).botanicalPayloads = [];
    window.addEventListener("no-bloom:a2ui", (event) => {
      (window as typeof window & { botanicalPayloads: unknown[] }).botanicalPayloads.push((event as CustomEvent).detail);
    });
  });
  await page.goto("/");
  await expect(page.locator("main[data-botanical-state='BUD']")).toBeVisible();
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await expect(page.locator("main[data-botanical-state='SPROUT']")).toBeVisible();
  await page.getByRole("button", { name: "Để hoa nở vì bạn" }).click();
  await expect(page.locator("main[data-botanical-state='WITHER_RELOAD']")).toBeVisible();
  await page.getByRole("textbox", { name: "Tên của bạn" }).fill("Mai");
  await page.getByRole("button", { name: "Để hoa nở vì bạn" }).click();
  await expect(page.locator("main[data-botanical-state='BLOOMING']")).toBeVisible();
  await page.getByRole("button", { name: "Mở ngay" }).click();
  await expect(page.locator("main[data-botanical-state='FULL_BLOOM']")).toBeVisible();
  await page.getByRole("button", { name: "Xem hoa nở lại" }).click();
  await expect(page.locator("main[data-botanical-state='BLOOMING']")).toBeVisible();
  const payloads = await page.evaluate(() => (window as typeof window & { botanicalPayloads: Array<{ type: string; botanicalState: string; componentSpec: { name: string } }> }).botanicalPayloads);
  expect(payloads.map((payload) => payload.botanicalState)).toEqual(expect.arrayContaining(["BUD", "SPROUT", "WITHER_RELOAD", "BLOOMING", "FULL_BLOOM"]));
  expect(payloads.every((payload) => payload.type === "GENERATIVE_UI_RESPONSE" && payload.componentSpec.name === "FloralGreeting")).toBe(true);
});

test("photographs expose honest inspection checkpoints and skip preserves greeting", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?bloomDebug=1");
  await expectPhotograph(page, "rose");
  const inspector = page.locator(".photo-inspector");
  const slider = inspector.locator("input[type=range]");
  await slider.fill("0.01");
  for (const value of ["0", "0.25", "0.5", "0.75", "1"]) {
    await slider.fill(value);
    await expect(slider).toHaveValue(value);
    await expect.poll(async () => Number(await page.locator("[data-photo-progress]").first().getAttribute("data-photo-progress"))).toBeCloseTo(Number(value), 2);
  }
  await slider.fill("0");
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.getByRole("button", { name: "Tiếp tục không cần tên" }).click();
  await expect(page.locator("main[data-botanical-state=BLOOMING]")).toBeVisible();
  await inspector.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("heading", { name: "Chúc bạn một ngày 20/10 thật dịu dàng." })).toBeVisible();
  expect(errors).toEqual([]);
});

test("recipient route uses a real photograph without a canvas", async ({ page }) => {
  await page.goto("/");
  await expectPhotograph(page, "rose");
  await expect(page.locator(".static-rose-fallback, .photo-bloom-image[src$='.svg']")).toHaveCount(0);
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.getByRole("textbox", { name: "Tên của bạn" }).fill("Mai");
  await page.getByRole("button", { name: "Để hoa nở vì bạn" }).click();
  await page.getByRole("button", { name: "Mở ngay" }).click();
  await expect(page.getByRole("heading", { name: /Mai, chúc bạn/ })).toBeVisible();
});

test("flower and greeting stay separated across responsive viewports", async ({ page }) => {
  await page.setViewportSize({ width: 591, height: 604 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.getByRole("button", { name: "Tiếp tục không cần tên" }).click();
  await page.getByRole("button", { name: "Mở ngay" }).click();
  await expect(page.getByRole("heading", { name: "Chúc bạn một ngày 20/10 thật dịu dàng." })).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);

  for (const [width, height] of [[320, 568], [375, 667], [390, 844], [430, 932], [591, 604], [768, 900], [800, 600], [801, 600], [1024, 768], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator(".story-panel")).toHaveCSS("order", width <= 800 ? "1" : "0");
    if (width <= 800) {
      const expectedFrameHeight = width <= 350 ? 320 : width <= 480 ? 380 : Math.round(Math.min(480, Math.max(360, height * 0.66)));
      await expect.poll(async () => Math.round(await page.locator(".flower-frame").evaluate((element) => element.getBoundingClientRect().height))).toBe(expectedFrameHeight);
    }
    const layout = await page.evaluate(() => {
      const bounds = (selector: string) => {
        const rect = document.querySelector(selector)!.getBoundingClientRect();
        return { top: rect.top + scrollY, bottom: rect.bottom + scrollY, height: rect.height };
      };
      return {
        documentWidth: document.documentElement.scrollWidth,
        frame: bounds(".flower-frame"),
        panel: bounds(".flower-panel"),
        artwork: bounds(".photo-bloom-image"),
        story: bounds(".story-panel"),
        frameOverflow: getComputedStyle(document.querySelector(".flower-frame")!).overflow,
      };
    });
    expect(layout.documentWidth, `${width}×${height}: horizontal overflow`).toBeLessThanOrEqual(width);
    expect(layout.frameOverflow, `${width}×${height}: artwork clipping`).toBe("hidden");
    expect(layout.artwork.top, `${width}×${height}: artwork outside frame`).toBeGreaterThanOrEqual(layout.frame.top - 1);
    expect(layout.artwork.bottom, `${width}×${height}: artwork outside frame`).toBeLessThanOrEqual(layout.frame.bottom + 1);
    if (width <= 800) {
      expect(layout.panel.bottom, `${width}×${height}: flower exceeds its panel`).toBeGreaterThanOrEqual(layout.frame.bottom);
      expect(layout.story.top, `${width}×${height}: greeting overlaps flower`).toBeGreaterThanOrEqual(layout.panel.bottom);
      expect(layout.story.top, `${width}×${height}: greeting is detached from flower`).toBeLessThanOrEqual(layout.frame.bottom + 64);
      expect(layout.story.top, `${width}×${height}: flower consumes the full first screen`).toBeLessThan(height);
    }
  }
});

test("every flower choice has matching approved media and remains selectable on mobile", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?bloomDebug=1");
  await page.getByRole("button", { name: "Mở món quà" }).click();
  for (const kind of flowerKinds) {
    await page.locator("#flower-kind").selectOption(kind);
    if (isRecordedKind(kind)) {
      await expectRecordedBloom(page, kind);
    } else {
      await expectPhotograph(page, kind);
      const slider = page.locator(".photo-inspector input[type=range]");
      await slider.fill("0.01");
      await slider.fill("0");
      await slider.fill("0.5");
      await slider.fill("1");
      await expect.poll(async () => Number(await page.locator("[data-photo-progress]").first().getAttribute("data-photo-progress"))).toBeCloseTo(1, 2);
      await page.locator(".photo-inspector").evaluate((element) => { element.style.visibility = "hidden"; });
    }
    await page.locator(".flower-frame").screenshot({ path: `artifacts/quality/photographs/${kind}.png` });
    if (!isRecordedKind(kind)) await page.locator(".photo-inspector").evaluate((element) => { element.style.visibility = ""; });
    await expect(page.locator("main")).toHaveAttribute("data-botanical-state", "SPROUT");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
  expect(errors).toEqual([]);
});

test("orchid uses its species-matched recorded bloom renderer", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.locator("#flower-kind").selectOption("orchid");
  await expectRecordedBloom(page, "orchid");
  await page.getByRole("button", { name: "Tiếp tục không cần tên" }).click();
  await page.getByRole("button", { name: "Mở ngay" }).click();
  await expect(page.getByRole("heading", { name: "Chúc bạn một ngày 20/10 thật dịu dàng." })).toBeVisible();
});

test("personal link opens directly for the named recipient and guide remains usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?for=L%C3%AA+Th%E1%BB%8B+Mai&flower=peony");
  await expect(page.getByRole("heading", { name: /Lê Thị Mai, chúc bạn/ })).toBeVisible();
  await expectPhotograph(page, "peony");
  await page.getByRole("button", { name: "Mở bạn đồng hành" }).click();
  await expect(page.getByText("Bạn đồng hành NỞ")).toBeVisible();
  await page.getByRole("button", { name: "Cách tạo liên kết riêng?" }).click();
  await expect(page.getByRole("log")).toContainText("Sao chép liên kết riêng");
  await page.getByRole("button", { name: "Đóng bạn đồng hành" }).first().click();
  await page.getByRole("button", { name: "Tạo lời chúc mới" }).click();
  await expect(page.getByRole("textbox", { name: "Tên của bạn" })).toHaveValue("");
  await expect(page).not.toHaveURL(/for=/);
});
