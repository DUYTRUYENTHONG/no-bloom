import { expect, test } from "@playwright/test";

test("Vietnamese name opens a greeting and replay preserves it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Xem hoa 3D" })).toBeDisabled();
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
  await expect(page.getByRole("button", { name: "Xem hoa 3D" })).toBeDisabled();
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
  await expect(page.getByRole("button", { name: "Xem hoa 3D" })).toBeDisabled();
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

test("procedural roses render through the inspection poses and skip preserves greeting", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?bloomDebug=1");
  await expect(page.locator("[data-rose-renderer=webgl]")).toBeVisible();
  const slider = page.locator(".rose-inspector input[type=range]");
  for (const value of ["0", "0.25", "0.5", "0.75", "1"]) {
    await slider.fill(value);
    await expect(slider).toHaveValue(value);
  }
  await slider.fill("0");
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.getByRole("button", { name: "Tiếp tục không cần tên" }).click();
  await expect(page.locator("main[data-botanical-state=BLOOMING]")).toBeVisible();
  await page.getByRole("button", { name: "Mở ngay" }).click();
  await expect(page.getByRole("heading", { name: "Chúc bạn một ngày 20/10 thật dịu dàng." })).toBeVisible();
  expect(errors).toEqual([]);
});

test("WebGL failure keeps the static flowers and personal greeting usable", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind, ...args) {
      if (kind === "webgl2") return null;
      return original.call(this, kind, ...args);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.locator("[data-rose-renderer=static]")).toBeVisible();
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.getByRole("textbox", { name: "Tên của bạn" }).fill("Mai");
  await page.getByRole("button", { name: "Để hoa nở vì bạn" }).click();
  await expect(page.getByRole("heading", { name: /Mai, chúc bạn/ })).toBeVisible();
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
      const expectedFrameHeight = width <= 350 ? 290 : width <= 480 ? 330 : Math.round(Math.min(450, Math.max(300, height * 0.45)));
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

test("every flower choice has attached bud and bloom poses and remains selectable on mobile", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?bloomDebug=1");
  await page.getByRole("button", { name: "Mở món quà" }).click();
  for (const kind of ["rose", "peach-rose", "peony", "cherry", "lily", "alstroemeria", "orchid"]) {
    await page.locator("#flower-kind").selectOption(kind);
    await expect(page.locator("[data-rose-renderer=webgl]")).toBeVisible();
    const slider = page.locator(".rose-inspector input[type=range]");
    await slider.fill("0");
    await slider.fill("0.5");
    await slider.fill("1");
    await expect(page.locator("main")).toHaveAttribute("data-botanical-state", "SPROUT");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
  expect(errors).toEqual([]);
});

test("orchid has a species-matched fallback when WebGL is unavailable", async ({ page }) => {
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
  await page.goto("/");
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.locator("#flower-kind").selectOption("orchid");
  await expect(page.locator(".static-rose-fallback svg")).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục không cần tên" }).click();
  await expect(page.getByRole("heading", { name: "Chúc bạn một ngày 20/10 thật dịu dàng." })).toBeVisible();
});

test("personal link opens directly for the named recipient and guide remains usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?for=L%C3%AA+Th%E1%BB%8B+Mai&flower=peony");
  await expect(page.getByRole("heading", { name: /Lê Thị Mai, chúc bạn/ })).toBeVisible();
  await expect(page.locator(".caption-name")).toContainText("PEON");
  await page.getByRole("button", { name: "Mở bạn đồng hành" }).click();
  await expect(page.getByText("Bạn đồng hành NỞ")).toBeVisible();
  await page.getByRole("button", { name: "Cách tạo liên kết riêng?" }).click();
  await expect(page.getByRole("log")).toContainText("Sao chép liên kết riêng");
  await page.getByRole("button", { name: "Đóng bạn đồng hành" }).first().click();
  await page.getByRole("button", { name: "Tạo lời chúc mới" }).click();
  await expect(page.getByRole("textbox", { name: "Tên của bạn" })).toHaveValue("");
  await expect(page).not.toHaveURL(/for=/);
});
