import assert from "node:assert/strict";
import test from "node:test";
import { PageViewTracker, classifySource, consentKey, visitorKey } from "../lib/analytics/tracker";
import { createHandler } from "../supabase/functions/record-visit/handler";

const endpoint = "https://collector.example/functions/v1/record-visit";
function storage() {
  const data = new Map<string, string>();
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
}
function documentState() {
  const target = new EventTarget();
  return Object.assign(target, { visibilityState: "visible", referrer: "" }) as unknown as Document;
}
function tracker(overrides: Partial<ConstructorParameters<typeof PageViewTracker>[0]> = {}) {
  const calls: Array<{ body: Record<string, unknown>; signal: AbortSignal }> = [];
  const store = storage();
  const doc = documentState();
  const visit = new PageViewTracker({
    enabled: true, endpoint, isProduction: true,
    location: { hostname: "gift.example", pathname: "/no-bloom/", search: "?name=private&card=secret&utm_source=facebook" } as Location,
    document: doc, storage: store, randomUUID: () => crypto.randomUUID(),
    fetcher: async (_url, init) => {
      calls.push({ body: JSON.parse(init?.body as string), signal: init?.signal as AbortSignal });
      return Response.json({ accepted: true });
    }, ...overrides,
  });
  return { visit, calls, store, doc };
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test("consent gates one page event across remounts, while reload creates a new view", async () => {
  const first = tracker();
  first.visit.mount(); first.visit.mount();
  assert.equal(first.calls.length, 0);
  first.visit.choose("accepted");
  await flush();
  assert.equal(first.calls.length, 1);
  first.visit.mount(); first.doc.dispatchEvent(new Event("visibilitychange"));
  assert.equal(first.calls.length, 1);
  const payload = first.calls[0].body;
  assert.deepEqual(Object.keys(payload).sort(), ["event_id", "occurred_at", "page_key", "source_category", "visitor_id"]);
  assert.equal(payload.source_category, "facebook");
  assert.equal(JSON.stringify(payload).includes("private"), false);
  assert.equal(JSON.stringify(payload).includes("secret"), false);
  const second = tracker({ storage: first.store });
  second.visit.mount(); await flush();
  assert.equal(second.calls.length, 1);
  assert.notEqual(second.calls[0].body.event_id, payload.event_id);
  assert.equal(second.calls[0].body.visitor_id, payload.visitor_id);
  const third = tracker({ storage: storage() });
  third.visit.mount(); third.visit.choose("accepted"); await flush();
  assert.notEqual(third.calls[0].body.visitor_id, payload.visitor_id);
});

test("withdrawal cancels a pending retry and removes only analytics identity", async () => {
  const timers: Array<() => void> = [];
  const source = tracker({
    fetcher: async () => new Response(null, { status: 503 }),
    setTimeoutFn: ((fn: () => void) => { timers.push(fn); return 1; }) as typeof setTimeout,
    clearTimeoutFn: (() => { timers.length = 0; }) as typeof clearTimeout,
  });
  source.store.setItem("no-bloom-name", "Mai");
  source.visit.mount(); source.visit.choose("accepted"); await flush();
  assert.equal(timers.length, 1);
  assert.ok(source.store.getItem(visitorKey));
  source.visit.choose("declined");
  assert.equal(source.store.getItem(visitorKey), null);
  assert.equal(source.store.getItem(consentKey), "declined");
  assert.equal(source.store.getItem("no-bloom-name"), "Mai");
  assert.equal(timers.length, 0);
});

test("hidden pages wait; storage failure records without visitor identity", async () => {
  const doc = documentState();
  (doc as unknown as { visibilityState: string }).visibilityState = "hidden";
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } };
  const source = tracker({ document: doc, storage: broken });
  source.visit.mount(); source.visit.choose("accepted");
  assert.equal(source.calls.length, 0);
  (doc as unknown as { visibilityState: string }).visibilityState = "visible";
  doc.dispatchEvent(new Event("visibilitychange")); await flush();
  assert.equal(source.calls.length, 1);
  assert.equal("visitor_id" in source.calls[0].body, false);
});

test("source and route classification discard private URLs and tokens", () => {
  assert.equal(classifySource("?utm_source=invalid&name=Mai", ""), "direct_or_unknown");
  assert.equal(classifySource("", "https://m.instagram.com/path?private=1"), "instagram");
  assert.equal(classifySource("", "https://unknown.example/private"), "other");
});

test("collector validates payload, CORS, duplicates, and overload without revealing SQL", async () => {
  let records = 0;
  const handler = createHandler({ origins: ["https://duytruyenthong.github.io"], record: async () => { records++; return records === 1; } });
  const payload = { event_id: crypto.randomUUID(), page_key: "invitation", source_category: "direct_or_unknown", occurred_at: new Date().toISOString() };
  const request = (body: unknown, origin = "https://duytruyenthong.github.io") => new Request(endpoint, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await handler(request(payload, "https://evil.example"))).status, 403);
  assert.equal((await handler(request({ ...payload, name: "Mai" }))).status, 400);
  assert.equal((await handler(request({ ...payload, occurred_at: new Date(Date.now() - 11 * 60_000).toISOString() }))).status, 400);
  assert.equal((await handler(request({ ...payload, visitor_id: "bad" }))).status, 400);
  assert.equal((await handler(request({ ...payload, padding: "x".repeat(5000) }))).status, 400);
  const preflight = await handler(new Request(endpoint, { method: "OPTIONS", headers: { Origin: "https://duytruyenthong.github.io" } }));
  assert.equal(preflight.status, 204);
  assert.equal((await handler(request(payload))).status, 200);
  assert.equal((await (await handler(request(payload))).json()).duplicate, true);
  assert.equal(records, 2);
  const failed = createHandler({ origins: ["https://duytruyenthong.github.io"], record: async () => { throw new Error("SQL password and raw payload"); } });
  const response = await failed(request(payload));
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes("password"), false);
});
