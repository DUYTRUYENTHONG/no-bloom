import { expect, test } from "@playwright/test";

const phoneViewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 491, height: 604 },
  { width: 755, height: 604 },
  { width: 897, height: 604 },
];

for (const viewport of phoneViewports) {
  test(`${viewport.width}px guide keeps the full actor at the bottom right`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?for=An");

    const guide = page.locator(".flower-guide");
    const trigger = page.getByRole("button", { name: "Mở bạn đồng hành" });
    await expect(page.locator(".greeting-content")).toBeVisible();
    await expect(guide).toHaveCSS("position", "fixed");

    const triggerBox = await trigger.boundingBox();
    expect(triggerBox).not.toBeNull();
    expect(triggerBox!.width).toBeGreaterThanOrEqual(44);
    expect(triggerBox!.height).toBeGreaterThanOrEqual(44);
    expect(triggerBox!.width).toBeLessThanOrEqual(112);
    expect(triggerBox!.height).toBeLessThanOrEqual(149);
    expect(triggerBox!.x + triggerBox!.width).toBeLessThanOrEqual(viewport.width - 8 + 0.5);

    expect(triggerBox!.y + triggerBox!.height).toBeLessThanOrEqual(viewport.height - 8 + .5);
    expect(triggerBox!.y).toBeGreaterThan(viewport.height - 170);
    await expect(trigger.locator('img')).toHaveCSS('object-fit','contain');
    expect(await trigger.locator('img').evaluate(e=>e.getBoundingClientRect().height)).toBeCloseTo(triggerBox!.height,1);
    await expect(trigger.locator(':scope > span[aria-hidden]')).toHaveCount(0);
    for (const button of await page.locator('.greeting-actions button').all()) {
      await button.evaluate(e=>e.scrollIntoView({block:'center'}));
      const actor=await trigger.boundingBox(), action=await button.boundingBox();
      const overlap=Math.max(0,Math.min(actor!.x+actor!.width,action!.x+action!.width)-Math.max(actor!.x,action!.x))*Math.max(0,Math.min(actor!.y+actor!.height,action!.y+action!.height)-Math.max(actor!.y,action!.y));
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
