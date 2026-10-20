export type GuideRequest = { question: string; locale: "vi" | "en"; stage: "invitation" | "personalization" | "blooming" | "greeting" | "withering" };
type Dependencies = {
  origins: string[];
  reserve: () => Promise<boolean>;
  complete: (request: GuideRequest) => Promise<string>;
};

function respond(status: number, data: object, origin: string | null) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "vary": "Origin", ...(origin ? { "access-control-allow-origin": origin } : {}) } });
}

async function smallBody(request: Request): Promise<string | null> {
  if (Number(request.headers.get("content-length") ?? 0) > 2048) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); return null; }
      parts.push(value);
    }
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) { buffer.set(part, offset); offset += part.byteLength; }
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch { return null; }
}

export function createGuideHandler({ origins, reserve, complete }: Dependencies) {
  const allowed = new Set(origins);
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin");
    if (!origin || !allowed.has(origin)) return respond(403, { error: "origin_not_allowed" }, null);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-origin": origin, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "600", "vary": "Origin" } });
    if (request.method !== "POST") return respond(405, { error: "method_not_allowed" }, origin);
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return respond(415, { error: "invalid_content_type" }, origin);
    const raw = await smallBody(request);
    if (!raw) return respond(413, { error: "invalid_body" }, origin);
    let data: unknown;
    try { data = JSON.parse(raw); } catch { return respond(400, { error: "invalid_json" }, origin); }
    if (!data || typeof data !== "object" || Array.isArray(data)) return respond(400, { error: "invalid_request" }, origin);
    const object = data as Record<string, unknown>;
    if (Object.keys(object).length !== 3 || Object.keys(object).some((key) => !["question", "locale", "stage"].includes(key))
      || typeof object.question !== "string" || !object.question.trim() || object.question.length > 400
      || (object.locale !== "vi" && object.locale !== "en")
      || !["invitation", "personalization", "blooming", "greeting", "withering"].includes(String(object.stage))) return respond(400, { error: "invalid_request" }, origin);
    const input = object as GuideRequest;
    try {
      if (!await reserve()) return respond(429, { error: "daily_limit" }, origin);
      const answer = await complete(input);
      if (!answer || answer.length > 1200) throw new Error("invalid answer");
      return respond(200, { answer }, origin);
    } catch { return respond(503, { error: "guide_unavailable" }, origin); }
  };
}
