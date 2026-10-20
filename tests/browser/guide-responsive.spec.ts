import { expect, test } from "@playwright/test";

const phoneViewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 491, height: 604 },
];

for (const viewport of phoneViewports) {
  test(`${viewport.width}px guide uses a compact dock without covering the greeting`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?for=An");

    const guide = page.locator(".flower-guide");
    const trigger = page.getByRole("button", { name: "Mở bạn đồng hành" });
    await expect(page.locator(".greeting-content")).toBeVisible();
    await expect(guide).toHaveCSS("position", "absolute");

    const triggerBox = await trigger.boundingBox();
    expect(triggerBox).not.toBeNull();
    expect(triggerBox!.width).toBeGreaterThanOrEqual(44);
    expect(triggerBox!.height).toBeGreaterThanOrEqual(44);
    expect(triggerBox!.width).toBeLessThanOrEqual(56);
    expect(triggerBox!.height).toBeLessThanOrEqual(56);
    expect(triggerBox!.x + triggerBox!.width).toBeLessThanOrEqual(viewport.width - 8 + 0.5);

    for (const selector of [".letter", ".greeting-actions"]) {
      const protectedContent = page.locator(selector);
      await protectedContent.scrollIntoViewIfNeeded();
      const overlap = await page.evaluate(({ actorSelector, contentSelector }) => {
        const actor = document.querySelector(actorSelector)!.getBoundingClientRect();
        const content = document.querySelector(contentSelector)!.getBoundingClientRect();
        return Math.max(0, Math.min(actor.right, content.right) - Math.max(actor.left, content.left))
          * Math.max(0, Math.min(actor.bottom, content.bottom) - Math.max(actor.top, content.top));
      }, { actorSelector: ".guide-actor-button", contentSelector: selector });
      expect(overlap).toBe(0);
    }
  });
}

test("landscape guide keeps its trigger and open panel inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?for=An");

  const trigger = page.getByRole("button", { name: "Mở bạn đồng hành" });
  await trigger.click();
  const panel = page.getByRole("dialog", { name: "Bạn đồng hành NỞ" });
  const openTrigger = page.locator(".guide-actor-button");
  await expect(panel).toBeVisible();

  const [triggerBox, panelBox] = await Promise.all([openTrigger.boundingBox(), panel.boundingBox()]);
  for (const box of [triggerBox, panelBox]) {
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(667);
    expect(box!.y + box!.height).toBeLessThanOrEqual(375);
  }

  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await expect(openTrigger).toBeFocused();
});
