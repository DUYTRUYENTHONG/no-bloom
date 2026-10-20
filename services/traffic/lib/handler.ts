import { createHmac } from 'node:crypto';
import { TrafficLimit, type TrafficEvent, type TrafficTotals } from './store';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const allowedTrafficPaths = ['/', '/credits'] as const;
export function validateTraffic(input: unknown): TrafficEvent | null {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        return null;
    const p = input as Record<string, unknown>;
    if (Object.keys(p).length !== 3 || Object.keys(p).some(k => !['visitorId', 'eventId', 'path'].includes(k)))
        return null;
    if (typeof p.visitorId !== 'string' || !uuid.test(p.visitorId) || typeof p.eventId !== 'string' || !uuid.test(p.eventId) || typeof p.path !== 'string' || !allowedTrafficPaths.includes(p.path as typeof allowedTrafficPaths[number]))
        return null;
    return { visitorId: p.visitorId.toLowerCase(), eventId: p.eventId.toLowerCase(), path: p.path };
}
class Oversized extends Error {
}
async function body(request: Request) {
    if (Number(request.headers.get('content-length') ?? 0) > 4096)
        throw new Oversized();
    const reader = request.body?.getReader();
    if (!reader)
        throw Error('missing_body');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done)
                break;
            size += value.byteLength;
            if (size > 4096) {
                await reader.cancel();
                throw new Oversized();
            }
            chunks.push(value);
        }
    }
    finally {
        reader.releaseLock();
    }
    const joined = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        joined.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(joined));
}
type Options = {
    origins: string[];
    secret: string;
    now?: () => number;
    country?: (r: Request) => string;
    store: (mode: 'record' | 'read', event: {
        digest: string;
        eventId: string;
        path: string;
        country: string;
    } | null, now: number) => Promise<TrafficTotals | null>;
};
export function createTrafficHandler({ origins, secret, store, now = Date.now, country = () => 'unknown' }: Options) {
    if (secret.length < 32 || origins.length === 0 || origins.some(o => new URL(o).origin !== o))
        throw Error('invalid_traffic_configuration');
    const allowed = new Set(origins);
    return async (request: Request): Promise<Response> => {
        const origin = request.headers.get('origin') ?? '';
        if (!allowed.has(origin))
            return Response.json({ error: 'forbidden_origin' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Max-Age': '600', 'Cache-Control': 'no-store', Vary: 'Origin' };
        const respond = (value: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(value, { status, headers: { ...headers, ...extra } });
        if (request.method === 'OPTIONS')
            return new Response(null, { status: 204, headers });
        if (!['POST', 'GET'].includes(request.method))
            return respond({ error: 'method_not_allowed' }, 405, { Allow: 'GET, POST, OPTIONS' });
        if (request.method === 'POST' && request.headers.get('sec-gpc') === '1')
            return respond({ error: 'tracking_disallowed' }, 403);
        let payload: TrafficEvent | null = null;
        if (request.method === 'POST') {
            if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json')
                return respond({ error: 'invalid_content_type' }, 415);
            try {
                payload = validateTraffic(await body(request));
            }
            catch (error) {
                return respond({ error: error instanceof Oversized ? 'payload_too_large' : 'invalid_payload' }, error instanceof Oversized ? 413 : 400);
            }
            if (!payload)
                return respond({ error: 'invalid_payload' }, 400);
        }
        try {
            if (!payload) {
                const totals = await store('read', null, now());
                if (!totals)
                    throw Error('missing_totals');
                return respond(totals);
            }
            const digest = createHmac('sha256', secret).update(`no-bloom:traffic:browser:v1:${payload.visitorId}`).digest('hex');
            const code = country(request);
            const category = /^[A-Z]{2}$/.test(code) && code !== 'XX' ? code : 'unknown';
            await store('record', { digest, eventId: payload.eventId, path: payload.path, country: category }, now());
            return respond({ recorded: true });
        }
        catch (error) {
            return error instanceof TrafficLimit ? respond({ error: 'rate_limited' }, 429, { 'Retry-After': '60' }) : respond({ error: 'temporarily_unavailable' }, 503);
        }
    };
}
