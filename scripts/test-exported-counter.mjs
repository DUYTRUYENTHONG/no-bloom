import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, join } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("out");
const records = new Map();
const requests = [];
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const collector = createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3204");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "content-type");
  response.setHeader("Cache-Control", "private, no-store");
  if (request.method === "OPTIONS") { response.writeHead(204).end(); return; }
  if (request.method !== "POST") { response.writeHead(405).end(); return; }
  let body = "";
  for await (const chunk of request) body += chunk;
  const payload = JSON.parse(body);
  requests.push(payload);
  if (!records.has(payload.visitorId)) records.set(payload.visitorId, records.size + 1);
  response.setHeader("Content-Type", "application/json");
  response.writeHead(200).end(JSON.stringify({ total: records.size, ordinal: records.get(payload.visitorId), roleCount: records.size, countries: 0 }));
});
const site = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  const relative = decodeURIComponent(pathname.replace(/^\/no-bloom\/?/, "")) || "index.html";
  const file = resolve(join(root, relative.endsWith("/") ? `${relative}index.html` : relative));
  if (!file.startsWith(root)) { response.writeHead(403).end(); return; }
  try {
    const contents = await readFile(file);
    response.setHeader("Content-Type", mime[extname(file)] ?? "application/octet-stream");
    response.writeHead(200).end(contents);
  } catch { response.writeHead(404).end(); }
});
async function waitFor(count) {
  const deadline = Date.now() + 5000;
  while (requests.length < count && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(requests.length, count);
}
await Promise.all([new Promise((resolve) => collector.listen(3205, "127.0.0.1", resolve)), new Promise((resolve) => site.listen(3204, "127.0.0.1", resolve))]);
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const first = await browser.newContext({ reducedMotion: "reduce" });
  const page = await first.newPage();
  await page.goto("http://127.0.0.1:3204/no-bloom/");
  await page.getByRole("button", { name: "Đồng ý" }).waitFor();
  assert.equal(requests.length, 0);
  await page.getByRole("button", { name: "Đồng ý" }).click();
  await waitFor(1);
  await page.getByText(/1 trình duyệt/).waitFor();
  assert.deepEqual(Object.keys(requests[0]).sort(), ["role", "visitorId"]);
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.locator("#flower-kind").selectOption("orchid");
  await page.getByRole("textbox", { name: "Tên của bạn" }).fill("Mai");
  await page.getByRole("button", { name: "Để hoa nở vì bạn" }).click();
  await page.getByRole("heading", { name: /Mai, chúc bạn/ }).waitFor();
  assert.equal(JSON.stringify(requests).includes("Mai"), false);
  assert.equal(requests.length, 1);
  await page.reload();
  await waitFor(2);
  assert.equal(requests[0].visitorId, requests[1].visitorId);
  assert.equal(records.size, 1);
  await page.getByRole("button", { name: "Quyền riêng tư" }).click();
  await page.getByRole("button", { name: "Không, cảm ơn" }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem("no-bloom:counter-visitor")), null);
  await page.reload(); await page.waitForTimeout(200);
  assert.equal(requests.length, 2);
  await first.close();

  const second = await browser.newContext({ reducedMotion: "reduce" });
  const other = await second.newPage();
  await other.goto("http://127.0.0.1:3204/no-bloom/");
  await other.getByRole("button", { name: "Đồng ý" }).click();
  await waitFor(3);
  assert.equal(records.size, 2);
  assert.notEqual(requests[2].visitorId, requests[0].visitorId);
  await other.getByText(/2 trình duyệt/).waitFor();
  await second.close();
  console.log("Exported site: consent, first visit, repeat ordinal, second browser, withdrawal, and gift isolation passed against a local counter stub.");
} finally {
  await browser.close();
  await Promise.all([new Promise((resolve) => collector.close(resolve)), new Promise((resolve) => site.close(resolve))]);
}
