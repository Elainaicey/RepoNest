import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const migrationsDir = new URL("../migrations/", import.meta.url);

test("keeps migrations ordered and adds the organization model incrementally", async () => {
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  assert.deepEqual(files, ["001_initial.sql", "002_organization.sql"]);

  const organization = await readFile(new URL("002_organization.sql", migrationsDir), "utf8");
  assert.match(organization, /CREATE TABLE IF NOT EXISTS tags/);
  assert.match(organization, /CREATE TABLE IF NOT EXISTS repository_tags/);
  assert.match(organization, /ADD COLUMN IF NOT EXISTS rating/);
  assert.match(organization, /read_status IN \('inbox', 'exploring', 'adopted'\)/);
});

test("migration runner records each applied file", async () => {
  const source = await readFile(new URL("../src/db.ts", import.meta.url), "utf8");
  assert.match(source, /schema_migrations/);
  assert.match(source, /readdir\(migrationsDir\)/);
  assert.match(source, /INSERT INTO schema_migrations/);
  assert.match(source, /ROLLBACK/);
});
