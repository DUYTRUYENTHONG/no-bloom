export type Consent = "unknown" | "accepted" | "declined";
export type SourceCategory = "facebook" | "instagram" | "tiktok" | "youtube" | "google" | "other" | "direct_or_unknown";
export const consentKey = "no-bloom:analytics-consent";
export const visitorKey = "no-bloom:analytics-visitor";
const identityDays = 30;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type TrackerOptions = {
  enabled: boolean; endpoint: string; isProduction: boolean; allowLocalTest?: boolean;
  location: Pick<Location, "hostname" | "pathname" | "search">;
  document: Pick<Document, "visibilityState" | "referrer" | "addEventListener" | "removeEventListener">;
  storage?: StorageLike; fetcher: typeof fetch; randomUUID: () => string;
  now?: () => number; setTimeoutFn?: typeof setTimeout; clearTimeoutFn?: typeof clearTimeout;
};

function safeGet(storage: StorageLike | undefined, key: string) { try { return storage?.getItem(key) ?? null; } catch { return null; } }
function safeSet(storage: StorageLike | undefined, key: string, value: string) { try { storage?.setItem(key, value); return Boolean(storage); } catch { return false; } }
function safeRemove(storage: StorageLike | undefined, key: string) { try { storage?.removeItem(key); } catch { /* unavailable */ } }

export function classifySource(search: string, referrer: string): SourceCategory {
  const allowed: SourceCategory[] = ["facebook", "instagram", "tiktok", "youtube", "google"];
  try {
    const campaign = new URLSearchParams(search).get("utm_source")?.toLowerCase();
    if (campaign && allowed.includes(campaign as SourceCategory)) return campaign as SourceCategory;
  } catch { /* ignore malformed search */ }
  if (!referrer) return "direct_or_unknown";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.com" || host.endsWith(".fb.com")) return "facebook";
    if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
    if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") return "youtube";
    if (host === "google.com" || host.endsWith(".google.com") || /^google\.[a-z.]+$/.test(host) || /^www\.google\.[a-z.]+$/.test(host)) return "google";
    return "other";
  } catch { return "direct_or_unknown"; }
}

export function pageKey(pathname: string): "invitation" | "shared_card" {
  return /\/(?:card|shared)(?:\/|$)/i.test(pathname) ? "shared_card" : "invitation";
}

type EventPayload = { event_id: string; page_key: "invitation" | "shared_card"; visitor_id?: string; source_category: SourceCategory; occurred_at: string };

export class PageViewTracker {
  consent: Consent;
  private event: EventPayload | null = null;
  private sent = false;
  private started = false;
  private attempts = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private abort: AbortController | null = null;
  private mounted = false;
  private listeners = new Set<(consent: Consent) => void>();
  private readonly now: () => number;
  private readonly setTimer: typeof setTimeout;
  private readonly clearTimer: typeof clearTimeout;

  constructor(private options: TrackerOptions) {
    const saved = safeGet(options.storage, consentKey);
    this.consent = saved === "accepted" || saved === "declined" ? saved : "unknown";
    this.now = options.now ?? Date.now;
    this.setTimer = options.setTimeoutFn ?? setTimeout;
    this.clearTimer = options.clearTimeoutFn ?? clearTimeout;
  }

