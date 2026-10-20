import { getPageViewTracker, type Consent } from "@/lib/analytics/tracker";

export const counterVisitorKey = "no-bloom:counter-visitor";
const idLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type CounterValues = { total: number; ordinal: number; roleCount: number; countries: number };
export type CounterState = { kind: "idle" | "loading" | "disabled" | "unavailable" | "rate_limited" } | { kind: "success"; values: CounterValues };
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Options = {
  endpoint: string; enabled: boolean; isProduction: boolean; allowLocalTest?: boolean;
  hostname: string; document: Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener">;
  storage?: StorageLike; fetcher: typeof fetch; randomUUID: () => string;
  now?: () => number; setTimeoutFn?: typeof setTimeout; clearTimeoutFn?: typeof clearTimeout;
};
function safeRead(storage: StorageLike | undefined) { try { return storage?.getItem(counterVisitorKey) ?? null; } catch { return null; } }
function safeWrite(storage: StorageLike | undefined, value: string) { try { storage?.setItem(counterVisitorKey, value); } catch { /* temporary identity only */ } }
function safeClear(storage: StorageLike | undefined) { try { storage?.removeItem(counterVisitorKey); } catch { /* unavailable */ } }
function validValues(value: unknown): value is CounterValues {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<CounterValues>;
  return Number.isSafeInteger(v.total) && v.total! >= 1 && Number.isSafeInteger(v.ordinal) && v.ordinal! >= 1
    && Number.isSafeInteger(v.roleCount) && v.roleCount! >= 1 && v.roleCount! <= v.total!
    && Number.isSafeInteger(v.countries) && v.countries! >= 0 && v.countries! <= v.total!;
}

