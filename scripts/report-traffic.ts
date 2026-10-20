import { createRedisCommand } from '../services/traffic/lib/store';
import { createHmac } from 'node:crypto';
const env = process.env, command = createRedisCommand(env.KV_REST_API_URL ?? '', env.KV_REST_API_TOKEN ?? '');
const namespace = env.TRAFFIC_NAMESPACE ?? 'no-bloom:traffic:v1';
if (!/^no-bloom:traffic:(?:staging:)?v1$/.test(namespace))
    throw Error('Unsupported reporting namespace');
const args = process.argv.slice(2), today = new Date().toISOString().slice(0, 10), utc = (d: string) => Date.parse(d + 'T00:00:00Z');
if (args.includes('--forget-browser')) {
    if (!args.includes('--confirm'))
        throw Error('Deletion requires --confirm. Supply the browser UUID on stdin; it is not printed.');
    let id = '';
    for await (const chunk of process.stdin)
        id += String(chunk);
    id = id.trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || !env.TRAFFIC_HASH_SALT || env.TRAFFIC_HASH_SALT.length < 32)
        throw Error('Valid UUID and server hash salt required');
    const digest = createHmac('sha256', env.TRAFFIC_HASH_SALT).update(`no-bloom:traffic:browser:v1:${id.toLowerCase()}`).digest('hex');
    const keys = [`${namespace}:browsers`];
    for (let i = 0; i < 400; i++) {
        const day = new Date(utc(today) - i * 86400000).toISOString().slice(0, 10);
        keys.push(`${namespace}:day:${day}:browsers`);
    }
    await command(['EVAL', "for i=1,#KEYS do redis.call('SREM',KEYS[i],ARGV[1]) end return 1", keys.length, ...keys, digest]);
    console.log('Browser membership removed. Aggregate page views remain; they do not retain a browser-to-view association.');
}
else {
    const start = args[0] ?? new Date(utc(today) - 6 * 86400000).toISOString().slice(0, 10), end = args[1] ?? new Date(utc(today) + 86400000).toISOString().slice(0, 10);
    const valid = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(utc(d)) && new Date(utc(d)).toISOString().slice(0, 10) === d;
    if (!valid(start) || !valid(end) || utc(start) >= utc(end) || utc(start) < utc(today) - 399 * 86400000 || utc(end) > utc(today) + 86400000)
        throw Error('Use half-open YYYY-MM-DD boundaries within the last400 UTC days');
    const [views, browsers, paths, countries, started] = await Promise.all([command(['GET', `${namespace}:views`]), command(['SCARD', `${namespace}:browsers`]), command(['HGETALL', `${namespace}:paths`]), command(['HGETALL', `${namespace}:countries`]), command(['GET', `${namespace}:started-utc`])]);
    const object = (input: unknown) => { if (!Array.isArray(input))
        throw Error('Invalid Redis hash response'); return Object.fromEntries(Array.from({ length: input.length / 2 }, (_, i) => [String(input[i * 2]), Number(input[i * 2 + 1])])); };
    const daily = [];
    for (let t = utc(start); t < utc(end); t += 86400000) {
        const day = new Date(t).toISOString().slice(0, 10), available = Boolean(started && day >= String(started).slice(0, 10));
        const [v, u] = available ? await Promise.all([command(['GET', `${namespace}:day:${day}:views`]), command(['SCARD', `${namespace}:day:${day}:browsers`])]) : [null, null];
        daily.push({ date: day, available, pageViews: available ? Number(v ?? 0) : null, approximateUniqueBrowsers: available ? Number(u) : null });
    }
    console.log(JSON.stringify({ timezone: 'UTC', interval: { startInclusive: start, endExclusive: end }, startedAt: started ?? null, pageViews: Number(views ?? 0), approximateUniqueBrowsers: Number(browsers), daily, topPaths: object(paths), countryPageViews: object(countries), note: 'Consenting accepted traffic only. Browsers are not people. Daily uniques must not be summed into interval uniques.' }, null, 2));
}
