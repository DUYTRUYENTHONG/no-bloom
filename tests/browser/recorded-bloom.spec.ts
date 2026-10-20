import { expect, test, type Page } from "@playwright/test";

const recordedKinds = ["orchid", "alstroemeria"] as const;
type RecordedKind = (typeof recordedKinds)[number];

function isBloomVideo(url: string) {
  return /\/flowers\/(?:orchid|alstroemeria)-bloom\.mp4(?:\?|$)/.test(url);
}

async function selectRecordedBloom(page: Page, kind: RecordedKind) {
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.locator("#flower-kind").selectOption(kind);
  const renderer = page.locator(`[data-rose-renderer=recorded-bloom][data-flower=${kind}]`);
  await expect(renderer).toBeVisible();
  await expect(renderer.locator("img")).toHaveAttribute("src", new RegExp(`(?:^|/)flowers/${kind}-bud\\.webp(?:\\?.*)?$`));
  return renderer;
}

test("recorded bloom videos are not requested before the bloom starts", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => { if (isBloomVideo(request.url())) requests.push(request.url()); });
  await page.goto("/");
  await expect(page.locator("video")).toHaveCount(0);
  await page.getByRole("button", { name: "Mở món quà" }).click();
  for (const kind of recordedKinds) {
    await page.locator("#flower-kind").selectOption(kind);
    await expect(page.locator(`[data-rose-renderer=recorded-bloom][data-flower=${kind}]`)).toBeVisible();
    await expect(page.locator("video")).toHaveCount(0);
  }
  expect(requests).toEqual([]);
});

for (const kind of recordedKinds) {
  test(`${kind} plays its real recorded bloom and supports pause and replay`, async ({ page, request }, testInfo) => {
    const requests: string[] = [];
    const responses: Array<{ status: number; contentType: string }> = [];
    page.on("request", (request) => { if (isBloomVideo(request.url())) requests.push(request.url()); });
    page.on("response", (response) => {
      if (isBloomVideo(response.url())) responses.push({ status: response.status(), contentType: response.headers()["content-type"] ?? "" });
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const renderer = await selectRecordedBloom(page, kind);
    expect(requests).toEqual([]);

    await page.getByRole("button", { name: "Tiếp tục không cần tên" }).click();
    const video = renderer.locator("video");
    await expect(video).toBeVisible({ timeout: 10000 });
    await expect.poll(async () => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2);
    await expect.poll(async () => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0.5);
    const metadata = await video.evaluate((element: HTMLVideoElement) => ({ duration: element.duration, muted: element.muted, playsInline: element.playsInline, src: element.currentSrc }));
    expect(metadata.duration).toBeGreaterThan(1);
    expect(metadata.muted).toBe(true);
    expect(metadata.playsInline).toBe(true);
    expect(metadata.src).toMatch(new RegExp(`/flowers/${kind}-bloom\\.mp4(?:\\?.*)?$`));
    expect(requests.every((url) => url.includes(`/flowers/${kind}-bloom.mp4`))).toBe(true);
    const observedNativeResponse = responses.some(({ status, contentType }) => (status === 200 || status === 206) && contentType.includes("video/mp4"));
    if (!observedNativeResponse) {
      const asset = await request.get(`/flowers/${kind}-bloom.mp4`);
      expect([200, 206]).toContain(asset.status());
      expect(asset.headers()["content-type"]).toContain("video/mp4");
      testInfo.annotations.push({ type: "browser-caveat", description: "The browser played and progressed the native video, but Playwright did not expose its media response; MIME and status were verified through APIRequestContext." });
    }

    await page.getByRole("button", { name: "Tạm dừng hoa nở" }).click();
    await expect.poll(async () => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    const pausedAt = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
    await page.waitForTimeout(350);
    expect(await video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(pausedAt, 1);
    await page.getByRole("button", { name: "Tiếp tục hoa nở" }).click();
    await expect.poll(async () => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(pausedAt + 0.2);
    const beforeReplay = await video.evaluate((element: HTMLVideoElement) => element.currentTime);

    await page.getByRole("button", { name: "Mở ngay" }).click();
    await expect(page.locator(".greeting-content")).toBeVisible();
    await expect(renderer.locator("img")).toHaveAttribute("src", new RegExp(`(?:^|/)flowers/${kind}-open\\.webp(?:\\?.*)?$`));
    await expect(video).toHaveCSS("opacity", "0");
    await expect.poll(async () => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    await expect(page.getByRole("button", { name: "Tạm dừng hoa nở" })).toHaveCount(0);
    await page.getByRole("button", { name: "Xem hoa nở lại" }).click();
    await expect(page.locator("main[data-botanical-state=BLOOMING]")).toBeVisible();
    await expect.poll(async () => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeLessThan(beforeReplay / 2);
    await expect.poll(async () => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0.1);
    await page.getByRole("button", { name: "Mở ngay" }).click();
    await expect(page.locator(".greeting-content")).toBeVisible();
  });

  test(`${kind} reduced motion uses still frames without requesting video`, async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => { if (isBloomVideo(request.url())) requests.push(request.url()); });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const renderer = await selectRecordedBloom(page, kind);
    await page.getByRole("button", { name: "Tiếp tục không cần tên" }).click();
    await expect(page.locator(".greeting-content")).toBeVisible();
    await expect(renderer.locator("video")).toHaveCount(0);
    await expect(renderer.locator("img")).toHaveAttribute("src", new RegExp(`(?:^|/)flowers/${kind}-open\\.webp(?:\\?.*)?$`));
    expect(requests).toEqual([]);
  });
}

test("recorded bloom failure preserves the named gift and exposes a usable fallback", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const renderer = await selectRecordedBloom(page, "orchid");
  await page.getByRole("textbox", { name: "Tên của bạn" }).fill("Mai");
  await page.getByRole("button", { name: "Để hoa nở vì bạn" }).click();
  const video = renderer.locator("video");
  await video.waitFor({ state: "attached" });
  await video.evaluate((element: HTMLVideoElement) => {
    element.src = new URL("flowers/missing-recorded-bloom.mp4", document.baseURI).href;
    element.load();
  });
  await expect(page.getByRole("heading", { name: /Mai, chúc bạn/ })).toBeVisible({ timeout: 10000 });
  await expect(renderer.getByRole("status")).toContainText("Video hoa chưa tải được");
  await expect(page.getByRole("button", { name: "Sao chép liên kết riêng" })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
});