  mount() {
    if (this.mounted) return;
    this.mounted = true;
    this.options.document.addEventListener("visibilitychange", this.onVisible);
    this.maybeTrack();
  }
  subscribe(listener: (consent: Consent) => void) { this.listeners.add(listener); listener(this.consent); return () => { this.listeners.delete(listener); }; }
  choose(consent: Exclude<Consent, "unknown">) {
    if (consent === "declined") this.clearPending();
    this.consent = consent;
    safeSet(this.options.storage, consentKey, consent);
    if (consent === "declined") safeRemove(this.options.storage, visitorKey);
    for (const listener of this.listeners) listener(consent);
    if (consent === "accepted") this.maybeTrack();
  }
  private onVisible = () => { if (this.options.document.visibilityState === "visible") this.maybeTrack(); };
  private eligible() {
    const host = this.options.location.hostname;
    const local = host === "localhost" || host === "127.0.0.1";
    let endpointLocal = false;
    try { endpointLocal = ["localhost", "127.0.0.1"].includes(new URL(this.options.endpoint).hostname); } catch { return false; }
    const secure = this.options.endpoint.startsWith("https://") || (Boolean(this.options.allowLocalTest) && local && endpointLocal && this.options.endpoint.startsWith("http://"));
    return this.options.enabled && this.options.isProduction && secure
      && (!local || (this.options.allowLocalTest && endpointLocal));
  }
  private visitorId() {
    const saved = safeGet(this.options.storage, visitorKey);
    if (saved) try {
      const parsed = JSON.parse(saved) as { id: string; expires: number };
      if (typeof parsed.id === "string" && uuid.test(parsed.id) && Number.isFinite(parsed.expires) && parsed.expires > this.now()) return parsed.id;
    } catch { /* expired or invalid */ }
    const id = this.options.randomUUID();
    return safeSet(this.options.storage, visitorKey, JSON.stringify({ id, expires: this.now() + identityDays * 86400_000 })) ? id : undefined;
  }
  private maybeTrack() {
    if (this.consent !== "accepted" || !this.eligible() || this.options.document.visibilityState !== "visible" || this.sent || (this.started && !this.event)) return;
    if (!this.event) {
      this.event = {
        event_id: this.options.randomUUID(), page_key: pageKey(this.options.location.pathname),
        visitor_id: this.visitorId(), source_category: classifySource(this.options.location.search, this.options.document.referrer),
        occurred_at: new Date(this.now()).toISOString(),
      };
      this.started = true;
    }
    if (!this.abort && !this.timer) void this.send();
  }
  private async send() {
    if (!this.event || this.consent !== "accepted" || this.sent) return;
    const controller = new AbortController();
    this.abort = controller;
    this.attempts++;
    try {
      const response = await this.options.fetcher(this.options.endpoint, {
        method: "POST", mode: "cors", credentials: "omit", cache: "no-store", keepalive: true,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.event), signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (response.ok) { this.sent = true; this.event = null; return; }
      if (response.status !== 429 && response.status < 500) { this.event = null; return; }
      this.scheduleRetry(response.headers.get("Retry-After"));
    } catch {
      if (!controller.signal.aborted) this.scheduleRetry(null);
    } finally { if (this.abort === controller) this.abort = null; }
  }
  private scheduleRetry(after: string | null) {
    if (this.attempts >= 3 || this.consent !== "accepted" || !this.event) { this.event = null; return; }
    const seconds = after ? Number(after) : NaN;
    const delay = Number.isFinite(seconds) ? Math.min(60000, Math.max(500, seconds * 1000)) : this.attempts * 1500;
    this.timer = this.setTimer(() => { this.timer = null; this.maybeTrack(); }, delay);
  }
  private clearPending() {
    if (this.timer) this.clearTimer(this.timer);
    this.timer = null;
    this.abort?.abort(); this.abort = null;
    this.event = null; this.attempts = 0;
  }
}

let singleton: PageViewTracker | null = null;
export function getPageViewTracker() {
  if (typeof window === "undefined") return null;
  if (!singleton) {
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* unavailable */ }
    singleton = new PageViewTracker({
      enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true" && process.env.NEXT_PUBLIC_COUNTER_ENABLED !== "true",
      endpoint: process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT ?? "",
      isProduction: process.env.NODE_ENV === "production",
      allowLocalTest: process.env.NEXT_PUBLIC_ANALYTICS_TEST_MODE === "true",
      location: window.location, document, storage, fetcher: window.fetch.bind(window), randomUUID: () => crypto.randomUUID(),
    });
    if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true" && !process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      console.warn("NỞ analytics is enabled but NEXT_PUBLIC_ANALYTICS_ENDPOINT is missing; no visits will be sent.");
    }
  }
  return singleton;
}
