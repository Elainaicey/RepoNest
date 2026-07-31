import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const temporaryRoot = await mkdtemp(join(tmpdir(), "reponest-database-"));
process.env.DATABASE_PATH = join(temporaryRoot, "database");
process.env.NODE_ENV = "test";

const { closeDatabase, migrate, pool } = await import("../dist/db.js");

test("runs every migration on the embedded PostgreSQL database", async () => {
  await migrate();
  const migrations = await pool.query(
    "SELECT name FROM schema_migrations ORDER BY name"
  );
  assert.deepEqual(
    migrations.rows.map((row) => row.name),
    ["001_initial.sql", "002_organization.sql"]
  );

  const tables = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
  );
  assert.ok(tables.rows.some((row) => row.tablename === "repositories"));
  assert.ok(tables.rows.some((row) => row.tablename === "tags"));
});

test.after(async () => {
  await closeDatabase();
  await rm(temporaryRoot, { recursive: true, force: true });
});
