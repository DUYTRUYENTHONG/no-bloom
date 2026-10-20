import { expect, test } from "@playwright/test";

test("greeting celebration is finite, nonblocking, and replays with the greeting", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.getByRole("textbox", { name: "Tên của bạn" }).fill("Mai");
  await page.getByRole("button", { name: "Để hoa nở vì bạn" }).click();
  await page.getByRole("button", { name: "Mở ngay" }).click();

  const heading = page.getByRole("heading", { name: /Mai, chúc bạn/ });
  const celebration = page.getByRole("region", { name: "Một lời khen dành cho bạn" });
  const particles = page.locator("[data-celebration-particle]");
  const letter = celebration.locator(".letter");
  await expect(heading).toBeFocused();
  await expect(letter).toBeVisible();
  await expect(letter).toHaveAttribute("data-compliment-id", /.+/);
  await expect(letter.locator("p")).toHaveCount(2);
  await expect(celebration).toHaveCSS("pointer-events", "none");
  expect(await particles.count()).toBeGreaterThanOrEqual(36);

  const textIsClear = await celebration.evaluate((element) => {
    const textBounds = [...element.querySelectorAll(".letter p")].map((node) => node.getBoundingClientRect());
    return [...element.querySelectorAll("[data-celebration-particle]")].every((particle) => {
      const bounds = particle.getBoundingClientRect();
      return textBounds.every((text) => bounds.right <= text.left || bounds.left >= text.right || bounds.bottom <= text.top || bounds.top >= text.bottom);
    });
  });
  expect(textIsClear).toBe(true);

  await expect(particles).toHaveCount(0, { timeout: 5000 });
  await expect(celebration).toBeVisible();

  await page.getByRole("button", { name: "Xem hoa nở lại" }).click();
  await page.getByRole("button", { name: "Mở ngay" }).click();
  await expect(heading).toBeFocused();
  await expect(particles).toHaveCount(42);
});

test("reduced motion keeps a static compliment without particles or focus changes", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?for=An");

  const heading = page.getByRole("heading", { name: /An, chúc bạn/ });
  const celebration = page.getByRole("region", { name: "Một lời khen dành cho bạn" });
  const letter = celebration.locator(".letter");
  await expect(heading).toBeFocused();
  await expect(celebration).toBeVisible();
  await expect(page.locator("[data-celebration-card]")).toHaveCSS("animation-name", "none");
  await expect(page.locator("[data-celebration-particle]")).toHaveCount(0);
  await expect(letter).toHaveAttribute("data-compliment-id", /.+/);
  await expect(letter.locator("p")).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
