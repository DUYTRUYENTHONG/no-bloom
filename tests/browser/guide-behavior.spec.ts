import { expect, test } from "@playwright/test";

test("introduction hands off to a finite silent welcome dance", async ({ page }) => {
  const mediaRequests: string[] = [];
  page.on("request", (request) => {
    if (/youtube|\.(?:mp3|mp4|wav)(?:\?|$)/i.test(request.url())) mediaRequests.push(request.url());
  });

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  // Observe the natural four-second entrance handoff; the separate intro suite covers Skip.

  const guide = page.locator(".flower-guide");
  const sprite = page.locator(".guide-dance-sprite");
  await expect(guide).toHaveClass(/is-welcoming/, { timeout: 10000 });
  await expect(sprite).toBeVisible();
  await expect(sprite).toHaveCSS("animation-name", /dance-poses/);
  await expect(page.locator(".guide-hint")).toContainText("Mở món quà");
  await expect(page.locator(".guide-actor-button > span[aria-hidden]")).toHaveCount(0);
  await expect(page.locator("audio, video, iframe")).toHaveCount(0);
  expect(mediaRequests).toHaveLength(0);

  await expect(guide).not.toHaveClass(/is-welcoming/, { timeout: 7000 });
  await expect(sprite).toHaveCount(0);
});

test("greeting hint is contextual, dismissible, and does not change opt-in dance state", async ({ page }) => {
  const posts: string[] = [];
  const youtubeRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
    if (/youtube/i.test(request.url())) youtubeRequests.push(request.url());
  });

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?for=An");
  await page.getByRole("button", { name: "Mở ngay" }).click();

  const heading = page.getByRole("heading", { name: /An, chúc bạn/ });
  const guide = page.locator(".flower-guide");
  const hint = page.locator(".guide-hint");
  await expect(heading).toBeFocused();
  await expect(hint).toContainText("Lời chúc đã sẵn sàng");
  await expect(guide).toHaveClass(/is-welcoming/);
  expect(posts).toHaveLength(0);

  await page.getByRole("button", { name: "Ẩn gợi ý" }).click();
  await expect(hint).toHaveCount(0);
  await expect(guide).not.toHaveClass(/is-welcoming/);

  await page.getByRole("button", { name: "Mở bạn đồng hành" }).click();
  await page.getByRole("button", { name: "Nhảy không nhạc" }).click();
  await expect(guide).toHaveClass(/is-dancing/);
  await expect(guide).not.toHaveClass(/is-welcoming/);
  await expect(page.locator(".guide-dance-sprite")).toBeVisible();
  expect(youtubeRequests).toHaveLength(0);
});

test("automatic welcome pauses while hidden and stops when the guide opens", async ({ page }) => {
  await page.addInitScript(() => {
    let testHidden = false;
    Object.defineProperty(document, "hidden", { configurable: true, get: () => testHidden });
    Object.defineProperty(window, "__setGuideTestHidden", {
      value: (hidden: boolean) => { testHidden = hidden; document.dispatchEvent(new Event("visibilitychange")); },
    });
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?for=An");
  await page.getByRole("button", { name: "Mở ngay" }).click();

  const guide = page.locator(".flower-guide");
  await expect(guide).toHaveClass(/is-welcoming/);
  await page.evaluate(() => (window as typeof window & { __setGuideTestHidden: (hidden: boolean) => void }).__setGuideTestHidden(true));
  await expect(guide).not.toHaveClass(/is-welcoming/);
  await expect(page.locator(".guide-dance-sprite")).toHaveCount(0);

  await page.evaluate(() => (window as typeof window & { __setGuideTestHidden: (hidden: boolean) => void }).__setGuideTestHidden(false));
  await expect(guide).toHaveClass(/is-welcoming/);
  await page.getByRole("button", { name: "Mở bạn đồng hành" }).click();
  await expect(guide).not.toHaveClass(/is-welcoming/);
  await expect(page.getByRole("dialog", { name: "Bạn đồng hành NỞ" })).toBeVisible();
});

test("reduced motion uses static bilingual guidance without an automatic sprite", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const guide = page.locator(".flower-guide");
  await expect(page.locator(".guide-hint")).toContainText("Mở món quà");
  await expect(guide).not.toHaveClass(/is-welcoming/);
  await expect(page.locator(".guide-dance-sprite")).toHaveCount(0);

  await page.getByRole("combobox", { name: "Ngôn ngữ" }).selectOption("en");
  await expect(page.locator(".guide-hint")).toContainText("Open your gift");
  await expect(guide).not.toHaveClass(/is-welcoming/);
});
