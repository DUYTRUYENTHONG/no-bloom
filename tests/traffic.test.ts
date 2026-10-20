import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { TrafficTracker, normalizedTrafficPath, trafficVisitorKey } from '../lib/traffic/client';
import { createTrafficHandler, validateTraffic } from '../services/traffic/lib/handler';
import { createTrafficStore, createRedisCommand, TrafficLimit } from '../services/traffic/lib/store';
const origin = 'https://duytruyenthong.github.io', secret = 'traffic-test-secret-32-characters-only';
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 10));
class MemoryStorage {
    values = new Map<string, string>();
    getItem(k: string) { return this.values.get(k) ?? null; }
    setItem(k: string, v: string) { this.values.set(k, v); }
    removeItem(k: string) { this.values.delete(k); }
}
function fixture(options: Record<string, unknown> = {}) {
    const doc = new EventTarget() as EventTarget & {
        visibilityState: DocumentVisibilityState;
    };
    doc.visibilityState = 'visible';
    const storage = new MemoryStorage(), requests: {
        method: string;
        body: unknown;
    }[] = [];
    const events = new Set<string>(), ids = new Set<string>();
    let fail = 0;
    const timers = new Map<number, () => void>();
    let next = 1;
    const tracker = new TrafficTracker({ enabled: true, endpoint: 'https://traffic.example/api/traffic', isProduction: true, hostname: 'duytruyenthong.github.io', document: doc, storage, randomUUID, fetcher: async (_url, init) => { const body = init?.body ? JSON.parse(String(init.body)) : null; requests.push({ method: init?.method ?? 'GET', body }); if (init?.method === 'POST') {
            if (fail-- > 0)
                return new Response('{}', { status: 503 });
            events.add(body.eventId);
            ids.add(body.visitorId);
            return Response.json({ recorded: true });
        } return Response.json({ pageViews: events.size, uniqueBrowsers: ids.size }); }, setTimeoutFn: ((fn: () => void) => { const id = next++; timers.set(id, fn); return id; }) as unknown as typeof setTimeout, clearTimeoutFn: ((id: number) => { timers.delete(id); }) as unknown as typeof clearTimeout, ...options });
    tracker.navigate('/');
    tracker.mount();
    return { tracker, requests, storage, doc, timers, setFail: (n: number) => { fail = n; }, fire: () => { const queued = [...timers.values()]; timers.clear(); for (const f of queued)
            f(); } };
}
test('traffic consent and GPC prevent all requests and persistent identity', async () => { const f = fixture(); await tick(); assert.equal(f.requests.length, 0); assert.equal(f.storage.values.size, 0); f.tracker.setConsent('declined'); await tick(); assert.equal(f.requests.length, 0); const g = fixture({ privacyControl: () => true }); g.tracker.setConsent('accepted'); await tick(); assert.equal(g.requests.length, 0); assert.equal(g.storage.getItem(trafficVisitorKey), null); });
test('traffic page instances survive remounts; route changes count, query/hash changes do not', async () => { const f = fixture(); f.tracker.setConsent('accepted'); await tick(); f.tracker.unmount(); f.tracker.mount(); f.tracker.navigate('/?for=Private#token'); await tick(); assert.equal(f.requests.filter(r => r.method === 'POST').length, 1); f.tracker.navigate('/no-bloom/credits/'); await tick(); f.tracker.navigate('/'); await tick(); const posts = f.requests.filter(r => r.method === 'POST').map(r => r.body as {
    visitorId: string;
    eventId: string;
    path: string;
}); assert.equal(posts.length, 3); assert.equal(new Set(posts.map(p => p.eventId)).size, 3); assert.equal(new Set(posts.map(p => p.visitorId)).size, 1); assert.deepEqual(posts.map(p => p.path), ['/', '/credits', '/']); assert.ok(posts.every(p => Object.keys(p).sort().join(',') === 'eventId,path,visitorId')); });
test('traffic reload gets a new event but reuses the unexpired browser ID; another storage gets another ID', async () => { const f = fixture(); f.tracker.setConsent('accepted'); await tick(); const g = fixture({ storage: f.storage }); g.tracker.setConsent('accepted'); await tick(); const h = fixture(); h.tracker.setConsent('accepted'); await tick(); const a = f.requests[0].body as {
    visitorId: string;
    eventId: string;
}, b = g.requests[0].body as typeof a, c = h.requests[0].body as typeof a; assert.equal(a.visitorId, b.visitorId); assert.notEqual(a.eventId, b.eventId); assert.notEqual(a.visitorId, c.visitorId); });
test('traffic retries reuse event ID and withdrawal clears only traffic identity and cancels retries', async () => { const f = fixture(); f.setFail(1); f.tracker.setConsent('accepted'); await tick(); f.fire(); await tick(); const posts = f.requests.filter(r => r.method === 'POST'); assert.equal(posts.length, 2); assert.deepEqual(posts[0].body, posts[1].body); const g = fixture(); g.storage.setItem('no-bloom-name', 'Private'); g.setFail(1); g.tracker.setConsent('accepted'); await tick(); g.tracker.setConsent('declined'); g.fire(); await tick(); assert.equal(g.requests.length, 1); assert.equal(g.storage.getItem(trafficVisitorKey), null); assert.equal(g.storage.getItem('no-bloom-name'), 'Private'); });
test('traffic unavailable storage uses a temporary ID and hidden pages wait for visibility', async () => { const broken = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); }, removeItem() { throw Error('blocked'); } }; const f = fixture({ storage: broken }); f.doc.visibilityState = 'hidden'; f.tracker.setConsent('accepted'); await tick(); assert.equal(f.requests.length, 0); f.doc.visibilityState = 'visible'; f.doc.dispatchEvent(new Event('visibilitychange')); await tick(); assert.equal(f.requests.filter(r => r.method === 'POST').length, 1); assert.match((f.requests[0].body as {
    visitorId: string;
}).visitorId, /^[0-9a-f-]{36}$/); });
test('traffic paths exclude private/token paths; missing config and local development send nothing', async () => { assert.equal(normalizedTrafficPath('/no-bloom/?for=Secret#token'), '/'); assert.equal(normalizedTrafficPath('/no-bloom/credits/?name=Secret'), '/credits'); for (const p of ['/card/private-token', '/admin', '/women/Trang', '/credits/Private', 'https://example.com/'])
    assert.equal(normalizedTrafficPath(p), null); for (const opts of [{ endpoint: '' }, { enabled: false }, { isProduction: false }, { hostname: 'localhost' }]) {
    const f = fixture(opts);
    f.tracker.setConsent('accepted');
    await tick();
    assert.equal(f.requests.length, 0);
} });
test('traffic server validates requests and hashes only visitor ID, with minimal public totals and unknown country', async () => {
    const calls: unknown[] = [];
    let now = Date.parse('2026-10-20T23:59:59Z');
    const handler = createTrafficHandler({ origins: [origin], secret, now: () => now, store: async (mode, event, time) => { calls.push({ mode, event, time }); return mode === 'read' ? { pageViews: 2, uniqueBrowsers: 1 } : null; } });
    const visitorId = randomUUID(), eventId = randomUUID();
    const request = (body: unknown, extra: Record<string, string> = {}) => new Request('https://counter/api/traffic', { method: 'POST', headers: { origin, 'content-type': 'application/json', ...extra }, body: JSON.stringify(body) });
    let r = await handler(request({ visitorId, eventId, path: '/' }));
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { recorded: true });
    const c = calls[0] as {
        event: {
            digest: string;
            country: string;
        };
        time: number;
    };
    assert.equal(c.event.digest, createHmac('sha256', secret).update(`no-bloom:traffic:browser:v1:${visitorId}`).digest('hex'));
    assert.equal(c.event.country, 'unknown');
    assert.ok(!JSON.stringify(c).includes(visitorId));
    now++;
    r = await handler(new Request('https://counter/api/traffic', { headers: { origin } }));
    assert.deepEqual(await r.json(), { pageViews: 2, uniqueBrowsers: 1 });
    assert.equal(r.headers.get('cache-control'), 'no-store');
    for (const payload of [{ visitorId, eventId, path: '/?for=Secret' }, { visitorId, eventId, path: '/', role: 'unspecified' }, { visitorId: 'bad', eventId, path: '/' }, null])
        assert.equal((await handler(request(payload))).status, 400);
    assert.equal((await handler(request({ visitorId, eventId, path: '/' }, { origin: 'https://evil.example' }))).status, 403);
    assert.equal((await handler(request({ visitorId, eventId, path: '/' }, { 'sec-gpc': '1' }))).status, 403);
    assert.equal((await handler(request({ visitorId, eventId, path: '/' }, { 'content-type': 'text/plain' }))).status, 415);
    assert.equal((await handler(request('x'.repeat(5000)))).status, 413);
    assert.equal((await handler(new Request('https://counter/api/traffic', { method: 'OPTIONS', headers: { origin } }))).status, 204);
    assert.equal((await handler(new Request('https://counter/api/traffic', { method: 'DELETE', headers: { origin } }))).status, 405);
    assert.equal(validateTraffic({ visitorId, eventId, path: '/credits' })?.path, '/credits');
});
test('traffic Redis adapter uses one EVAL with server UTC keys, bounded namespace, and safe errors', async () => {
    const commands: (string | number)[][] = [];
    const store = createTrafficStore(async (cmd) => { commands.push(cmd); return cmd[3 + Number(cmd[2])] === 'read' ? [0, 0] : [1]; }, 'no-bloom:traffic:qa:test:v1');
    const event = { digest: 'a'.repeat(64), eventId: randomUUID(), path: '/', country: 'unknown' };
    await store('record', event, Date.parse('2026-10-20T23:59:59Z'));
    await store('record', event, Date.parse('2026-10-21T00:00:00Z'));
    assert.equal(commands.length, 2);
    assert.equal(commands[0][0], 'EVAL');
    assert.ok(commands[0].some(x => String(x).endsWith(':day:2026-10-20:views')));
    assert.ok(commands[1].some(x => String(x).endsWith(':day:2026-10-21:views')));
    assert.throws(() => createTrafficStore(async () => [1], 'other-project'));
    const failure = createTrafficHandler({ origins: [origin], secret, store: async () => { throw Error('private Redis token'); } });
    const r = await failure(new Request('https://counter/api/traffic', { headers: { origin } }));
    assert.equal(r.status, 503);
    assert.ok(!(await r.text()).includes('token'));
    const limited = createTrafficHandler({ origins: [origin], secret, store: async () => { throw new TrafficLimit(); } });
    assert.equal((await limited(new Request('https://counter/api/traffic', { headers: { origin } }))).status, 429);
    const rest = createRedisCommand('https://example.upstash.io', 'server-only-token', async (_url, init) => { assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer server-only-token'); assert.ok(!String(init?.body).includes('server-only-token')); return Response.json({ result: [1] }); });
    assert.deepEqual(await rest(['EVAL', 'return {1}', 0]), [1]);
});
