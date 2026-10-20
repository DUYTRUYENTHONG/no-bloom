import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, join, extname } from "node:path";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const root = resolve("out");
const requests = [];
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const api = createServer(async (request, response) => {
  response.setHeader("access-control-allow-origin", "http://127.0.0.1:3206");
  response.setHeader("access-control-allow-methods", "POST, OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
  if (request.method === "OPTIONS") { response.writeHead(204).end(); return; }
  let raw = "";
  for await (const chunk of request) raw += chunk;
  requests.push(JSON.parse(raw));
  response.setHeader("content-type", "application/json");
  response.writeHead(200).end(JSON.stringify({ answer: "AI test answer" }));
});
const site = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  const relative = decodeURIComponent(pathname.replace(/^\/no-bloom\/?/, "")) || "index.html";
  const file = resolve(join(root, relative.endsWith("/") ? `${relative}index.html` : relative));
  if (!file.startsWith(root)) { response.writeHead(403).end(); return; }
  try { const content = await readFile(file); response.setHeader("content-type", mime[extname(file)] ?? "application/octet-stream"); response.writeHead(200).end(content); }
  catch { response.writeHead(404).end(); }
});
await Promise.all([new Promise((done) => api.listen(3208, "127.0.0.1", done)), new Promise((done) => site.listen(3206, "127.0.0.1", done))]);
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3206/no-bloom/?for=L%C3%AA+Th%E1%BB%8B+Mai");
  await page.getByRole("heading", { name: /Lê Thị Mai, chúc bạn/ }).waitFor();
  await page.getByRole("button", { name: "Mở bạn đồng hành" }).click();
  await page.getByRole("button", { name: "Cách tạo liên kết riêng?" }).click();
  await page.getByText("AI test answer").waitFor();
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  assert.deepEqual(scan.violations.map((entry) => entry.id), [], "configured guide form accessibility");
  assert.deepEqual(requests, [{ question: "Cách tạo liên kết riêng?", locale: "vi", stage: "greeting" }]);
  assert.equal(JSON.stringify(requests).includes("Mai"), false);
  console.log("Exported guide request and name isolation passed against a local Groq-function stub.");
} finally { await browser.close(); api.close(); site.close(); }