export class VisitorCounterClient {
  state: CounterState = { kind: "idle" };
  private consent: Consent = "unknown";
  private id: string | null = null;
  private completed = false;
  private attempts = 0;
  private abort: AbortController | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  private mounted = false;
  private listeners = new Set<(state: CounterState) => void>();
  private now: () => number;
  private setTimer: typeof setTimeout;
  private clearTimer: typeof clearTimeout;
  constructor(private options: Options) {
    this.now = options.now ?? Date.now;
    this.setTimer = options.setTimeoutFn ?? setTimeout;
    this.clearTimer = options.clearTimeoutFn ?? clearTimeout;
  }
  subscribe(listener: (state: CounterState) => void) { this.listeners.add(listener); listener(this.state); return () => { this.listeners.delete(listener); }; }
  private update(state: CounterState) { this.state = state; for (const listener of this.listeners) listener(state); }
  mount() {
    if (this.mounted) return;
    this.mounted = true;
    this.options.document.addEventListener("visibilitychange", this.onVisible);
    this.maybeSend();
  }
  unmount() {
    if (!this.mounted) return;
    this.mounted = false;
    this.options.document.removeEventListener("visibilitychange", this.onVisible);
    if (this.timer) this.clearTimer(this.timer);
    this.timer = null;
    this.abort?.abort(); this.abort = null;
  }
  setConsent(choice: Consent) {
    if (choice === "declined") {
      this.generation++;
      if (this.timer) this.clearTimer(this.timer);
      this.timer = null; this.abort?.abort(); this.abort = null;
      this.id = null; this.attempts = 0; this.completed = false;
      safeClear(this.options.storage);
      this.update({ kind: "disabled" });
    } else if (choice === "accepted" && this.consent !== "accepted") {
      this.update({ kind: "idle" });
    }
    this.consent = choice;
    if (choice === "accepted") this.maybeSend();
  }
  private onVisible = () => { if (this.options.document.visibilityState === "visible") this.maybeSend(); };
  private eligible() {
    const local = this.options.hostname === "localhost" || this.options.hostname === "127.0.0.1";
    let endpointLocal = false;
    try { endpointLocal = ["localhost", "127.0.0.1"].includes(new URL(this.options.endpoint).hostname); } catch { return false; }
    const secure = this.options.endpoint.startsWith("https://") || (this.options.allowLocalTest && local && endpointLocal && this.options.endpoint.startsWith("http://"));
    return this.options.enabled && this.options.isProduction && secure && (!local || (this.options.allowLocalTest && endpointLocal));
  }
  private getId() {
    if (this.id) return this.id;
    const saved = safeRead(this.options.storage);
    if (saved) try {
      const parsed = JSON.parse(saved) as { version: number; id: string; expires: number };
      if (parsed.version === 1 && uuid.test(parsed.id) && Number.isFinite(parsed.expires) && parsed.expires > this.now()) return this.id = parsed.id.toLowerCase();
    } catch { /* invalid or expired */ }
    const next = this.options.randomUUID();
    if (!uuid.test(next)) throw new Error("secure_uuid_unavailable");
    this.id = next.toLowerCase();
    safeWrite(this.options.storage, JSON.stringify({ version: 1, id: this.id, expires: this.now() + idLifetimeMs }));
    return this.id;
  }
  private maybeSend() {
    if (this.consent !== "accepted" || this.completed || this.abort || this.timer || this.options.document.visibilityState !== "visible") return;
    if (!this.eligible()) { this.update({ kind: "unavailable" }); return; }
    let id: string;
    try { id = this.getId(); } catch { this.update({ kind: "unavailable" }); return; }
    void this.send(id);
  }
  private async send(id: string) {
    const generation = this.generation;
    const controller = new AbortController();
    this.abort = controller;
    this.attempts++;
    this.update({ kind: "loading" });
    try {
      const response = await this.options.fetcher(this.options.endpoint, {
        method: "POST", mode: "cors", credentials: "omit", cache: "no-store", keepalive: true,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId: id, role: "unspecified" }), signal: controller.signal,
      });
      if (controller.signal.aborted || generation !== this.generation || this.consent !== "accepted") return;
      if (response.ok) {
        const values: unknown = await response.json();
        if (controller.signal.aborted || generation !== this.generation || this.consent !== "accepted") return;
        if (!validValues(values)) throw new Error("invalid_response");
        this.completed = true;
        this.update({ kind: "success", values });
      } else if (response.status === 429) { this.completed = true; this.update({ kind: "rate_limited" }); }
      else if (response.status >= 500 && this.attempts < 3) this.retry();
      else { this.completed = true; this.update({ kind: "unavailable" }); }
    } catch {
      if (!controller.signal.aborted && generation === this.generation && this.consent === "accepted") {
        if (this.attempts < 3) this.retry();
        else { this.completed = true; this.update({ kind: "unavailable" }); }
      }
    } finally { if (this.abort === controller) this.abort = null; }
  }
  private retry() {
    this.timer = this.setTimer(() => { this.timer = null; this.maybeSend(); }, this.attempts * 1500);
  }
}

let singleton: VisitorCounterClient | null = null;
export function getVisitorCounterClient() {
  if (typeof window === "undefined") return null;
  if (!singleton) {
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* unavailable */ }
    singleton = new VisitorCounterClient({
      endpoint: process.env.NEXT_PUBLIC_COUNTER_ENDPOINT ?? "",
      enabled: process.env.NEXT_PUBLIC_COUNTER_ENABLED === "true",
      isProduction: process.env.NODE_ENV === "production",
      allowLocalTest: process.env.NEXT_PUBLIC_COUNTER_TEST_MODE === "true",
      hostname: window.location.hostname, document, storage,
      fetcher: window.fetch.bind(window), randomUUID: () => crypto.randomUUID(),
    });
  }
  return singleton;
}

export function connectCounterConsent(client: VisitorCounterClient) {
  const preference = getPageViewTracker();
  if (!preference) return () => {};
  client.mount();
  const unsubscribe = preference.subscribe((choice) => client.setConsent(choice));
  return () => { unsubscribe(); client.unmount(); };
}
