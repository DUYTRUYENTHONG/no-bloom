import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, join, extname } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("out");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  const relative = decodeURIComponent(pathname.replace(/^\/no-bloom\/?/, "")) || "index.html";
  const file = resolve(join(root, relative.endsWith("/") ? `${relative}index.html` : relative));
  if (!file.startsWith(root)) { response.writeHead(403).end(); return; }
  try { const content = await readFile(file); response.setHeader("content-type", mime[extname(file)] ?? "application/octet-stream"); response.writeHead(200).end(content); }
  catch { response.writeHead(404).end(); }
});
await new Promise((done) => server.listen(3206, "127.0.0.1", done));
const browser = await chromium.launch({ channel: "chrome", headless: true });
await mkdir("artifacts/guide", { recursive: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, reducedMotion: "no-preference" });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3206/no-bloom/");
    await page.getByRole("button", { name: "Mở món quà" }).waitFor();
    await page.screenshot({ path: `artifacts/guide/${width}-invitation.png`, fullPage: true });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("http://127.0.0.1:3206/no-bloom/?for=L%C3%AA+Th%E1%BB%8B+Mai&flower=rose");
    await page.getByRole("heading", { name: /Lê Thị Mai, chúc bạn/ }).waitFor();
    await page.screenshot({ path: `artifacts/guide/${width}-gift.png`, fullPage: true });
    await page.getByRole("button", { name: "Mở bạn đồng hành" }).click();
    await page.screenshot({ path: `artifacts/guide/${width}-guide.png`, fullPage: true });
    await context.close();
  }
} finally { await browser.close(); server.close(); }
