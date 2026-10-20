import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, join } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve("out");
const events = [];
const seen = new Set();
async function waitForEvents(count) {
  const deadline = Date.now() + 5000;
  while (events.length < count && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(events.length, count);
}
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const collector = createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3202");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "content-type");
  if (request.method === "OPTIONS") { response.writeHead(204).end(); return; }
  if (request.method !== "POST") { response.writeHead(405).end(); return; }
  let body = "";
  for await (const chunk of request) body += chunk;
  const event = JSON.parse(body);
  events.push(event);
  const duplicate = seen.has(event.event_id);
  seen.add(event.event_id);
  response.setHeader("Content-Type", "application/json");
  response.writeHead(200).end(JSON.stringify({ accepted: true, duplicate }));
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

await Promise.all([new Promise((resolve) => collector.listen(3201, "127.0.0.1", resolve)), new Promise((resolve) => site.listen(3202, "127.0.0.1", resolve))]);
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3202/no-bloom/");
  await page.getByRole("button", { name: "Đồng ý" }).waitFor();
  assert.equal(events.length, 0, "no event before affirmative consent");
  await page.getByRole("button", { name: "Đồng ý" }).click();
  await page.waitForFunction(() => window.localStorage.getItem("no-bloom:analytics-visitor") !== null);
  await waitForEvents(1);
  assert.deepEqual(Object.keys(events[0]).sort(), ["event_id", "occurred_at", "page_key", "source_category", "visitor_id"]);
  assert.equal(events[0].page_key, "invitation");
  await page.getByRole("button", { name: "Mở món quà" }).click();
  await page.getByRole("textbox", { name: "Tên bạn thích" }).fill("Mai");
  await page.getByRole("button", { name: "Để hoa nở vì bạn" }).click();
  await page.getByRole("heading", { name: /Mai, chúc bạn/ }).waitFor();
  assert.equal(events.length, 1, "name, bloom, and greeting are not page views");
  assert.equal(JSON.stringify(events).includes("Mai"), false);
  await page.reload();
  await waitForEvents(2);
  assert.notEqual(events[0].event_id, events[1].event_id);
  assert.equal(events[0].visitor_id, events[1].visitor_id);
  await page.getByRole("button", { name: "Quyền riêng tư" }).click();
  await page.getByRole("button", { name: "Không, cảm ơn" }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem("no-bloom:analytics-visitor")), null);
  await page.reload(); await page.waitForTimeout(150);
  assert.equal(events.length, 2, "decline prevents later views");
  await context.close();

  const another = await browser.newContext({ reducedMotion: "reduce" });
  const otherPage = await another.newPage();
  await otherPage.goto("http://127.0.0.1:3202/no-bloom/");
  await otherPage.getByRole("button", { name: "Đồng ý" }).click();
  await waitForEvents(3);
  assert.notEqual(events[2].visitor_id, events[0].visitor_id);
  await another.close();
  console.log("Exported GitHub Pages build: consent, page views, reload, identity, withdrawal, and gift isolation passed.");
} finally {
  await browser.close();
  await Promise.all([new Promise((resolve) => collector.close(resolve)), new Promise((resolve) => site.close(resolve))]);
}
