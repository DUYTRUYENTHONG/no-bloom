import assert from "node:assert/strict";
import test from "node:test";
import { VisitorCounterClient, counterVisitorKey } from "../lib/counter/client";
import { createCounterHandler, hmacVisitorId } from "../supabase/functions/visitor-counter/handler";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const endpoint = "https://collector.example/functions/v1/visitor-counter";
const secret = "test-only-counter-key-at-least-thirty-two-characters";
const origin = "https://duytruyenthong.github.io";
function storage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
function documentState() {
  return Object.assign(new EventTarget(), { visibilityState: "visible" }) as unknown as Document;
}
function client(overrides: Partial<ConstructorParameters<typeof VisitorCounterClient>[0]> = {}) {
  const calls: Array<Record<string, unknown>> = [];
  const store = storage();
  const counter = new VisitorCounterClient({
    enabled: true, endpoint, isProduction: true, hostname: "duytruyenthong.github.io",
    document: documentState(), storage: store, randomUUID: () => crypto.randomUUID(),
    fetcher: async (_url, init) => {
      calls.push(JSON.parse(init?.body as string));
      return Response.json({ total: 1, ordinal: 1, roleCount: 1, countries: 0 });
    }, ...overrides,
  });
  return { counter, calls, store };
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test("counter waits for consent, keeps one browser ID across reloads, and never sends a name", async () => {
  const first = client();
  first.counter.mount();
  assert.equal(first.calls.length, 0);
  assert.equal(first.store.getItem(counterVisitorKey), null);
  first.counter.setConsent("accepted"); await flush();
  assert.equal(first.calls.length, 1);
  assert.deepEqual(Object.keys(first.calls[0]).sort(), ["role", "visitorId"]);
  assert.equal(first.calls[0].role, "unspecified");
  first.counter.mount(); first.counter.setConsent("accepted");
  assert.equal(first.calls.length, 1);
  const saved = JSON.parse(first.store.getItem(counterVisitorKey)!);
  assert.equal(saved.version, 1);
  assert.equal(saved.id, first.calls[0].visitorId);
  const reload = client({ storage: first.store });
  reload.counter.mount(); reload.counter.setConsent("accepted"); await flush();
  assert.equal(reload.calls[0].visitorId, first.calls[0].visitorId);
  const secondBrowser = client();
  secondBrowser.counter.mount(); secondBrowser.counter.setConsent("accepted"); await flush();
  assert.notEqual(secondBrowser.calls[0].visitorId, first.calls[0].visitorId);
});

test("withdrawal cancels retries, clears only counter identity, and storage failure uses temporary identity", async () => {
  const timers: Array<() => void> = [];
  const source = client({
    fetcher: async () => new Response(null, { status: 503 }),
    setTimeoutFn: ((fn: () => void) => { timers.push(fn); return 1; }) as typeof setTimeout,
    clearTimeoutFn: (() => { timers.length = 0; }) as typeof clearTimeout,
  });
  source.store.setItem("no-bloom-name", "Mai");
  source.counter.mount(); source.counter.setConsent("accepted"); await flush();
  assert.equal(timers.length, 1);
  source.counter.setConsent("declined");
  assert.equal(timers.length, 0);
  assert.equal(source.store.getItem(counterVisitorKey), null);
  assert.equal(source.store.getItem("no-bloom-name"), "Mai");
  const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } };
  const temp = client({ storage: blocked });
  temp.counter.mount(); temp.counter.setConsent("accepted"); await flush();
  assert.equal(temp.calls.length, 1);
  assert.match(String(temp.calls[0].visitorId), /^[0-9a-f-]{36}$/);
});

test("missing configuration and declined permission make no counter request", () => {
  const missing = client({ endpoint: "" });
  missing.counter.mount(); missing.counter.setConsent("accepted");
  assert.equal(missing.calls.length, 0);
  assert.equal(missing.counter.state.kind, "unavailable");
  const declined = client();
  declined.counter.mount(); declined.counter.setConsent("declined");
  assert.equal(declined.calls.length, 0);
});

