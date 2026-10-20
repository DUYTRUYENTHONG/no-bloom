import { expect, test } from "@playwright/test";

test("language changes update document language and existing validation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.getByRole("button", { name: "Để hoa nở vì bạn" }).click();
  await expect(page.locator(".story-panel").getByRole("alert")).toContainText("Hãy nhập tên");
  await page.getByRole("combobox", { name: "Ngôn ngữ" }).selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".story-panel").getByRole("alert")).toContainText("Enter a preferred name");
  await page.getByRole("combobox", { name: "Language" }).selectOption("vi");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
});

test("guide keyboard opens a named panel and returns focus on Escape", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Mở bạn đồng hành" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const panel = page.getByRole("dialog", { name: "Bạn đồng hành NỞ" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("log")).toBeEmpty();
  await expect(panel.getByRole("button", { name: "Đóng bạn đồng hành" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("clipboard rejection offers a usable personal link", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => { Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("Denied")) } }); });
  await page.goto("/?for=An&flower=peony&utm_source=facebook");
  await page.getByRole("button", { name: "Sao chép liên kết riêng" }).click();
  await expect(page.getByLabel("Chọn và sao chép liên kết này")).toHaveValue(/\?for=An&flower=peony$/);
  await expect(page.getByRole("status")).toContainText("Không thể sao chép");
  await expect(page.getByLabel("Chọn và sao chép liên kết này")).toBeFocused();
});

test("reduced motion and manual static mode allocate no WebGL canvas", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?for=An");
  await expect(page.locator(".greeting-content")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator("[data-rose-renderer=static]")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.getByRole("button", { name: "Xem hoa tĩnh" }).click();
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Tiếp tục không cần tên" }).click();
  await expect(page.locator(".greeting-content")).toBeVisible();
});

test("dance is optional, silent until chosen, and follows player state", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => { if (/youtube/.test(request.url())) external.push(request.url()); });
  await page.route("https://www.youtube.com/iframe_api", (route) => route.fulfill({ contentType: "application/javascript", body: `window.YT={Player:class{constructor(frame,options){window.__musicState=(data)=>options.events.onStateChange({data});queueMicrotask(()=>options.events.onReady());}pauseVideo(){window.__musicState?.(2);}destroy(){window.__musicState=null;}}};window.onYouTubeIframeAPIReady();` }));
  await page.route("https://www.youtube-nocookie.com/embed/**", (route) => route.fulfill({ contentType: "text/html", body: "<html lang='en'><title>Local player fixture</title><body>Local player fixture</body></html>" }));
  await page.goto("/");
  await page.getByRole("button", { name: "Mở bạn đồng hành" }).click();
  await page.getByRole("button", { name: "Nhảy không nhạc" }).waitFor();
  expect(external).toHaveLength(0);
  await page.getByRole("button", { name: "Nhảy không nhạc" }).click();
  await expect(page.getByRole("button", { name: "Dừng nhạc & điệu nhảy" })).toBeFocused();
  await expect(page.locator(".flower-guide")).toHaveClass(/is-dancing/);
  await expect(page.locator(".guide-compliment")).toContainText("niềm vui");
  expect(external).toHaveLength(0);
  await page.getByRole("button", { name: "Dừng nhạc & điệu nhảy" }).click();
  await expect(page.getByRole("button", { name: "Nhảy không nhạc" })).toBeFocused();
  await page.getByRole("button", { name: "Mở bài hát & nhảy" }).click();
  await expect(page.getByText("Bấm phát trong trình phát để bắt đầu nhảy.")).toBeVisible();
  const player = page.locator(".dance-moment iframe");
  await expect(player).toHaveAttribute("referrerpolicy", "origin");
  await page.evaluate(() => (window as typeof window & { __musicState: (state: number) => void }).__musicState(1));
  await expect(page.locator(".flower-guide")).toHaveClass(/is-dancing/);
  await page.evaluate(() => (window as typeof window & { __musicState: (state: number) => void }).__musicState(2));
  await expect(page.locator(".flower-guide")).not.toHaveClass(/is-dancing/);
  await page.getByRole("dialog").getByRole("button", { name: "Đóng bạn đồng hành" }).click();
  await expect(player).toHaveCount(0);
});

test("reduced motion keeps the dance compliment without spatial animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Mở bạn đồng hành" }).click();
  await page.getByRole("button", { name: "Nhảy không nhạc" }).click();
  await expect(page.locator(".guide-dance-sprite")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".guide-compliment")).toBeVisible();
});
