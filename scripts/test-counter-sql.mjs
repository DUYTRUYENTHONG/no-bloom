import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const database = new PGlite();
const migration = "supabase/migrations/202610200002_visitor_counter.sql";
const query = "select * from analytics.record_browser('no-bloom', $1, 'unspecified', 'unknown', 1000, 100000)";
const digest = (id) => createHmac("sha256", "test-secret-at-least-thirty-two-characters").update(id).digest("hex");
try {
  await database.exec("create role anon; create role authenticated; create role service_role;");
  await database.exec(await readFile("supabase/migrations/202610200001_visitor_analytics.sql", "utf8"));
  await database.exec(await readFile(migration, "utf8"));
  await database.exec(await readFile("supabase/tests/visitor-counter.sql", "utf8"));
  for (const role of ["anon", "authenticated", "service_role"]) {
    await database.exec(`set role ${role}`);
    try {
      await assert.rejects(database.query("select * from analytics.visitor_records"), /permission denied/);
      await assert.rejects(database.query(query, [digest(randomUUID())]), /permission denied/);
    } finally { await database.exec("reset role"); }
  }

  const same = digest(randomUUID());
  const duplicates = await Promise.all(Array.from({ length: 12 }, () => database.query(query, [same])));
  assert.equal(new Set(duplicates.map((result) => Number(result.rows[0].ordinal))).size, 1);
  assert.equal(Number(duplicates.at(-1).rows[0].total), 1);

  const others = await Promise.all(Array.from({ length: 12 }, () => database.query(query, [digest(randomUUID())])));
  const ordinals = others.map((result) => Number(result.rows[0].ordinal));
  assert.equal(new Set(ordinals).size, 12);
  assert.equal(Number(others.at(-1).rows[0].total), 13);
  const final = await database.query("select count(*)::integer as total, count(distinct ordinal)::integer as ordinals from analytics.visitor_records");
  assert.deepEqual(final.rows[0], { total: 13, ordinals: 13 });
  await assert.rejects(database.query(query.replace("1000, 100000", "1, 100000"), [digest(randomUUID())]), /counter rate limited/);
  console.log("Counter migration, role denial, repeat visits, retention, and embedded PostgreSQL contention checks passed.");
} finally { await database.close(); }

const directory = await mkdtemp(join(tmpdir(), "no-bloom-counter-"));
try {
  let persisted = new PGlite(directory);
  await persisted.exec("create role anon; create role authenticated; create role service_role;");
  await persisted.exec(await readFile("supabase/migrations/202610200001_visitor_analytics.sql", "utf8"));
  await persisted.exec(await readFile(migration, "utf8"));
  const id = digest(randomUUID());
  const first = await persisted.query(query, [id]);
  const ordinal = Number(first.rows[0].ordinal);
  await persisted.close();
  persisted = new PGlite(directory);
  const repeat = await persisted.query(query, [id]);
  assert.equal(Number(repeat.rows[0].ordinal), ordinal);
  assert.equal(Number(repeat.rows[0].total), 1);
  await persisted.close();
  console.log("Counter record and ordinal survived a local PostgreSQL engine restart.");
} finally {
  const absolute = resolve(directory);
  if (!absolute.startsWith(resolve(tmpdir(), "no-bloom-counter-"))) throw new Error("Refusing to remove unexpected test directory");
  await rm(absolute, { recursive: true, force: true });
}
