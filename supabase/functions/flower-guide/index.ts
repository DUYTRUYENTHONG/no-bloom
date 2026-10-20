/// <reference lib="deno.ns" />
import postgres from "npm:postgres@3";
import { createGuideHandler, type GuideRequest } from "./handler.ts";

const url = Deno.env.get("ANALYTICS_DATABASE_URL");
const apiKey = Deno.env.get("GROQ_API_KEY");
const origins = (Deno.env.get("ANALYTICS_ALLOWED_ORIGINS") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const model = Deno.env.get("GROQ_MODEL") ?? "llama-3.3-70b-versatile";
const dailyCap = Number(Deno.env.get("GUIDE_DAILY_CAP") ?? "200");
if (!url || !apiKey || origins.length === 0 || !Number.isInteger(dailyCap) || dailyCap < 1 || dailyCap > 10000) throw new Error("Flower guide server configuration is incomplete");
const sql = postgres(url, { max: 1, prepare: false, ssl: Deno.env.get("ANALYTICS_DB_SSL") === "disable" ? false : "require" });

async function complete(input: GuideRequest): Promise<string> {
  const instructions = input.locale === "vi"
    ? "Bạn là bạn đồng hành NỞ cho món quà Ngày Phụ nữ Việt Nam. Trả lời thân thiện, ngắn gọn bằng tiếng Việt (tối đa 2 câu). Chỉ hướng dẫn về trang: chọn hoa và nhập tên ở bước cá nhân hóa; mở hoa; Mở ngay để bỏ qua; liên kết riêng được sao chép sau khi hiện lời chúc; hoa nở lại chỉ phát lại. Không đoán tính cách từ tên. Không tự xưng là người trong ảnh. Không hỏi thông tin riêng tư. Nếu ngoài phạm vi, nhẹ nhàng đưa về món quà."
    : "You are NỞ's companion for a Vietnamese Women's Day gift. Answer warmly and briefly in English (at most 2 sentences). Only guide use of this page: choose a flower and enter a name at personalization, bloom, skip, copy a personal link after the greeting, and replay. Never infer personality from a name, impersonate the person in the photo, or ask for private details. Redirect unrelated questions to the gift.";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", signal: controller.signal,
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model, temperature: 0.5, max_completion_tokens: 180, messages: [
        { role: "system", content: instructions },
        { role: "user", content: `Current page stage: ${input.stage}. Question: ${input.question}` },
      ] }),
    });
    if (!response.ok) throw new Error("Groq unavailable");
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("choices" in result) || !Array.isArray(result.choices)) throw new Error("Invalid Groq response");
    const answer = (result.choices[0] as { message?: { content?: unknown } } | undefined)?.message?.content;
    if (typeof answer !== "string") throw new Error("Missing answer");
    return answer.trim().slice(0, 1200);
  } finally { clearTimeout(timeout); }
}

const handler = createGuideHandler({
  origins,
  reserve: async () => {
    const result = await sql`select analytics.reserve_guide_request('no-bloom', ${dailyCap}) as accepted`;
    return result[0]?.accepted === true;
  },
  complete,
});
Deno.serve(handler);
