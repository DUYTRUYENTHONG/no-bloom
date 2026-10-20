import assert from 'node:assert/strict';
import { createConnection } from 'node:net';
import { randomUUID } from 'node:crypto';
import { createRedisCommand, createTrafficStore, TrafficLimit, type RedisCommand } from '../services/traffic/lib/store';
const local = process.env.TRAFFIC_REDIS_TEST_URL, rest = process.env.TRAFFIC_TEST_REDIS_REST_URL;
if (!local && !rest)
    throw Error('Isolated Redis is required. Set TRAFFIC_REDIS_TEST_URL=redis://127.0.0.1:6379 or use isolated Upstash test credentials. Never use a production namespace.');
const incomplete = Symbol('incomplete');
function parse(buffer: Buffer, offset = 0): {
    value: unknown;
    next: number;
} {
    const end = buffer.indexOf('\r\n', offset);
    if (end < 0)
        throw incomplete;
    const line = buffer.toString('utf8', offset + 1, end), type = String.fromCharCode(buffer[offset]);
    let next = end + 2;
    if (type === '-')
        throw Error(line);
    if (type === ':')
        return { value: Number(line), next };
    if (type === '+')
        return { value: line, next };
    if (type === '$') {
        const length = Number(line);
        if (length === -1)
            return { value: null, next };
        if (buffer.length < next + length + 2)
            throw incomplete;
        return { value: buffer.toString('utf8', next, next + length), next: next + length + 2 };
    }
    if (type === '*') {
        const values = [];
        for (let i = 0; i < Number(line); i++) {
            const parsed = parse(buffer, next);
            values.push(parsed.value);
            next = parsed.next;
        }
        return { value: values, next };
    }
    throw Error('unsupported_redis_response');
}
function localCommand(url: string): RedisCommand {
    const parsed = new URL(url);
    if (parsed.protocol !== 'redis:' || !['127.0.0.1', 'localhost'].includes(parsed.hostname) || parsed.username || parsed.password)
        throw Error('Local test Redis must be loopback without production credentials');
    return command => new Promise((resolve, reject) => { const socket = createConnection({ host: parsed.hostname, port: Number(parsed.port || 6379) }); let bytes = Buffer.alloc(0); socket.setTimeout(5000, () => socket.destroy(Error('Redis test timeout'))); socket.on('error', reject); socket.on('connect', () => { socket.write(`*${command.length}\r\n` + command.map(v => `$${Buffer.byteLength(String(v))}\r\n${v}\r\n`).join('')); }); socket.on('data', chunk => { bytes = Buffer.concat([bytes, chunk]); try {
        const result = parse(bytes);
        socket.end();
        resolve(result.value);
    }
    catch (error) {
        if (error !== incomplete) {
            socket.destroy();
            reject(error);
        }
    } }); });
}
const command = local ? localCommand(local) : createRedisCommand(rest!, process.env.TRAFFIC_TEST_REDIS_REST_TOKEN ?? '');
const namespaces: string[] = [];
function namespace() { const n = `no-bloom:traffic:qa:${randomUUID()}:v1`; namespaces.push(n); return n; }
async function cleanup(ns: string) { let cursor = '0'; let removed = 0; do {
    const result = await command(['SCAN', cursor, 'MATCH', `${ns}:*`, 'COUNT', 200]) as [
        string,
        string[]
    ];
    cursor = String(result[0]);
    const keys = result[1];
    assert.ok(keys.every(k => k.startsWith(ns + ':')));
    removed += keys.length;
    if (removed > 5000)
        throw Error('Refusing unexpectedly large test cleanup');
    if (keys.length)
        await command(['DEL', ...keys]);
} while (cursor !== '0'); }
async function main() {
try {
    assert.equal(await command(['PING']), 'PONG');
    const ns = namespace(), store = createTrafficStore(command, ns, 1000, 100000), t = Date.parse('2026-10-20T23:59:59Z'), next = t + 1000, A = 'a'.repeat(64), B = 'b'.repeat(64), eventId = randomUUID();
    const event = (digest = A, id = randomUUID(), path = '/', country = 'unknown') => ({ digest, eventId: id, path, country });
    assert.deepEqual(await store('read', null, t), { pageViews: 0, uniqueBrowsers: 0 });
    await store('record', event(A, eventId), t);
    await store('record', event(A, eventId), t);
    const duplicate = randomUUID();
    await Promise.all(Array.from({ length: 32 }, () => store('record', event(A, duplicate), t)));
    await Promise.all(Array.from({ length: 20 }, (_, i) => store('record', event(i % 2 ? B : A, randomUUID(), i % 2 ? '/credits' : '/', i % 2 ? 'unknown' : 'VN'), t)));
    assert.deepEqual(await store('read', null, t), { pageViews: 22, uniqueBrowsers: 2 });
    await store('record', event(A, randomUUID(), '/', 'VN'), next);
    await store('record', event(B, eventId, '/credits', 'US'), next);
    assert.deepEqual(await createTrafficStore(command, ns, 1000, 100000)('read', null, next), { pageViews: 23, uniqueBrowsers: 2 });
    assert.equal(await command(['GET', `${ns}:day:2026-10-20:views`]), '22');
    assert.equal(await command(['SCARD', `${ns}:day:2026-10-20:browsers`]), 2);
    assert.equal(await command(['GET', `${ns}:day:2026-10-21:views`]), '1');
    assert.equal(await command(['SCARD', `${ns}:day:2026-10-21:browsers`]), 1);
    assert.equal(await command(['HGET', `${ns}:paths`, '/']), '13');
    assert.equal(await command(['HGET', `${ns}:paths`, '/credits']), '10');
    assert.equal(await command(['HGET', `${ns}:countries`, 'VN']), '11');
    assert.equal(await command(['HGET', `${ns}:countries`, 'unknown']), '12');
    assert.equal(await command(['HGET', `${ns}:countries`, 'US']), null);
    assert.equal(await command(['TTL', `${ns}:browsers`]), -1);
    assert.equal(await command(['TTL', `${ns}:views`]), -1);
    assert.ok(Number(await command(['TTL', `${ns}:event:${eventId}`])) > 86300);
    assert.ok(Number(await command(['TTL', `${ns}:day:2026-10-20:browsers`])) > 34559000);
    assert.deepEqual(new Set(await command(['SMEMBERS', `${ns}:browsers`]) as string[]), new Set([A, B]));
    const limitedNs = namespace(), limited = createTrafficStore(command, limitedNs, 2, 100);
    await limited('record', event(), t);
    await limited('record', event(), t);
    await assert.rejects(() => limited('record', event(B), t), TrafficLimit);
    assert.equal(await command(['GET', `${limitedNs}:views`]), '2');
    const capacityNs = namespace(), capacity = createTrafficStore(command, capacityNs, 100, 100, 2);
    await capacity('record', event(A), t);
    await capacity('record', event(B), t);
    const blocked = event('c'.repeat(64));
    await assert.rejects(() => capacity('record', blocked, t), TrafficLimit);
    assert.equal(await command(['EXISTS', `${capacityNs}:event:${blocked.eventId}`]), 0);
    await capacity('record', event(A), t);
    assert.deepEqual(await capacity('read', null, t), { pageViews: 3, uniqueBrowsers: 2 });
    const badNs = namespace(), bad = createTrafficStore(command, badNs);
    await command(['HSET', `${badNs}:paths`, '/', '1.5']);
    const invalid = event();
    await assert.rejects(() => bad('record', invalid, t));
    assert.equal(await command(['GET', `${badNs}:views`]), null);
    assert.equal(await command(['EXISTS', `${badNs}:event:${invalid.eventId}`]), 0);
    console.log('Actual Redis EVAL: insertion, duplicate and concurrent requests, unique browsers, UTC midnight, country page views, retention, capacity, corruption guard and store recreation passed. Isolated namespaces only.');
}
finally {
    for (const ns of namespaces)
        await cleanup(ns);
}
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
