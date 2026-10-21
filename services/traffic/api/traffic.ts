import { createTrafficHandler } from '../lib/handler.js';
import { createRedisCommand, createTrafficStore } from '../lib/store.js';
let handler: ReturnType<typeof createTrafficHandler> | undefined;
export default { async fetch(request: Request) {
        try {
            if (!handler) {
                const env = process.env;
                const namespace = env.TRAFFIC_NAMESPACE ?? (env.VERCEL_ENV === 'production' ? 'no-bloom:traffic:v1' : 'no-bloom:traffic:staging:v1');
                if (env.VERCEL_ENV !== 'production' && namespace === 'no-bloom:traffic:v1')
                    throw Error('production_namespace_not_allowed');
                handler = createTrafficHandler({ origins: (env.TRAFFIC_ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean), secret: env.TRAFFIC_HASH_SALT ?? '', store: createTrafficStore(createRedisCommand(env.KV_REST_API_URL ?? '', env.KV_REST_API_TOKEN ?? ''), namespace, Number(env.TRAFFIC_MINUTE_CAP ?? 120), Number(env.TRAFFIC_DAY_CAP ?? 10000), Number(env.TRAFFIC_BROWSER_CAP ?? 100000)), country: r => env.VERCEL === '1' ? (r.headers.get('x-vercel-ip-country') ?? 'unknown') : 'unknown' });
            }
            return await handler(request);
        }
        catch {
            return Response.json({ error: 'service_not_configured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
        }
    } };
