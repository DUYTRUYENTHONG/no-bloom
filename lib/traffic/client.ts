import type { Consent } from '../analytics/tracker';
export const trafficVisitorKey = 'no-bloom-visitor-id';
export type Totals = {
    pageViews: number;
    uniqueBrowsers: number;
};
export type TrafficState = {
    kind: 'idle' | 'loading' | 'unavailable' | 'disabled';
} | {
    kind: 'success';
    values: Totals;
};
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Options = {
    projectId: string;
    enabled: boolean;
    endpoint: string;
    isProduction: boolean;
    allowLocalTest?: boolean;
    hostname: string;
    document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
    storage?: StorageLike;
    fetcher: typeof fetch;
    randomUUID: () => string;
    privacyControl?: () => boolean;
    now?: () => number;
    setTimeoutFn?: typeof setTimeout;
    clearTimeoutFn?: typeof clearTimeout;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validProjectId(value: string) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 48; }
export function normalizedTrafficPath(pathname: string): '/' | '/credits' | null {
    let path = pathname.split(/[?#]/, 1)[0];
    if (path === '/no-bloom')
        path = '/';
    else if (path.startsWith('/no-bloom/'))
        path = path.slice('/no-bloom'.length);
    if (path === '/' || path === '')
        return '/';
    if (path === '/credits' || path === '/credits/')
        return '/credits';
    return null;
}
function validTotals(v: unknown): v is Totals { if (!v || typeof v !== 'object')
    return false; const t = v as Totals; return Number.isSafeInteger(t.pageViews) && t.pageViews >= 0 && Number.isSafeInteger(t.uniqueBrowsers) && t.uniqueBrowsers >= 0 && t.uniqueBrowsers <= t.pageViews; }
export class TrafficTracker {
    private get visitorKey() { if (!validProjectId(this.options.projectId)) throw Error('invalid_project_configuration'); return `${this.options.projectId}-visitor-id`; }
    private consent: Consent = 'unknown';
    private mounted = false;
    private identity: string | null = null;
    private identityExpires = 0;
    private state: TrafficState = { kind: 'idle' };
    private listeners = new Set<(s: TrafficState) => void>();
    private page: {
        path: string | null;
        eventId: string | null;
        started: number | null;
        attempts: number;
        done: boolean;
    } = { path: null, eventId: null, started: null, attempts: 0, done: false };
    private abort: AbortController | null = null;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private generation = 0;
    private now: () => number;
    private setTimer: typeof setTimeout;
    private clearTimer: typeof clearTimeout;
    constructor(private options: Options) { this.now = options.now ?? Date.now; this.setTimer = options.setTimeoutFn ?? setTimeout.bind(globalThis); this.clearTimer = options.clearTimeoutFn ?? clearTimeout.bind(globalThis); }
    mount() { if (this.mounted)
        return; this.mounted = true; this.options.document.addEventListener('visibilitychange', this.visible); this.maybeSend(); }
    unmount() { this.mounted = false; this.options.document.removeEventListener('visibilitychange', this.visible); this.cancel(); }
    navigate(pathname: string) { const path = normalizedTrafficPath(pathname); if (path !== this.page.path) {
        this.cancel();
        this.page = { path, eventId: null, started: null, attempts: 0, done: false };
        this.update({ kind: 'idle' });
    } this.maybeSend(); }
    subscribe(listener: (s: TrafficState) => void) { this.listeners.add(listener); listener(this.state); return () => { this.listeners.delete(listener); }; }
    setConsent(choice: Consent) { this.consent = choice; if (choice !== 'accepted') {
        this.cancel();
        this.identity = null;
        try {
            this.options.storage?.removeItem(this.visitorKey);
        }
        catch { /* storage unavailable */ }
        this.update({ kind: 'idle' });
        return;
    } this.maybeSend(); }
    private update(state: TrafficState) { this.state = state; for (const l of this.listeners)
        l(state); }
    private cancel() { this.generation++; if (this.timer)
        this.clearTimer(this.timer); this.timer = null; this.abort?.abort(); this.abort = null; }
    private eligible() { const o = this.options; if (!o.enabled || !o.endpoint)
        return false; if (!validProjectId(o.projectId)) return false; try {
        const u = new URL(o.endpoint);
        return u.protocol === 'https:' || Boolean(o.allowLocalTest && u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname));
    }
    catch {
        return false;
    } }
    private permitted() { return this.mounted && this.consent === 'accepted' && !this.options.privacyControl?.(); }
    private visible = () => { if (this.options.privacyControl?.()) {
        this.cancel();
        this.identity = null;
        try {
            this.options.storage?.removeItem(this.visitorKey);
        }
        catch { /* storage unavailable */ }
        this.update({ kind: 'disabled' });
        return;
    } if (this.options.document.visibilityState === 'visible')
        this.maybeSend(); };
    private id() {
        if (this.identity && this.identityExpires > this.now())
            return this.identity;
        this.identity = null;
        try {
            const p = JSON.parse(this.options.storage?.getItem(this.visitorKey) ?? 'null') as {
                id: string;
                expires: number;
            } | null;
            if (p && uuid.test(p.id) && p.expires > this.now()) {
                this.identityExpires = p.expires;
                return this.identity = p.id.toLowerCase();
            }
        }
        catch { /* in-memory fallback */ }
        const id = this.options.randomUUID();
        if (!uuid.test(id))
            throw Error('secure_uuid_unavailable');
        this.identity = id.toLowerCase();
        this.identityExpires = this.now() + 30 * 86400000;
        try {
            this.options.storage?.setItem(this.visitorKey, JSON.stringify({ id: this.identity, expires: this.identityExpires }));
        }
        catch { /* memory only while permission is known */ }
        return this.identity;
    }
    private maybeSend() {
        if (!this.mounted || this.consent !== 'accepted' || this.options.document.visibilityState !== 'visible' || this.abort || this.timer || !this.page.path)
            return;
        if (this.options.privacyControl?.()) {
            this.visible();
            return;
        }
        if (!this.eligible()) { this.update({ kind: 'unavailable' }); return; }
        if ((!this.options.isProduction && !this.options.allowLocalTest) || (['localhost', '127.0.0.1'].includes(this.options.hostname) && !this.options.allowLocalTest)) {
            this.update({ kind: 'disabled' });
            return;
        }
        if (this.page.done) {
            if (this.state.kind === 'idle')
                void this.readTotals();
            return;
        }
        if (this.page.started !== null && this.now() - this.page.started >= 30000) {
            this.update({ kind: 'unavailable' });
            return;
        }
        try {
            if (!this.page.eventId) {
                this.page.eventId = this.options.randomUUID();
                if (!uuid.test(this.page.eventId))
                    throw Error('invalid_event_id');
                this.page.started = this.now();
            }
            void this.send(this.id());
        }
        catch {
            this.update({ kind: 'unavailable' });
        }
    }
    private async send(visitorId: string) {
        const generation = this.generation, controller = new AbortController();
        this.abort = controller;
        this.page.attempts++;
        this.update({ kind: 'loading' });
        const timeout = this.setTimer(() => controller.abort(), 5000);
        let retry: string | null | undefined;
        try {
            const response = await this.options.fetcher(this.options.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: this.options.projectId, visitorId, eventId: this.page.eventId, path: this.page.path }), credentials: 'omit', cache: 'no-store', mode: 'cors', keepalive: true, signal: controller.signal });
            if (generation !== this.generation || !this.permitted())
                return;
            if (response.ok) {
                const ack = await response.json() as {
                    recorded?: unknown;
                };
                if (ack.recorded !== true)
                    throw Error('invalid_ack');
                if (generation !== this.generation || !this.permitted())
                    return;
                this.page.done = true;
            }
            else if (response.status === 429 || response.status >= 500)
                retry = response.headers.get('Retry-After');
            else
                this.update({ kind: 'unavailable' });
        }
        catch {
            if (generation === this.generation && this.permitted())
                retry = null;
        }
        finally {
            this.clearTimer(timeout);
            if (this.abort === controller)
                this.abort = null;
        }
        if (generation !== this.generation || !this.permitted())
            return;
        if (this.page.done) {
            await this.readTotals();
            return;
        }
        if (retry !== undefined && this.page.attempts < 3) {
            const seconds = retry ? Number(retry) : NaN;
            const date = retry ? Date.parse(retry) : NaN;
            const delay = Number.isFinite(seconds) ? Math.max(500, seconds * 1000) : Number.isFinite(date) ? Math.max(500, date - this.now()) : this.page.attempts * 1500;
            if (this.page.started !== null && this.now() + delay - this.page.started < 30000) {
                this.timer = this.setTimer(() => { this.timer = null; this.maybeSend(); }, delay);
                return;
            }
        }
        this.update({ kind: 'unavailable' });
    }
    private async readTotals() {
        if (!this.permitted() || this.abort)
            return;
        const generation = this.generation, controller = new AbortController();
        this.abort = controller;
        this.update({ kind: 'loading' });
        const timeout = this.setTimer(() => controller.abort(), 5000);
        try {
            const endpoint = new URL(this.options.endpoint);
            endpoint.searchParams.set('projectId', this.options.projectId);
            const response = await this.options.fetcher(endpoint.href, { method: 'GET', credentials: 'omit', mode: 'cors', cache: 'no-store', signal: controller.signal });
            if (!response.ok)
                throw Error('unavailable');
            const values: unknown = await response.json();
            if (!validTotals(values))
                throw Error('invalid_totals');
            if (generation === this.generation && this.permitted())
                this.update({ kind: 'success', values });
        }
        catch {
            if (generation === this.generation && this.permitted())
                this.update({ kind: 'unavailable' });
        }
        finally {
            this.clearTimer(timeout);
            if (this.abort === controller)
                this.abort = null;
        }
    }
}
let singleton: TrafficTracker | null = null;
export function getTrafficTracker() { if (typeof window === 'undefined')
    return null; if (!singleton) {
    let storage: Storage | undefined;
    try {
        storage = window.localStorage;
    }
    catch { /* memory fallback */ }
    singleton = new TrafficTracker({ projectId: process.env.NEXT_PUBLIC_COUNTER_PROJECT_ID ?? '', enabled: process.env.NEXT_PUBLIC_COUNTER_ENABLED === 'true', endpoint: process.env.NEXT_PUBLIC_COUNTER_ENDPOINT ?? '', isProduction: process.env.NODE_ENV === 'production', allowLocalTest: process.env.NEXT_PUBLIC_COUNTER_TEST_MODE === 'true', hostname: location.hostname, document, storage, fetcher: window.fetch.bind(window), randomUUID: () => crypto.randomUUID(), privacyControl: () => Boolean((navigator as Navigator & {
            globalPrivacyControl?: boolean;
        }).globalPrivacyControl) });
} return singleton; }
