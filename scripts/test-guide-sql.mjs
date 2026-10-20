import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const db = new PGlite();
try {
  await db.exec("create role anon; create role authenticated; create role service_role;");
  await db.exec(await readFile("supabase/migrations/202610200001_visitor_analytics.sql", "utf8"));
  await db.exec(await readFile("supabase/migrations/202610200003_flower_guide_quota.sql", "utf8"));
  for (const role of ["anon", "authenticated", "service_role"]) {
    await db.exec(`set role ${role}`);
    try {
      await assert.rejects(db.query("select * from analytics.guide_daily_quota"), /permission denied/);
      await assert.rejects(db.query("select analytics.reserve_guide_request('no-bloom', 2)"), /permission denied/);
    } finally { await db.exec("reset role"); }
  }
  const call = () => db.query("select analytics.reserve_guide_request('no-bloom', 2) as accepted");
  const results = await Promise.all([call(), call(), call()]);
  assert.deepEqual(results.map((result) => result.rows[0].accepted), [true, true, false]);
  const count = await db.query("select request_count from analytics.guide_daily_quota where site_id='no-bloom'");
  assert.equal(count.rows[0].request_count, 2);
  console.log("Guide quota and direct-access denial passed.");
} finally { await db.close(); }
