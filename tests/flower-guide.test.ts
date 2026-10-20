import assert from "node:assert/strict";
import test from "node:test";
import { createGuideHandler } from "../supabase/functions/flower-guide/handler";

const origin = "https://duytruyenthong.github.io";
function post(data: object, headers: Record<string, string> = {}) {
  return new Request("https://example.supabase.co/functions/v1/flower-guide", { method: "POST", headers: { origin, "content-type": "application/json", ...headers }, body: JSON.stringify(data) });
}
const valid = { question: "How do I share?", locale: "en", stage: "greeting" };

test("guide accepts bounded questions and returns only an answer", async () => {
  let called = 0;
  const handler = createGuideHandler({ origins: [origin], reserve: async () => true, complete: async (data) => { called++; assert.deepEqual(data, valid); return "Copy the personal link."; } });
  const response = await handler(post(valid));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { answer: "Copy the personal link." });
  assert.equal(called, 1);
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
});

test("guide rejects alien origins, extra personal fields, oversized body, and quota exhaustion", async () => {
  let reserved = 0;
  const handler = createGuideHandler({ origins: [origin], reserve: async () => { reserved++; return false; }, complete: async () => "unused" });
  const alien = new Request("https://example.supabase.co/functions/v1/flower-guide", { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" }, body: JSON.stringify(valid) });
  assert.equal((await handler(alien)).status, 403);
  assert.equal((await handler(post({ ...valid, recipient: "Mai" }))).status, 400);
  assert.equal((await handler(post({ ...valid, question: "x".repeat(2100) }))).status, 413);
  assert.equal((await handler(post(valid))).status, 429);
  assert.equal(reserved, 1);
});
