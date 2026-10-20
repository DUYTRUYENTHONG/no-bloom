import { recordTrafficLua } from './lua';
export type TrafficTotals = {
    pageViews: number;
    uniqueBrowsers: number;
};
export type TrafficEvent = {
    visitorId: string;
    eventId: string;
    path: string;
};
export type RedisCommand = (command: (string | number)[]) => Promise<unknown>;
export class TrafficLimit extends Error {
}
export function createRedisCommand(url: string, token: string, fetcher: typeof fetch = fetch): RedisCommand {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/')
        throw Error('invalid_redis_url');
    if (!token)
        throw Error('missing_redis_token');
    return async (command) => { const response = await fetcher(parsed.origin, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command), signal: AbortSignal.timeout(5000), cache: 'no-store', redirect: 'error' }); if (!response.ok)
        throw Error('redis_unavailable'); const data = await response.json() as {
        result?: unknown;
        error?: unknown;
    }; if (data.error || !('result' in data))
        throw Error('redis_unavailable'); return data.result; };
}
export function createTrafficStore(command: RedisCommand, namespace: string, minuteCap = 120, dayCap = 10000, browserCap = 100000) {
    if (!/^no-bloom:traffic:(?:staging:|qa:[a-z0-9-]{1,48}:)?v1$/.test(namespace))
        throw Error('invalid_namespace');
    if (!Number.isInteger(browserCap) || browserCap < 1 || browserCap > 1000000)
        throw Error('invalid_browser_cap');
    if (!Number.isInteger(minuteCap) || minuteCap < 1 || minuteCap > 1000 || !Number.isInteger(dayCap) || dayCap < 1 || dayCap > 100000)
        throw Error('invalid_limits');
    return async (mode: 'record' | 'read', event: {
        digest: string;
        eventId: string;
        path: string;
        country: string;
    } | null, now: number): Promise<TrafficTotals | null> => {
        if (!Number.isFinite(now))
            throw Error('invalid_clock');
        const date = new Date(now).toISOString().slice(0, 10), minute = Math.floor(now / 60000);
        const keys = [`${namespace}:views`, `${namespace}:browsers`, `${namespace}:event:${event?.eventId ?? 'read'}`, `${namespace}:day:${date}:views`, `${namespace}:day:${date}:browsers`, `${namespace}:paths`, `${namespace}:countries`, `${namespace}:rate:minute:${minute}`, `${namespace}:rate:day:${date}`, `${namespace}:started-utc`];
        const result = await command(['EVAL', recordTrafficLua, keys.length, ...keys, mode, event?.path ?? '/', event?.country ?? 'unknown', minuteCap, dayCap, event?.digest ?? '', browserCap, new Date(now).toISOString()]);
        if (!Array.isArray(result) || result.some(v => !Number.isSafeInteger(v)))
            throw Error('invalid_redis_result');
        if (result[0] === -1)
            throw new TrafficLimit();
        if (mode === 'record') {
            if (result.length !== 1 || ![0, 1].includes(result[0]))
                throw Error('invalid_redis_result');
            return null;
        }
        if (result.length !== 2 || result[0] < 0 || result[1] < 0 || result[1] > result[0])
            throw Error('invalid_redis_result');
        return { pageViews: result[0], uniqueBrowsers: result[1] };
    };
}