test("collector validates input, HMACs canonical UUIDs, and never returns the identifier", async () => {
  let digest = "";
  const handler = createCounterHandler({ origins: [origin], secret, store: async (key) => { digest = key; return { total: 2, ordinal: 3, roleCount: 2, countries: 0 }; } });
  const id = crypto.randomUUID();
  const request = (body: unknown, method = "POST", contentType = "application/json", requestOrigin = origin) => new Request(endpoint, { method, headers: { Origin: requestOrigin, "Content-Type": contentType }, body: method === "POST" ? JSON.stringify(body) : undefined });
  assert.equal((await handler(request({ visitorId: id, role: "unspecified" }, "POST", "application/json", "https://evil.example"))).status, 403);
  assert.equal((await handler(request({ visitorId: id, role: "admin" }))).status, 400);
  assert.equal((await handler(request({ visitorId: id, role: "unspecified", name: "Mai" }))).status, 400);
  assert.equal((await handler(request({ visitorId: "bad", role: "unspecified" }))).status, 400);
  assert.equal((await handler(request({ visitorId: id, role: "unspecified" }, "POST", "text/plain"))).status, 415);
  assert.equal((await handler(request({ visitorId: id, role: "unspecified", padding: "x".repeat(5000) }))).status, 413);
  assert.equal((await handler(request({}, "GET"))).status, 405);
  assert.equal((await handler(request({}, "OPTIONS"))).status, 204);
  const response = await handler(request({ visitorId: id.toUpperCase(), role: "unspecified" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { total: 2, ordinal: 3, roleCount: 2, countries: 0 });
  assert.equal(digest, await hmacVisitorId(id, secret));
  assert.equal(digest.length, 64);
  assert.equal(digest.includes(id), false);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
});

test("collector rate and database failure expose no internal detail", async () => {
  const payload = { visitorId: crypto.randomUUID(), role: "unspecified" };
  const request = () => new Request(endpoint, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const limited = createCounterHandler({ origins: [origin], secret, store: async () => { throw Object.assign(new Error("secret"), { code: "P0001" }); } });
  assert.equal((await limited(request())).status, 429);
  const failed = createCounterHandler({ origins: [origin], secret, store: async () => { throw new Error("SQL password and raw ID"); } });
  const response = await failed(request());
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes("password"), false);
});

test("collector through embedded PostgreSQL stores only HMAC keys and recognizes repeats", async () => {
  const database = new PGlite();
  try {
    await database.exec("create role anon; create role authenticated; create role service_role;");
    await database.exec(await readFile("supabase/migrations/202610200001_visitor_analytics.sql", "utf8"));
    await database.exec(await readFile("supabase/migrations/202610200002_visitor_counter.sql", "utf8"));
    const handler = createCounterHandler({ origins: [origin], secret, store: async (digest, role, country) => {
      const result = await database.query("select * from analytics.record_browser('no-bloom', $1, $2, $3, 1000, 100000)", [digest, role, country]);
      const row = result.rows[0] as Record<string, unknown>;
      return { total: Number(row.total), ordinal: Number(row.ordinal), roleCount: Number(row.role_count), countries: Number(row.countries) };
    } });
    const submit = async (id: string) => handler(new Request(endpoint, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ visitorId: id, role: "unspecified" }) }));
    const id = crypto.randomUUID();
    assert.deepEqual(await (await submit(id)).json(), { total: 1, ordinal: 1, roleCount: 1, countries: 0 });
    assert.deepEqual(await (await submit(id)).json(), { total: 1, ordinal: 1, roleCount: 1, countries: 0 });
    assert.deepEqual(await (await submit(crypto.randomUUID())).json(), { total: 2, ordinal: 2, roleCount: 2, countries: 0 });
    const rows = await database.query("select visitor_key, country from analytics.visitor_records order by ordinal");
    assert.equal(rows.rows.length, 2);
    assert.equal((rows.rows[0] as Record<string, unknown>).visitor_key, await hmacVisitorId(id, secret));
    assert.equal((rows.rows[0] as Record<string, unknown>).country, "unknown");
    assert.equal(JSON.stringify(rows.rows).includes(id), false);
  } finally { await database.close(); }
});
