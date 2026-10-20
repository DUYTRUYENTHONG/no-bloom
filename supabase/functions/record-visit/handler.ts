export const sources = ["facebook", "instagram", "tiktok", "youtube", "google", "other", "direct_or_unknown"] as const;
export type SourceCategory = typeof sources[number];
export type VisitEvent = {
  event_id: string; page_key: "invitation" | "shared_card"; visitor_id?: string;
  source_category: SourceCategory; occurred_at: string;
};
type RecordVisit = (event: VisitEvent) => Promise<boolean>;
type Options = { origins: string[]; record: RecordVisit; now?: () => number };
const keys = new Set(["event_id", "page_key", "visitor_id", "source_category", "occurred_at"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateEvent(input: unknown, now = Date.now()): VisitEvent | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const body = input as Record<string, unknown>;
  if (Object.keys(body).some((key) => !keys.has(key))) return null;
  if (typeof body.event_id !== "string" || !uuid.test(body.event_id)) return null;
  if (body.page_key !== "invitation" && body.page_key !== "shared_card") return null;
  if (body.visitor_id !== undefined && (typeof body.visitor_id !== "string" || !uuid.test(body.visitor_id))) return null;
  if (!sources.includes(body.source_category as SourceCategory)) return null;
  if (typeof body.occurred_at !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(body.occurred_at)) return null;
  const occurred = Date.parse(body.occurred_at);
  if (!Number.isFinite(occurred) || occurred < now - 10 * 60_000 || occurred > now + 2 * 60_000) return null;
  return body as VisitEvent;
}

async function readSmallJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > 4096) throw new Error("oversized");
  if (!request.body) throw new Error("empty");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) throw new Error("oversized");
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export function createHandler({ origins, record, now = Date.now }: Options) {
  const allowed = new Set(origins.map((origin) => new URL(origin).origin));
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin") ?? "";
    if (!allowed.has(origin)) return Response.json({ error: "forbidden_origin" }, { status: 403, headers: { "Cache-Control": "no-store" } });
    const headers = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Cache-Control": "no-store",
      Vary: "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return Response.json({ error: "method_not_allowed" }, { status: 405, headers: { ...headers, Allow: "POST, OPTIONS" } });
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return Response.json({ error: "invalid_content_type" }, { status: 415, headers });
    let event: VisitEvent | null;
    try { event = validateEvent(await readSmallJson(request), now()); }
    catch { return Response.json({ error: "invalid_payload" }, { status: 400, headers }); }
    if (!event) return Response.json({ error: "invalid_payload" }, { status: 400, headers });
    try {
      const inserted = await record(event);
      return Response.json({ accepted: true, duplicate: !inserted }, { status: 200, headers });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P0001") {
        return Response.json({ error: "rate_limited" }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
      }
      return Response.json({ error: "temporarily_unavailable" }, { status: 503, headers });
    }
  };
}
