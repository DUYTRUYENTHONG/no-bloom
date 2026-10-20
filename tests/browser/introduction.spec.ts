import { test, expect } from "@playwright/test";

test("actor introduction jumps, offers and docks without layout shifts", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const intro = page.locator(".actor-introduction");
  await expect(intro).toHaveAttribute("data-active", "true");
  const scene = page.locator(".flower-panel");
  const before = await scene.boundingBox();
  await page.evaluate(() => {
    const image = document.querySelector(".actor-introduction>img")!;
    const animation = image.getAnimations()[0]; animation.pause(); animation.currentTime = 2400;
  });
  const box = await intro.locator("img").boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
  expect(await scene.boundingBox()).toEqual(before);
  await page.evaluate(() => document.querySelector(".actor-introduction>img")!.getAnimations()[0].finish());
  await expect(intro).toHaveAttribute("data-active", "false");
  await expect(page.getByRole("button", { name: "Mở bạn đồng hành" })).toBeVisible();
  expect(await page.locator("canvas").count()).toBe(0);
});

test("actor introduction Escape returns focus without a message and does not repeat on locale change", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('.actor-introduction')).toHaveAttribute('data-active','true');
  await expect(page.locator('.actor-introduction-note')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Bỏ qua giới thiệu'})).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole("button", { name: "Mở bạn đồng hành" })).toBeFocused();
  await page.getByRole("combobox", { name: "Ngôn ngữ" }).selectOption("en");
  await expect(page.locator(".actor-introduction")).toHaveAttribute("data-active", "false");
});

test("reduced motion omits the actor entrance and gift stays available", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".actor-introduction")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Bỏ qua giới thiệu" })).toHaveCount(0);
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await expect(page.getByRole("textbox", { name: "Tên của bạn" })).toBeVisible();
});

test("actor introduction yields immediately to gift and mobile scroll", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await expect(page.locator(".actor-introduction")).toHaveAttribute("data-active", "true");
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await expect(page.locator(".actor-introduction")).toHaveAttribute("data-active", "false");
  await expect(page.getByRole("textbox", { name: "Tên của bạn" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const [width, height] of [[1440,900],[390,844],[320,568],[844,390]]) {
  test(`actor introduction remains framed at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    // Capture the real timeline deterministically from its first frame.
    await page.addInitScript(() => {
      const original = Element.prototype.animate;
      Element.prototype.animate = function (frames, options) {
        const animation = original.call(this, frames, options);
        if (this.matches('.actor-introduction>img')) animation.pause();
        return animation;
      };
    });
    await page.goto("/");
    await expect(page.locator(".actor-introduction")).toHaveAttribute("data-active", "true");
    for (const time of [0,800,1400,2400,3200]) {
      await page.evaluate((time) => { const a = document.querySelector(".actor-introduction>img")!.getAnimations()[0]; a.pause(); a.currentTime = time; }, time);
      if (time === 2400) {
        const box = await page.locator(".actor-introduction>img").boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        expect(box!.y + box!.height).toBeLessThanOrEqual(height);
      }
      await page.screenshot({ path: `artifacts/quality/introduction/${width}-${height}-${time}.png` });
    }
    await page.keyboard.press("Escape");
    await expect(page.locator(".actor-introduction")).toHaveAttribute("data-active", "false");
  });
}
