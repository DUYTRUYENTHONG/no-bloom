import postgres from "npm:postgres@3";
import { createCounterHandler } from "./handler.ts";

const url = Deno.env.get("ANALYTICS_DATABASE_URL");
const secret = Deno.env.get("COUNTER_HMAC_SECRET") ?? "";
const origins = (Deno.env.get("ANALYTICS_ALLOWED_ORIGINS") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const minuteCap = Number(Deno.env.get("COUNTER_MINUTE_CAP") ?? "60");
const dayCap = Number(Deno.env.get("COUNTER_DAY_CAP") ?? "10000");
if (!url || origins.length === 0 || secret.length < 32 || !Number.isInteger(minuteCap) || minuteCap < 1 || minuteCap > 1000 || !Number.isInteger(dayCap) || dayCap < 1 || dayCap > 100000) {
  throw new Error("Visitor counter server configuration is incomplete");
}
const sql = postgres(url, { max: 1, prepare: false, ssl: Deno.env.get("ANALYTICS_DB_SSL") === "disable" ? false : "require" });
const handler = createCounterHandler({
  origins, secret,
  store: async (digest, role, country) => {
    const rows = await sql`
      select * from analytics.record_browser(
        'no-bloom', ${digest}, ${role}, ${country}, ${minuteCap}, ${dayCap}
      )
    `;
    const row = rows[0];
    if (!row) throw new Error("No counter result");
    return {
      total: Number(row.total), ordinal: Number(row.ordinal),
      roleCount: Number(row.role_count), countries: Number(row.countries),
    };
  },
});

Deno.serve(handler);
