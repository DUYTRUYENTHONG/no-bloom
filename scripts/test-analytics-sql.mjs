import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const database = new PGlite();
try {
  await database.exec("create role anon; create role authenticated; create role service_role;");
  await database.exec(await readFile("supabase/migrations/202610200001_visitor_analytics.sql", "utf8"));
  await database.exec(await readFile("supabase/tests/analytics.sql", "utf8"));
  const visitor = randomUUID();
  const query = "select analytics.record_page_view($1::uuid, 'no-bloom', 'invitation', $2::uuid, 'direct_or_unknown', $3::timestamptz, 1000, 100000) as inserted";
  const now = new Date().toISOString();
  const unique = await Promise.all(Array.from({ length: 12 }, () => database.query(query, [randomUUID(), visitor, now])));
  assert.equal(unique.filter((result) => result.rows[0].inserted).length, 12);
  const duplicateId = randomUUID();
  const duplicates = await Promise.all(Array.from({ length: 12 }, () => database.query(query, [duplicateId, visitor, now])));
  assert.equal(duplicates.filter((result) => result.rows[0].inserted).length, 1);
  const totals = await database.query("select sum(page_views)::integer as views from analytics.analytics_daily_totals where site_id = 'no-bloom'");
  assert.equal(totals.rows[0].views, 13);
  const distinct = await database.query("select count(distinct visitor_id)::integer as browsers from analytics.analytics_events where site_id = 'no-bloom'");
  assert.equal(distinct.rows[0].browsers, 1);
  await database.exec(await readFile("supabase/reporting/owner_reports.sql", "utf8"));
  console.log("Analytics migration, role, retention, and idempotent submission checks passed in embedded PostgreSQL.");
} finally { await database.close(); }
