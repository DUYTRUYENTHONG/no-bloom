export const counterRoles = ["unspecified"] as const;
export type CounterRole = typeof counterRoles[number];
export type CounterResult = { total: number; ordinal: number; roleCount: number; countries: number };
type Store = (digest: string, role: CounterRole, country: "unknown") => Promise<CounterResult>;
type Options = { origins: string[]; secret: string; store: Store };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields = new Set(["visitorId", "role"]);

export async function hmacVisitorId(id: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const data = new TextEncoder().encode(`no-bloom:visitor:v1:${id.toLowerCase()}`);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function validateCounterPayload(input: unknown): { visitorId: string; role: CounterRole } | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  if (Object.keys(value).length !== 2 || Object.keys(value).some((key) => !fields.has(key))) return null;
  if (typeof value.visitorId !== "string" || !uuid.test(value.visitorId) || value.role !== "unspecified") return null;
  return { visitorId: value.visitorId.toLowerCase(), role: "unspecified" };
}

async function smallJson(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 4096) throw new Error("oversized");
  if (!request.body) throw new Error("invalid");
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

function validResult(value: CounterResult) {
  return Number.isSafeInteger(value.total) && value.total >= 1
    && Number.isSafeInteger(value.ordinal) && value.ordinal >= 1
    && Number.isSafeInteger(value.roleCount) && value.roleCount >= 1 && value.roleCount <= value.total
    && Number.isSafeInteger(value.countries) && value.countries >= 0 && value.countries <= value.total;
}

export function createCounterHandler({ origins, secret, store }: Options) {
  if (secret.length < 32) throw new Error("Counter HMAC secret is missing or too short");
  const allowed = new Set(origins.map((origin) => new URL(origin).origin));
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin") ?? "";
    if (!allowed.has(origin)) return Response.json({ error: "forbidden_origin" }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
    const headers = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Cache-Control": "private, no-store",
      Vary: "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return Response.json({ error: "method_not_allowed" }, { status: 405, headers: { ...headers, Allow: "POST, OPTIONS" } });
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return Response.json({ error: "invalid_content_type" }, { status: 415, headers });
    let payload: ReturnType<typeof validateCounterPayload>;
    try { payload = validateCounterPayload(await smallJson(request)); }
    catch (error) { return Response.json({ error: error instanceof Error && error.message === "oversized" ? "payload_too_large" : "invalid_payload" }, { status: error instanceof Error && error.message === "oversized" ? 413 : 400, headers }); }
    if (!payload) return Response.json({ error: "invalid_payload" }, { status: 400, headers });
    try {
      const digest = await hmacVisitorId(payload.visitorId, secret);
      // Supabase Edge currently has no verified country header for this feature.
      // Untrusted request headers are ignored; unknown is excluded from countries.
      const result = await store(digest, payload.role, "unknown");
      if (!validResult(result)) throw new Error("invalid_store_result");
      return Response.json(result, { status: 200, headers });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P0001") {
        return Response.json({ error: "rate_limited" }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
      }
      return Response.json({ error: "temporarily_unavailable" }, { status: 503, headers });
    }
  };
}
