import { expect, test } from "@playwright/test";

test("Vietnamese name opens a greeting and replay preserves it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Xem hoa 3D" })).toBeDisabled();
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.getByRole("textbox", { name: "Tên bạn thích" }).fill("Lê Thị Mai");
  await page.getByRole("button", { name: "Để hoa nở vì bạn" }).click();
  await page.getByRole("button", { name: "Mở ngay" }).click();
  await expect(page.getByRole("heading", { name: /Lê Thị Mai, chúc bạn/ })).toBeVisible();
  await page.getByRole("button", { name: "Xem hoa nở lại" }).click();
  await page.getByRole("button", { name: "Mở ngay" }).click();
  await expect(page.getByRole("heading", { name: /Lê Thị Mai, chúc bạn/ })).toBeVisible();
});

test("anonymous greeting works and can switch to English", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Xem hoa 3D" })).toBeDisabled();
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.getByRole("button", { name: "Tiếp tục không cần tên" }).click();
  await page.getByRole("button", { name: "Mở ngay" }).click();
  await expect(page.getByRole("heading", { name: "Chúc bạn một ngày 20/10 thật dịu dàng." })).toBeVisible();
  await page.getByRole("combobox", { name: "Ngôn ngữ" }).selectOption("en");
  await expect(page.getByRole("heading", { name: "Wishing you a gentle Vietnamese Women’s Day." })).toBeVisible();
});

test("320px reduced-motion view has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Xem hoa 3D" })).toBeDisabled();
  const width = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(width.document).toBeLessThanOrEqual(width.viewport);
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.getByRole("button", { name: "Tiếp tục không cần tên" }).click();
  await expect(page.getByRole("heading", { name: "Chúc bạn một ngày 20/10 thật dịu dàng." })).toBeVisible();
});

test("botanical payloads follow the gift lifecycle and use the approved FloralGreeting component", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
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
  await page.getByRole("textbox", { name: "Tên bạn thích" }).fill("Mai");
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

test("matching rose artwork moves through bud, opening, and bloom with a 3D arc", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const bud = page.locator(".rose-phase--bud");
  const opening = page.locator(".rose-phase--opening");
  const bloom = page.locator(".rose-phase--bloom");
  await expect(bud).toHaveJSProperty("naturalWidth", 1024);
  await expect(bud).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await expect(opening).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "Tiếp tục không cần tên" }).click();
  await expect(page.locator(".rose-depth")).toHaveCSS("animation-name", "rose-arc");
  await expect(bloom).toHaveCSS("animation-name", "rose-reveal");
  await page.getByRole("button", { name: "Mở ngay" }).click();
  await expect(bloom).toHaveCSS("opacity", "1");
  await expect(bloom).toHaveJSProperty("naturalWidth", 1024);
});

test("flower, caption, controls, and greeting stay separated across responsive viewports", async ({ page }) => {
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
      const expectedFrameHeight = Math.round(Math.min(500, Math.max(280, height * 0.52)));
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
        artwork: bounds(".rose-bloom"),
        caption: bounds(".flower-caption"),
        mode: bounds(".mode-button"),
        story: bounds(".story-panel"),
        frameOverflow: getComputedStyle(document.querySelector(".flower-frame")!).overflow,
      };
    });
    expect(layout.documentWidth, `${width}×${height}: horizontal overflow`).toBeLessThanOrEqual(width);
    expect(layout.frameOverflow, `${width}×${height}: artwork clipping`).toBe("hidden");
    expect(layout.artwork.bottom, `${width}×${height}: artwork outside frame`).toBeLessThanOrEqual(layout.frame.bottom + 1);
    expect(layout.caption.top, `${width}×${height}: caption overlaps flower`).toBeGreaterThanOrEqual(layout.frame.bottom);
    expect(layout.mode.top, `${width}×${height}: mode control overlaps caption`).toBeGreaterThanOrEqual(layout.caption.bottom);
    if (width <= 800) {
      expect(layout.story.top, `${width}×${height}: greeting overlaps flower`).toBeGreaterThanOrEqual(layout.mode.bottom);
      expect(layout.story.top, `${width}×${height}: flower consumes the full first screen`).toBeLessThan(height);
    }
  }
});
