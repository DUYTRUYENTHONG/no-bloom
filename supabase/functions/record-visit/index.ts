import postgres from "npm:postgres@3";
import { createHandler } from "./handler.ts";

// Copy the transaction-pooler URI into this server-only secret. It is never
// compiled into Next.js or sent to a browser.
const url = Deno.env.get("ANALYTICS_DATABASE_URL");
const origins = (Deno.env.get("ANALYTICS_ALLOWED_ORIGINS") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const minuteCap = Number(Deno.env.get("ANALYTICS_MINUTE_CAP") ?? "60");
const dayCap = Number(Deno.env.get("ANALYTICS_DAY_CAP") ?? "10000");
if (!url || origins.length === 0 || !Number.isInteger(minuteCap) || !Number.isInteger(dayCap)) {
  throw new Error("Visitor analytics server configuration is incomplete");
}
const sql = postgres(url, { max: 1, prepare: false, ssl: Deno.env.get("ANALYTICS_DB_SSL") === "disable" ? false : "require" });
const handler = createHandler({
  origins,
  record: async (event) => {
    const rows = await sql`
      select analytics.record_page_view(
        ${event.event_id}::uuid, 'no-bloom', ${event.page_key},
        ${event.visitor_id ?? null}::uuid, ${event.source_category},
        ${event.occurred_at}::timestamptz, ${minuteCap}, ${dayCap}
      ) as inserted
    `;
    return rows[0].inserted === true;
  },
});

// Public only for this collector: supabase/config.toml disables gateway JWT
// verification. The database remains private and all submissions are bounded.
Deno.serve(handler);
