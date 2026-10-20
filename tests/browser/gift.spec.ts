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
